import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validateData } from '../middlewares/validate.middleware';
import { rideRequestController } from '../controllers/ride-request.controller';
import { updateRideRequestStatusSchema } from '../schemas/ride-request.schema';

const rideRequestRoutes = Router();

rideRequestRoutes.patch(
  '/:id',
  authMiddleware,
  validateData(updateRideRequestStatusSchema),
  rideRequestController.updateRequestStatus
);

export { rideRequestRoutes };
