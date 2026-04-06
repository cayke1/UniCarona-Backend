import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { sendResetPasswordEmail } from '../lib/mail';
import type {
  RegisterBody,
  LoginBody,
  TokenPayload,
  AuthResponse,
  ResetPasswordBody
} from '../models/auth.model';
import type { User } from '@prisma/client';

export class AuthService {
  public async register(data: RegisterBody): Promise<AuthResponse> {
    const userExists = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (userExists) {
      throw new AppError('User already exists', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      }
    });

    return this.generateTokens(user);
  }

  public async login(data: LoginBody): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(
      data.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    return this.generateTokens(user);
  }

  public async refresh(token: string): Promise<AuthResponse> {
    try {
      if (!token) {
        throw new AppError('Refresh token is required', 400);
      }

      const secret = process.env.JWT_REFRESH_SECRET;
      if (!secret) throw new AppError('JWT_REFRESH_SECRET not configured', 500);

      const payload = jwt.verify(token, secret) as TokenPayload;

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!storedToken || storedToken.userId !== payload.sub) {
        throw new AppError('Invalid refresh token', 401);
      }

      if (storedToken.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        throw new AppError('Expired refresh token', 401);
      }

      await prisma.refreshToken.delete({
        where: { id: storedToken.id }
      });

      return this.generateTokens(storedToken.user);
    } catch (error) {
      console.log(error);
      if (error instanceof AppError) throw error;
      if (error instanceof jwt.TokenExpiredError) {
        await prisma.refreshToken.deleteMany({ where: { token } });
        throw new AppError('Expired refresh token', 401);
      }
      throw new AppError('Invalid refresh token', 401);
    }
  }

  public async logout(token: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token }
    });
  }

  public async resetPassword({ token, newPassword }: ResetPasswordBody): Promise<void> {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      // Return generic error for security reasons (prevent enumeration)
      throw new AppError('Token de recuperação inválido ou expirado', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      })
    ]);
  }

  public async executeForgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Security: Prevent email enumeration
      return;
    }

    // Deleta tokens anteriores do usuário para garantir atomicidade e evitar reuso de tokens velhos
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); 

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt
      }
    });

    // We don't want to wait for the email to be sent before returning success,
    // but the task says to "Call the mail service". 
    // To maintain responsiveness, usually this would be backgrounded.
    // However, I'll await it for now to follow the standard layer flow.
    await sendResetPasswordEmail(email, token);
  }

  private async generateTokens(user: User): Promise<AuthResponse> {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
      throw new AppError('JWT secrets are not configured in .env', 500);
    }

    const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles
    };

    const accessToken = jwt.sign(payload, accessSecret, {
      expiresIn: accessExpiresIn as jwt.SignOptions['expiresIn']
    });

    const refreshToken = jwt.sign(payload, refreshSecret, {
      expiresIn: refreshExpiresIn as jwt.SignOptions['expiresIn']
    });

    const decoded = jwt.decode(refreshToken) as { exp: number } | null;
    if (!decoded) {
      throw new AppError('Failed to decode refresh token', 500);
    }
    const expiresAt = new Date(decoded.exp * 1000);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    const {
      passwordHash: _passwordHash,
      balance: _balance,
      pixKey: _pixKey,
      ...publicUser
    } = user;

    return {
      accessToken,
      refreshToken,
      user: publicUser
    };
  }
}
