import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../lib/app-error';
import type { TokenPayload } from '../models/auth.model';

export const authMiddleware = (
  request: Request,
  _response: Response,
  next: NextFunction
): void => {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw new AppError('No token provided', 401);
  }

  const [scheme, token] = authHeader.split(' ');

  if (!scheme || scheme !== 'Bearer' || !token) {
    throw new AppError('Token malformatted', 401);
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET!
    ) as TokenPayload;

    request.user = decoded;
    next();
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
};
