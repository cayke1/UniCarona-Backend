import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { AppError } from '../lib/app-error';

const userService = new UserService();

export class UserController {
  async getMyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;
      if (!userId) throw new AppError('Unauthorized: Token context missing', 401);
      const requests = await userService.getMyRequests(userId);
      res.status(200).json(requests);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        throw new AppError('Unauthorized: Token context missing', 401);
      }

      const user = await userService.getSelfProfile(userId);

      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
