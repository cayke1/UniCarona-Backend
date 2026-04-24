import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { notificationService } from './notification.service';
import type { CreateRideRequestInput } from '../schemas/ride-request.schema';
import type { RideRequest } from '@prisma/client';

export class RideRequestService {
  async createRequest(passengerId: string, rideId: string, data: CreateRideRequestInput): Promise<RideRequest> {
    // Validação básica de UUID para evitar erro interno do Prisma
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(rideId)) {
      throw new AppError('ID de carona inválido (deve ser um UUID)', 400);
    }

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new AppError('Ride not found', 404);
    }

    if (ride.status !== 'ACTIVE') {
      throw new AppError('Ride is not active', 400);
    }

    if (ride.driverId === passengerId) {
      throw new AppError('You cannot request a ride for yourself', 400);
    }

    if (ride.availableSeats < data.requestedSeats) {
      throw new AppError('Not enough available seats', 400);
    }

    if (ride.departureTime < new Date()) {
      throw new AppError('Ride has already departed', 400);
    }

    const existingRequest = await prisma.rideRequest.findFirst({
      where: {
        rideId,
        passengerId,
        status: {
          in: ['PENDING', 'ACCEPTED', 'AWAITING_PAYMENT', 'PAID'],
        },
      },
    });

    if (existingRequest) {
      throw new AppError('You have already requested this ride', 400);
    }

    // Pricing calculation
    const estimatedCost = Number(ride.costPerSeat) * data.requestedSeats;
    const appFee = estimatedCost * 0.1; // 10% app fee
    const totalCharged = estimatedCost + appFee;

    const request = await prisma.rideRequest.create({
      data: {
        rideId,
        passengerId,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
        requestedSeats: data.requestedSeats,
        estimatedCost,
        appFee,
        totalCharged,
        status: 'PENDING',
      },
    });

    // Notify driver
    await notificationService.notify(
      ride.driverId,
      'New Ride Request',
      `A passenger has requested ${data.requestedSeats} seats for your ride from ${data.pickupLocation} to ${data.dropoffLocation}.`
    );

    return request;
  }

  async updateRequestStatus(driverId: string, requestId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<RideRequest> {
    const request = await prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: {
        ride: true,
        passenger: true,
      },
    });

    if (!request) {
      throw new AppError('Ride request not found', 404);
    }

    if (request.ride.driverId !== driverId) {
      throw new AppError('Only the driver can update this request', 403);
    }

    if (request.status !== 'PENDING') {
      throw new AppError('This request has already been processed', 400);
    }

    if (request.ride.departureTime < new Date()) {
      throw new AppError('The ride has already departed', 400);
    }

    if (status === 'ACCEPTED') {
      // Re-validate seats
      const currentRide = await prisma.ride.findUnique({
        where: { id: request.rideId },
      });

      if (!currentRide || currentRide.availableSeats < request.requestedSeats) {
        throw new AppError('No more seats available for this ride', 400);
      }

      const updatedRequest = await prisma.$transaction(async (tx) => {
        // Update ride available seats
        await tx.ride.update({
          where: { id: request.rideId },
          data: {
            availableSeats: {
              decrement: request.requestedSeats,
            },
          },
        });

        // Update request status to ACCEPTED
        return await tx.rideRequest.update({
          where: { id: requestId },
          data: {
            status: 'ACCEPTED',
          },
        });
      });

      await notificationService.notify(
        request.passengerId,
        'Ride Request Accepted',
        'Your ride request has been accepted. Please proceed with payment.'
      );

      return updatedRequest;
    } else {
      const updatedRequest = await prisma.rideRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
        },
      });

      await notificationService.notify(
        request.passengerId,
        'Ride Request Rejected',
        'Unfortunately, your ride request has been rejected by the driver.'
      );

      return updatedRequest;
    }
  }
}

export const rideRequestService = new RideRequestService();
