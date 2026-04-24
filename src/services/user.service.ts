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

  async getMyRequests(userId: string) {
    const requests = await prisma.rideRequest.findMany({
      where: { passengerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        ride: {
          select: {
            id: true,
            originAddress: true,
            destinationAddress: true,
            departureTime: true,
            driver: { select: { name: true, photoUrl: true } },
          },
        },
      },
    });

    return requests.map((r) => ({
      id: r.id,
      status: r.status,
      requestedSeats: r.requestedSeats,
      estimatedCost: Number(r.estimatedCost),
      totalCharged: Number(r.totalCharged),
      createdAt: r.createdAt,
      ride: {
        id: r.ride.id,
        originAddress: r.ride.originAddress,
        destinationAddress: r.ride.destinationAddress,
        departureTime: r.ride.departureTime,
        driver: r.ride.driver,
      },
    }));
  }
}
