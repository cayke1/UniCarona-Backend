import { Router } from 'express';

import { HealthController } from '../controllers/health.controller';
import { DatabaseService } from '../services/database.service';
import { HealthService } from '../services/health.service';

const healthRoutes = Router();
const databaseService = new DatabaseService();
const healthController = new HealthController(
  new HealthService(databaseService)
);

healthRoutes.get('/health', healthController.getStatus);

export { healthRoutes };
