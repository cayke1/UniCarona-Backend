import type { DatabaseService } from './database.service';
import type { HealthStatus } from '../models/health.model';

export class HealthService {
  constructor(private readonly databaseService: DatabaseService) {}

  public async getStatus(): Promise<HealthStatus> {
    const database = await this.databaseService.checkHealth();

    return {
      status: 'ok',
      service: 'unicarona-backend',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
      database
    };
  }
}
