import type { User, Gender } from '@prisma/client';

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
  gender: Gender;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash' | 'balance' | 'pixKey'>;
}

export interface RefreshBody {
  refreshToken: string;
}
