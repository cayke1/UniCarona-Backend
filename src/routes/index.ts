import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { pricingRoutes } from './pricing.routes';

const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/auth', authRoutes);
routes.use('/users', userRoutes);
routes.use('/pricing', pricingRoutes);

export { routes };
