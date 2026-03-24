import type { Request, Response } from 'express';

import type { HealthService } from '../services/health.service';

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  public getStatus = (_request: Request, response: Response): void => {
    const status = this.healthService.getStatus();

    response.status(200).json(status);
  };
}
