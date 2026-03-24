import { Router } from 'express';

import { HealthController } from '../controllers/health.controller';
import { HealthService } from '../services/health.service';

const healthRoutes = Router();
const healthController = new HealthController(new HealthService());

healthRoutes.get('/health', healthController.getStatus);

export { healthRoutes };
