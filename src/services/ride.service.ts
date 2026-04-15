import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import type { CreateRideInput } from '../schemas/ride.schema';
import type { Ride } from '@prisma/client';

interface RideWithDriver {
  id: string;
  departureTime: Date;
  originAddress: string;
  originLat: number;
  originLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  totalSeats: number;
  availableSeats: number;
  costPerKm: number;
  distanceKm: number;
  estimatedTotalCost: number;
  costPerSeat: number;
  status: string;
  createdAt: Date;
  driver: {
    id: string;
    name: string;
    photoUrl: string | null;
  };
}

interface MapRideResponse {
  id: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  departureTime: Date;
  availableSeats: number;
  costPerSeat: number;
  driver: {
    name: string;
    photoUrl: string | null;
  };
}

export class RideService {
  async createRide(driverId: string, data: CreateRideInput): Promise<RideWithDriver> {
    const ride = await prisma.ride.create({
      data: {
        driverId,
        departureTime: new Date(data.departureTime),
        originAddress: data.originAddress,
        originLat: data.originLat,
        originLng: data.originLng,
        destinationAddress: data.destinationAddress,
        destinationLat: data.destinationLat,
        destinationLng: data.destinationLng,
        totalSeats: data.totalSeats,
        availableSeats: data.totalSeats,
        costPerKm: data.costPerKm || 0,
        distanceKm: data.distanceKm || 0,
        estimatedTotalCost: data.estimatedTotalCost || 0,
        costPerSeat: data.costPerSeat || 0,
        status: 'ACTIVE',
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
    });

    return {
      id: ride.id,
      departureTime: ride.departureTime,
      originAddress: ride.originAddress,
      originLat: ride.originLat,
      originLng: ride.originLng,
      destinationAddress: ride.destinationAddress,
      destinationLat: ride.destinationLat,
      destinationLng: ride.destinationLng,
      totalSeats: ride.totalSeats,
      availableSeats: ride.availableSeats,
      costPerKm: Number(ride.costPerKm),
      distanceKm: Number(ride.distanceKm),
      estimatedTotalCost: Number(ride.estimatedTotalCost),
      costPerSeat: Number(ride.costPerSeat),
      status: ride.status,
      createdAt: ride.createdAt,
      driver: ride.driver,
    };
  }

  async listActiveRides(userId: string): Promise<MapRideResponse[]> {
    const now = new Date();

    const rides = await prisma.ride.findMany({
      where: {
        status: 'ACTIVE',
        departureTime: {
          gte: now,
        },
        driverId: {
          not: userId,
        },
      },
      include: {
        driver: {
          select: {
            name: true,
            photoUrl: true,
          },
        },
      },
      orderBy: {
        departureTime: 'asc',
      },
    });

    return rides.map((ride) => ({
      id: ride.id,
      originLat: ride.originLat,
      originLng: ride.originLng,
      destinationLat: ride.destinationLat,
      destinationLng: ride.destinationLng,
      departureTime: ride.departureTime,
      availableSeats: ride.availableSeats,
      costPerSeat: Number(ride.costPerSeat),
      driver: {
        name: ride.driver.name,
        photoUrl: ride.driver.photoUrl,
      },
    }));
  }

  async getRideById(rideId: string): Promise<RideWithDriver> {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
    });

    if (!ride) {
      throw new AppError('Ride not found', 404);
    }

    if (ride.status !== 'ACTIVE') {
      throw new AppError('Ride is not active', 404);
    }

    if (ride.departureTime < new Date()) {
      throw new AppError('Ride has already departed', 404);
    }

    return {
      id: ride.id,
      departureTime: ride.departureTime,
      originAddress: ride.originAddress,
      originLat: ride.originLat,
      originLng: ride.originLng,
      destinationAddress: ride.destinationAddress,
      destinationLat: ride.destinationLat,
      destinationLng: ride.destinationLng,
      totalSeats: ride.totalSeats,
      availableSeats: ride.availableSeats,
      costPerKm: Number(ride.costPerKm),
      distanceKm: Number(ride.distanceKm),
      estimatedTotalCost: Number(ride.estimatedTotalCost),
      costPerSeat: Number(ride.costPerSeat),
      status: ride.status,
      createdAt: ride.createdAt,
      driver: ride.driver,
    };
  }

  async cancelRide(rideId: string, userId: string): Promise<Ride> {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new AppError('Ride not found', 404);
    }

    if (ride.status !== 'ACTIVE') {
      throw new AppError('Ride is not active', 404);
    }

    if (ride.driverId !== userId) {
      throw new AppError('Only the driver can cancel this ride', 403);
    }

    await prisma.$transaction(async (tx) => {
      await tx.ride.update({
        where: { id: rideId },
        data: { status: 'CANCELLED' },
      });

      await tx.rideRequest.updateMany({
        where: {
          rideId,
          status: 'ACCEPTED',
        },
        data: {
          status: 'CANCELLED',
        },
      });
    });

    const cancelledRide = await prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!cancelledRide) {
      throw new AppError('Ride not found after cancellation', 404);
    }

    return cancelledRide;
  }
}
