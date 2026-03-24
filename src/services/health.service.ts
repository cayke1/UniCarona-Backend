import type { HealthStatus } from '../models/health.model';

export class HealthService {
  public getStatus(): HealthStatus {
    return {
      status: 'ok',
      service: 'unicarona-backend',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development'
    };
  }
}
