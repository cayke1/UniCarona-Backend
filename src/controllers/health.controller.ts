import type { NextFunction, Request, Response } from 'express';

import type { HealthService } from '../services/health.service';

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  public getStatus = async (
    _request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const status = await this.healthService.getStatus();

      response.status(200).json(status);
    } catch (error) {
      next(error);
    }
  };
}
