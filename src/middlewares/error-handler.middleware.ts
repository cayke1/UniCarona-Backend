import type { NextFunction, Request, Response } from 'express';

export const errorHandlerMiddleware = (
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction
): void => {
  response.status(500).json({
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};
