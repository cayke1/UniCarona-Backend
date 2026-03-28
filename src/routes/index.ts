import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';

const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/auth', authRoutes);

export { routes };
