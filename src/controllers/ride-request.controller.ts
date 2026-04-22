import type { Request, Response, NextFunction } from 'express';
import { rideRequestService } from '../services/ride-request.service';
import { AppError } from '../lib/app-error';
import type { CreateRideRequestInput, UpdateRideRequestStatusInput } from '../schemas/ride-request.schema';

export class RideRequestController {
  async createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const passengerId = req.user?.sub;
      const rideId = req.params.id as string;

      if (!passengerId) {
        throw new AppError('Unauthorized: Token context missing', 401);
      }

      const data = req.body as CreateRideRequestInput;
      const request = await rideRequestService.createRequest(passengerId, rideId, data);

      res.status(201).json(request);
    } catch (error) {
      next(error);
    }
  }

  async updateRequestStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      const requestId = req.params.id as string;

      if (!userId) {
        throw new AppError('Unauthorized: Token context missing', 401);
      }

      const { status } = req.body as UpdateRideRequestStatusInput;
      const request = await rideRequestService.updateRequestStatus(userId, requestId, status);

      res.status(200).json(request);
    } catch (error) {
      next(error);
    }
  }
}

export const rideRequestController = new RideRequestController();
