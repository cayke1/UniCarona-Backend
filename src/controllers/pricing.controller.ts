import type { NextFunction, Request, Response } from 'express';

import type { PricingService } from '../services/pricing.service';
import { calculatePriceSchema } from '../schemas/pricing.schema';

export class PricingController {
  constructor(private readonly pricingService: typeof PricingService) {}

  public calculatePrice = async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const parseResult = calculatePriceSchema.safeParse(request.body);

      if (!parseResult.success) {
        response.status(400).json({
          message: 'Invalid input',
          errors: parseResult.error.flatten().fieldErrors
        });
        return;
      }

      const result = this.pricingService.calculatePrice(parseResult.data);

      response.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getConfig = async (
    _request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const config_ = this.pricingService.getPricingConfig();
      response.status(200).json(config_);
    } catch (error) {
      next(error);
    }
  };
}
