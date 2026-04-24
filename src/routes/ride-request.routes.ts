import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateData } from '../middlewares/validate.middleware';
import { rideRequestController } from '../controllers/ride-request.controller';
import { updateRideRequestStatusSchema } from '../schemas/ride-request.schema';

const rideRequestRoutes = Router();

rideRequestRoutes.get(
  '/me',
  authMiddleware,
  rideRequestController.getMyRequests
);

rideRequestRoutes.get(
  '/:id',
  authMiddleware,
  rideRequestController.getRequestById
);

rideRequestRoutes.patch(
  '/:id',
  authMiddleware,
  validateData(updateRideRequestStatusSchema),
  rideRequestController.updateRequestStatus
);

export { rideRequestRoutes };
