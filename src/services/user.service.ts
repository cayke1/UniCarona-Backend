import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import type { User } from '@prisma/client';

export class UserService {
  async getSelfProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        roles: true,
        pixKey: true,
        balance: true,
        createdAt: true,
        passwordHash: false
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user as Omit<User, 'passwordHash'>;
  }

  async promoteToDriver(userId: string, pixKey?: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const hasDriverRole = user.roles.includes('DRIVER');

    if (hasDriverRole) {
      throw new AppError('User already is a DRIVER', 400);
    }

    const finalPixKey = pixKey?.trim() || user.pixKey?.trim() || null;

    if (!finalPixKey || finalPixKey === '') {
      throw new AppError('PIX key is required to become a driver', 422);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        roles: [...user.roles, 'DRIVER'],
        balance: 0,
        pixKey: finalPixKey
      },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        roles: true,
        pixKey: true,
        balance: true,
        createdAt: true,
        passwordHash: false
      }
    });

    return updatedUser as Omit<User, 'passwordHash'>;
  }

  async updateProfile(userId: string, data: { name?: string; photoUrl?: string; pixKey?: string }): Promise<Omit<User, 'passwordHash'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.photoUrl && { photoUrl: data.photoUrl }),
        ...(data.pixKey && { pixKey: data.pixKey.trim() })
      },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        roles: true,
        pixKey: true,
        balance: true,
        createdAt: true,
        passwordHash: false
      }
    });

    return updatedUser as Omit<User, 'passwordHash'>;
  }
}
