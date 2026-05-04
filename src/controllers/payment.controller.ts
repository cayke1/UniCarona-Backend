import type { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { AppError } from '../lib/app-error';
import type { ProcessPaymentInput } from '../schemas/payment.schema';

export class PaymentController {
  async processPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const passengerId = req.user?.sub;

      if (!passengerId) {
        throw new AppError('Unauthorized: Token context missing', 401);
      }

      const { requestId } = req.body as ProcessPaymentInput;
      const result = await paymentService.processPayment(requestId, passengerId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
