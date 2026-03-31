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
    throw new AppError('Unauthorized: No token provided', 401);
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    throw new AppError('Unauthorized: Token error', 401);
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    throw new AppError('Unauthorized: Token malformatted', 401);
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    const decoded = jwt.verify(token, secret) as TokenPayload;

    request.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('Unauthorized: Token expired', 401);
    }
    
    if (err instanceof jwt.JsonWebTokenError) {
      throw new AppError('Unauthorized: Invalid token signature', 401);
    }

    throw new AppError('Unauthorized: Access denied', 401);
  }
};
