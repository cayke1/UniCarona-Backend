import { Router } from 'express';

import { PricingController } from '../controllers/pricing.controller';
import { PricingService } from '../services/pricing.service';

const pricingController = new PricingController(PricingService);

const pricingRoutes = Router();

pricingRoutes.post('/calculate', pricingController.calculatePrice);
pricingRoutes.get('/config', pricingController.getConfig);

export { pricingRoutes };
