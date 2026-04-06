import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../lib/app-error';

export const errorHandlerMiddleware = (
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction
): void => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : 'Internal server error';

  response.status(statusCode).json({
    message,
    details:
      process.env.NODE_ENV === 'development' && !(error instanceof AppError)
        ? error.message
        : undefined
  });
};

