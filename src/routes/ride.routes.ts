import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validateData } from '../middlewares/validate.middleware';
import { rideController } from '../controllers/ride.controller';
import { createRideSchema } from '../schemas/ride.schema';

const rideRoutes = Router();

rideRoutes.post(
  '/',
  authMiddleware,
  requireRole('DRIVER'),
  validateData(createRideSchema),
  rideController.createRide
);

rideRoutes.get(
  '/',
  authMiddleware,
  rideController.listRides
);

rideRoutes.get(
  '/:id',
  authMiddleware,
  rideController.getRideById
);

rideRoutes.delete(
  '/:id',
  authMiddleware,
  rideController.cancelRide
);

export { rideRoutes };
