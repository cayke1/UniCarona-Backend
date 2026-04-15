import { config } from '../lib/config';

export interface PricingInput {
  distanceKm: number;
  availableSeats: number;
}

export interface PricingResult {
  baseRate: number;
  distanceCost: number;
  totalCost: number;
  appFee: number;
  appFeePercent: number;
  driverEarnings: number;
  costPerSeat: number;
  availableSeats: number;
}

export class PricingService {
  static calculatePrice(input: PricingInput): PricingResult {
    const { distanceKm, availableSeats } = input;

    if (distanceKm < 0) {
      throw new Error('Distance must be non-negative');
    }
    if (availableSeats < 1) {
      throw new Error('Available seats must be at least 1');
    }

    const baseRate = config.PRICING_BASE_RATE;
    const perKm = config.PRICING_PER_KM;
    const appFeePercent = config.PRICING_APP_FEE_PERCENT;

    const distanceCost = distanceKm * perKm;
    const totalCost = baseRate + distanceCost;
    const appFee = (totalCost * appFeePercent) / 100;
    const driverEarnings = totalCost - appFee;
    const costPerSeat = totalCost / availableSeats;

    return {
      baseRate,
      distanceCost: Math.round(distanceCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      appFee: Math.round(appFee * 100) / 100,
      appFeePercent,
      driverEarnings: Math.round(driverEarnings * 100) / 100,
      costPerSeat: Math.round(costPerSeat * 100) / 100,
      availableSeats
    };
  }

  static getPricingConfig() {
    return {
      baseRate: config.PRICING_BASE_RATE,
      perKm: config.PRICING_PER_KM,
      appFeePercent: config.PRICING_APP_FEE_PERCENT
    };
  }
}
