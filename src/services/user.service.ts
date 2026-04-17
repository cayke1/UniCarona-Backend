import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';

export class UserService {
  async getSelfProfile(userId: string) {
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
        createdAt: true
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }
}
