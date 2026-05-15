import { prisma } from '../lib/prisma';
import { AppError } from '../lib/app-error';
import { notificationService } from './notification.service';
import { ridePollService } from './ride-poll.service';
import type { RideRequest, Transaction } from '@prisma/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAYMENT_DELAY_MS = 1500;

interface PaymentResult {
  success: boolean;
  message: string;
  request: RideRequest;
  transaction: Transaction;
  driverBalance: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PaymentService {
  async processPayment(requestId: string, passengerId: string): Promise<PaymentResult> {
    if (!UUID_REGEX.test(requestId)) {
      throw new AppError('Invalid request ID format', 400);
    }

    const request = await prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: {
        ride: {
          include: {
            driver: true
          }
        }
      }
    });

    if (!request) {
      throw new AppError('Ride request not found', 404);
    }

    if (request.passengerId !== passengerId) {
      throw new AppError('You are not authorized to pay for this request', 403);
    }

    if (request.status === 'PAID') {
      throw new AppError('Cannot process payment for request with status PAID', 400);
    }

    if (request.status !== 'AWAITING_PAYMENT') {
      throw new AppError(
        `Cannot process payment for request with status ${request.status}`,
        400
      );
    }

    await delay(PAYMENT_DELAY_MS);

    const driverCreditAmount = Number(request.estimatedCost);

    const result = await prisma.$transaction(async (tx) => {
      const existingTransaction = await tx.transaction.findFirst({
        where: { requestId }
      });
      if (existingTransaction) {
        throw new AppError('Payment has already been processed', 400);
      }

      const updatedRequest = await tx.rideRequest.update({
        where: { id: requestId },
        data: { status: 'PAID' }
      });

      const updatedDriver = await tx.user.update({
        where: { id: request.ride.driverId },
        data: {
          balance: {
            increment: driverCreditAmount
          }
        }
      });

      const transaction = await tx.transaction.create({
        data: {
          requestId: requestId,
          userId: request.ride.driverId,
          type: 'CREDIT',
          amount: driverCreditAmount,
          paymentMethod: 'PIX',
          status: 'CONFIRMED'
        }
      });

      return {
        updatedRequest,
        updatedDriver,
        transaction
      };
    });

    await Promise.allSettled([
      notificationService.notify(
        request.ride.driverId,
        'Payment Received',
        `You received R$ ${driverCreditAmount.toFixed(2)} for the ride from ${request.pickupLocation} to ${request.dropoffLocation}.`
      ),
      notificationService.notify(
        passengerId,
        'Payment Confirmed',
        `Your payment of R$ ${Number(request.totalCharged).toFixed(2)} has been confirmed.`
      )
    ]);

    ridePollService.notifyRideUpdated(request.rideId);

    return {
      success: true,
      message: 'Payment processed successfully',
      request: result.updatedRequest,
      transaction: result.transaction,
      driverBalance: Number(result.updatedDriver.balance)
    };
  }
}

export const paymentService = new PaymentService();
