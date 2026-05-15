import type { Request, Response, NextFunction } from 'express';
import { RideService } from '../services/ride.service';
import { AppError } from '../lib/app-error';
import type { CreateRideInput, UpdateRideInput } from '../schemas/ride.schema';
import type { ListRidesQuery } from '../schemas/ride.query.schema';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const rideService = new RideService();

export class RideController {
  async createRide(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        throw new AppError('Unauthorized: Token context missing', 401);
      }

      const data = req.body as CreateRideInput;
      const ride = await rideService.createRide(userId, data);

      res.status(201).json(ride);
    } catch (error) {
      next(error);
    }
  }

  async getMyRides(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new AppError('Unauthorized: Token context missing', 401);
      const rides = await rideService.getDriverRides(userId);
      res.status(200).json(rides);
    } catch (error) {
      next(error);
    }
  }

  async listRides(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.sub || '';
      const { lat, lng } = req.query as unknown as ListRidesQuery;

      const rides = await rideService.listActiveRides(userId, lat, lng);

      res.status(200).json(rides);
    } catch (error) {
      next(error);
    }
  }

  async getRideById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const userId = req.user?.sub || '';

      if (!UUID_REGEX.test(id)) {
        throw new AppError('Invalid ride ID format', 400);
      }

      const ride = await rideService.getRideById(id, userId);

      res.status(200).json(ride);
    } catch (error) {
      next(error);
    }
  }

  async cancelRide(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const userId = req.user?.sub;

      if (!UUID_REGEX.test(id)) {
        throw new AppError('Invalid ride ID format', 400);
      }

      if (!userId) {
        throw new AppError('Unauthorized: Token context missing', 401);
      }

      const ride = await rideService.cancelRide(id, userId);

      res.status(200).json(ride);
    } catch (error) {
      next(error);
    }
  }

  async updateRide(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id as string;
      const userId = req.user?.sub;

      if (!UUID_REGEX.test(id)) {
        throw new AppError('Invalid ride ID format', 400);
      }

      if (!userId) {
        throw new AppError('Unauthorized: Token context missing', 401);
      }

      const data = req.body as UpdateRideInput;
      const ride = await rideService.updateRide(id, userId, data);

      res.status(200).json(ride);
    } catch (error) {
      next(error);
    }
  }
}

export const rideController = new RideController();
