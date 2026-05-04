import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateData } from '../middlewares/validate.middleware';
import { processPaymentSchema } from '../schemas/payment.schema';

const paymentRoutes = Router();

paymentRoutes.post(
  '/mock',
  authMiddleware,
  validateData(processPaymentSchema),
  paymentController.processPayment
);

export { paymentRoutes };
