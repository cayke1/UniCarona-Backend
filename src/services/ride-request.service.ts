import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { notificationService } from './notification.service';
import type { CreateRideRequestInput } from '../schemas/ride-request.schema';
import type { RideRequest } from '@prisma/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RideRequestStatusType = 'PENDING' | 'ACCEPTED' | 'AWAITING_PAYMENT' | 'PAID' | 'REJECTED' | 'CANCELLED';

const VALID_TRANSITIONS: Record<RideRequestStatusType, RideRequestStatusType[]> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['AWAITING_PAYMENT', 'CANCELLED'],
  AWAITING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: [],
  REJECTED: [],
  CANCELLED: [],
};

function isValidTransition(from: RideRequestStatusType, to: RideRequestStatusType): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export class RideRequestService {
  async createRequest(passengerId: string, rideId: string, data: CreateRideRequestInput): Promise<RideRequest> {
    if (!UUID_REGEX.test(rideId)) {
      throw new AppError('Invalid ride ID format', 400);
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

  async updateRequestStatus(userId: string, requestId: string, status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED'): Promise<RideRequest> {
    if (!UUID_REGEX.test(requestId)) {
      throw new AppError('Invalid request ID format', 400);
    }

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

    const currentStatus = request.status as RideRequestStatusType;
    if (!isValidTransition(currentStatus, status)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${status}`,
        400
      );
    }

    if (status === 'CANCELLED') {
      if (request.passengerId !== userId) {
        throw new AppError('Only the passenger can cancel this request', 403);
      }
      if (request.status !== 'PENDING') {
        throw new AppError('Only pending requests can be cancelled', 400);
      }
      return prisma.rideRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
      });
    }

    if (request.ride.driverId !== userId) {
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

        // Update request status to AWAITING_PAYMENT as per Task 2
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

  async getRequestById(requestId: string, userId: string): Promise<RideRequest> {
    if (!UUID_REGEX.test(requestId)) {
      throw new AppError('Invalid request ID format', 400);
    }

    const request = await prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: {
        ride: {
          include: {
            driver: { select: { id: true, name: true, photoUrl: true } },
          },
        },
        passenger: { select: { id: true, name: true, photoUrl: true } },
      },
    });

    if (!request) {
      throw new AppError('Ride request not found', 404);
    }

    if (request.passengerId !== userId && request.ride.driverId !== userId) {
      throw new AppError('You are not authorized to view this request', 403);
    }

    return request;
  }

  async getPassengerRequests(passengerId: string): Promise<RideRequest[]> {
    return prisma.rideRequest.findMany({
      where: { passengerId },
      include: {
        ride: {
          include: {
            driver: { select: { id: true, name: true, photoUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRideRequests(driverId: string, rideId: string): Promise<RideRequest[]> {
    if (!UUID_REGEX.test(rideId)) {
      throw new AppError('Invalid ride ID format', 400);
    }

    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride || ride.driverId !== driverId) {
      throw new AppError('You are not authorized to view requests for this ride', 403);
    }

    return prisma.rideRequest.findMany({
      where: { rideId },
      include: {
        passenger: { select: { id: true, name: true, photoUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export const rideRequestService = new RideRequestService();
