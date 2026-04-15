import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/app-error';

export const requireRole = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      throw new AppError('Unauthorized: Token context missing', 401);
    }

    const hasRole = roles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new AppError('Forbidden: Insufficient permissions', 403);
    }

    next();
  };
};
