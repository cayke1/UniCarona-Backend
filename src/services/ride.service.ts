import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { haversine } from '../lib/haversine';
import { getDistanceAndDuration } from '../lib/google-maps';
import { ridePollService } from './ride-poll.service';
import type { CreateRideInput, UpdateRideInput } from '../schemas/ride.schema';
import type { Ride, RideStatus } from '@prisma/client';



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
  acceptingRequests: boolean;
  createdAt: Date;
  driver: {
    id: string;
    name: string;
    photoUrl: string | null;
  };
  requests?: Array<{
    id: string;
    passengerId: string;
    status: string;
    requestedSeats: number;
    passenger: {
      id: string;
      name: string;
    };
  }>;
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
  distanceKm: number;
  driver: {
    name: string;
    photoUrl: string | null;
  };
}

export class RideService {
  async createRide(
    driverId: string,
    data: CreateRideInput
  ): Promise<RideWithDriver> {
    const activeRide = await prisma.ride.findFirst({
      where: {
        driverId,
        status: 'ACTIVE'
      }
    });

    if (activeRide) {
      throw new AppError('Driver already has an active ride', 400);
    }

    const costPerKm = data.costPerKm ?? parseFloat(process.env.COST_PER_KM ?? '1.5');

    if (
      data.originLat === undefined ||
      data.originLng === undefined ||
      data.destinationLat === undefined ||
      data.destinationLng === undefined
    ) {
      throw new AppError('Origin and destination coordinates are required', 400);
    }

    let distanceKm: number;
    try {
      const { distanceKm: googleDistance } = await getDistanceAndDuration(
        data.originLat,
        data.originLng,
        data.destinationLat,
        data.destinationLng
      );
      distanceKm = googleDistance;
    } catch (error) {
      console.warn('Google Maps API failed, using Haversine fallback:', error);
      try {
        distanceKm = haversine(
          data.originLat,
          data.originLng,
          data.destinationLat,
          data.destinationLng
        );
      } catch {
        throw new AppError('Failed to calculate distance between coordinates', 400);
      }
    }

    if (!distanceKm || distanceKm <= 0) {
      throw new AppError('Calculated distance must be greater than zero', 400);
    }

    const estimatedTotalCost = distanceKm * costPerKm;
    const costPerSeat = estimatedTotalCost / data.totalSeats;

    if (costPerSeat <= 0) {
      throw new AppError('Invalid pricing: cost per seat must be greater than zero', 400);
    }

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
        costPerKm,
        distanceKm,
        estimatedTotalCost,
        costPerSeat,
        status: 'ACTIVE'
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      }
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
      acceptingRequests: ride.acceptingRequests,
      createdAt: ride.createdAt,
      driver: ride.driver
    };
  }

  async listActiveRides(
    userId: string,
    userLat?: number,
    userLng?: number
  ): Promise<MapRideResponse[]> {
    const now = new Date();

    const rides = await prisma.ride.findMany({
      where: {
        status: 'ACTIVE',
        departureTime: {
          gte: now
        },
        acceptingRequests: true,
        driverId: {
          not: userId
        }
      },
      include: {
        driver: {
          select: {
            name: true,
            photoUrl: true
          }
        }
      }
    });

    const ridesWithDistance = rides.map((ride) => {
      const distanceKm =
        userLat !== undefined && userLng !== undefined
          ? haversine(userLat, userLng, ride.originLat, ride.originLng)
          : 0;

      return {
        id: ride.id,
        originLat: ride.originLat,
        originLng: ride.originLng,
        destinationLat: ride.destinationLat,
        destinationLng: ride.destinationLng,
        departureTime: ride.departureTime,
        availableSeats: ride.availableSeats,
        costPerSeat: Number(ride.costPerSeat),
        distanceKm: Math.round(distanceKm * 100) / 100,
        driver: {
          name: ride.driver.name,
          photoUrl: ride.driver.photoUrl
        }
      };
    });

    if (userLat !== undefined && userLng !== undefined) {
      ridesWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
    } else {
      ridesWithDistance.sort(
        (a, b) => a.departureTime.getTime() - b.departureTime.getTime()
      );
    }

    return ridesWithDistance;
  }

  async getDriverRides(driverId: string) {
    const rides = await prisma.ride.findMany({
      where: {
        driverId,
        status: 'ACTIVE',
      },
      orderBy: { departureTime: 'asc' },
      include: {
        requests: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          include: {
            passenger: { select: { id: true, name: true } },
          },
        },
      },
    });

    return rides.map((r) => ({
      id: r.id,
      originAddress: r.originAddress,
      destinationAddress: r.destinationAddress,
      departureTime: r.departureTime,
      availableSeats: r.availableSeats,
      totalSeats: r.totalSeats,
      acceptingRequests: r.acceptingRequests,
      pendingRequests: r.requests.map((req) => ({
        id: req.id,
        requestedSeats: req.requestedSeats,
        pickupLocation: req.pickupLocation,
        dropoffLocation: req.dropoffLocation,
        estimatedCost: Number(req.estimatedCost),
        createdAt: req.createdAt,
        passenger: req.passenger,
      })),
    }));
  }

  async getDriverRideHistory(driverId: string) {
    const rides = await prisma.ride.findMany({
      where: { driverId, status: 'COMPLETED' },
      orderBy: { departureTime: 'desc' },
      include: {
        requests: {
          where: { status: 'PAID' },
          select: { id: true },
        },
      },
    });

    return rides.map((r) => ({
      id: r.id,
      originAddress: r.originAddress,
      destinationAddress: r.destinationAddress,
      departureTime: r.departureTime,
      totalSeats: r.totalSeats,
      paidPassengers: r.requests.length,
    }));
  }

  async getRideById(rideId: string, userId?: string): Promise<RideWithDriver> {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        },
        requests: {
          where: {
            status: { notIn: ['REJECTED', 'CANCELLED'] }
          },
          include: {
            passenger: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!ride) {
      throw new AppError('Ride not found', 404);
    }

    const isOwner = userId === ride.driverId;

    if (!isOwner) {
      if (ride.status !== 'ACTIVE') {
        throw new AppError('Ride is not active', 404);
      }

      if (ride.departureTime < new Date()) {
        throw new AppError('Ride has already departed', 404);
      }
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
      acceptingRequests: ride.acceptingRequests,
      createdAt: ride.createdAt,
      driver: ride.driver,
      requests: ride.requests.map((r) => ({
        id: r.id,
        passengerId: r.passengerId,
        status: r.status,
        requestedSeats: r.requestedSeats,
        passenger: r.passenger
      }))
    };
  }

  async cancelRide(rideId: string, userId: string): Promise<Ride> {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId }
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
        data: {
          status: 'CANCELLED',
          acceptingRequests: false,
          availableSeats: 0
        }
      });

      await tx.rideRequest.updateMany({
        where: {
          rideId,
          status: { in: ['PENDING', 'ACCEPTED', 'AWAITING_PAYMENT'] }
        },
        data: {
          status: 'CANCELLED'
        }
      });
    });

    const cancelledRide = await prisma.ride.findUnique({
      where: { id: rideId }
    });

    if (!cancelledRide) {
      throw new AppError('Ride not found after cancellation', 404);
    }

    ridePollService.notifyRideUpdated(rideId);
    return cancelledRide;
  }

  async updateRide(
    rideId: string,
    userId: string,
    data: UpdateRideInput
  ): Promise<RideWithDriver> {
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      }
    });

    if (!ride) {
      throw new AppError('Ride not found', 404);
    }

    if (ride.driverId !== userId) {
      throw new AppError('Only the driver can update this ride', 403);
    }

    if (ride.status !== 'ACTIVE') {
      throw new AppError('Only active rides can be updated', 400);
    }

    if (ride.departureTime < new Date()) {
      throw new AppError('Cannot update a ride that has already departed', 400);
    }

    const acceptingRequestsValue = data.acceptingRequests ?? data.bookingOpen;

    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: {
        ...(acceptingRequestsValue !== undefined && { acceptingRequests: acceptingRequestsValue }),
        ...(data.status !== undefined && { status: data.status as RideStatus }),
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      }
    });

    return {
      id: updatedRide.id,
      departureTime: updatedRide.departureTime,
      originAddress: updatedRide.originAddress,
      originLat: updatedRide.originLat,
      originLng: updatedRide.originLng,
      destinationAddress: updatedRide.destinationAddress,
      destinationLat: updatedRide.destinationLat,
      destinationLng: updatedRide.destinationLng,
      totalSeats: updatedRide.totalSeats,
      availableSeats: updatedRide.availableSeats,
      costPerKm: Number(updatedRide.costPerKm),
      distanceKm: Number(updatedRide.distanceKm),
      estimatedTotalCost: Number(updatedRide.estimatedTotalCost),
      costPerSeat: Number(updatedRide.costPerSeat),
      status: updatedRide.status,
      acceptingRequests: updatedRide.acceptingRequests,
      createdAt: updatedRide.createdAt,
      driver: updatedRide.driver
    };
  }

  async completeRide(rideId: string, userId: string): Promise<void> {
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });

    if (!ride) throw new AppError('Ride not found', 404);
    if (ride.driverId !== userId) throw new AppError('Only the driver can complete this ride', 403);
    if (ride.status !== 'ACTIVE') throw new AppError('Only active rides can be completed', 400);
    if (ride.departureTime > new Date()) throw new AppError('Cannot complete a ride before its departure time', 400);

    await prisma.ride.update({
      where: { id: rideId },
      data: { status: 'COMPLETED' },
    });

    ridePollService.notifyRideUpdated(rideId);
  }
}
