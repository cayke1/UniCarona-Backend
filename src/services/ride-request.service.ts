import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { notificationService } from './notification.service';
import type { CreateRideRequestInput } from '../schemas/ride-request.schema';
import type { RideRequest } from '@prisma/client';

export class RideRequestService {
  async createRequest(passengerId: string, rideId: string, data: CreateRideRequestInput): Promise<RideRequest> {
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
      throw new AppError('This ride is no longer active', 400);
    }

    if (ride.driverId === passengerId) {
      throw new AppError('Drivers cannot request a seat on their own ride', 400);
    }

    if (ride.availableSeats < data.requestedSeats) {
      throw new AppError(`Not enough seats available. Requested: ${data.requestedSeats}, Available: ${ride.availableSeats}`, 400);
    }

    if (ride.departureTime < new Date()) {
      throw new AppError('Cannot request a ride that has already departed', 400);
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
      throw new AppError('You already have an active request for this ride', 400);
    }

    const estimatedCost = Number(ride.costPerSeat) * data.requestedSeats;
    const appFee = estimatedCost * 0.1;
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
      throw new AppError('Only the driver who created the ride can update request status', 403);
    }

    if (request.status !== 'PENDING') {
      throw new AppError(`This request is already ${request.status.toLowerCase()}`, 400);
    }

    // Validation: Block acceptance after departure time
    if (status === 'ACCEPTED' && request.ride.departureTime < new Date()) {
      throw new AppError('Cannot accept requests for a ride that has already departed', 400);
    }

    if (status === 'ACCEPTED') {
      const currentRide = await prisma.ride.findUnique({
        where: { id: request.rideId },
      });

      if (!currentRide || currentRide.status !== 'ACTIVE') {
        throw new AppError('Ride is no longer active', 400);
      }

      if (currentRide.availableSeats < request.requestedSeats) {
        throw new AppError(`Not enough seats available anymore. Requested: ${request.requestedSeats}, Available: ${currentRide.availableSeats}`, 400);
      }

      // Transition: PENDING -> ACCEPTED -> AWAITING_PAYMENT
      // We move directly to AWAITING_PAYMENT to allow the passenger to pay immediately
      const updatedRequest = await prisma.$transaction(async (tx) => {
        await tx.ride.update({
          where: { id: request.rideId },
          data: {
            availableSeats: {
              decrement: request.requestedSeats,
            },
          },
        });

        return await tx.rideRequest.update({
          where: { id: requestId },
          data: {
            status: 'AWAITING_PAYMENT',
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

  async cancelRequest(userId: string, requestId: string): Promise<RideRequest> {
    const request = await prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: { ride: true },
    });

    if (!request) {
      throw new AppError('Ride request not found', 404);
    }

    if (request.passengerId !== userId) {
      throw new AppError('Only the passenger who created the request can cancel it', 403);
    }

    if (request.status === 'CANCELLED' || request.status === 'REJECTED') {
      throw new AppError(`Request is already ${request.status.toLowerCase()}`, 400);
    }

    if (request.status === 'PAID') {
      throw new AppError('Cannot cancel a request that has already been paid. Please request a refund.', 400);
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      // If it was already accepted (AWAITING_PAYMENT), return the seats
      if (request.status === 'AWAITING_PAYMENT' || request.status === 'ACCEPTED') {
        await tx.ride.update({
          where: { id: request.rideId },
          data: {
            availableSeats: {
              increment: request.requestedSeats,
            },
          },
        });
      }

      return await tx.rideRequest.update({
        where: { id: requestId },
        data: {
          status: 'CANCELLED',
        },
      });
    });

    await notificationService.notify(
      request.ride.driverId,
      'Ride Request Cancelled',
      `A passenger has cancelled their request for your ride.`
    );

    return updatedRequest;
  }
}

export const rideRequestService = new RideRequestService();
