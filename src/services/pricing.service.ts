interface PricingInput {
  distanceKm: number;
  totalSeats: number;
  requestedSeats: number;
}

interface PricingResult {
  totalCost: number;
  costPerSeat: number;
  passengerShare: number;
  appFee: number;
  finalCharge: number;
  driverPayout: number;
}

const BASE_FARE = parseFloat(process.env.BASE_FARE ?? '0');
const COST_PER_KM = parseFloat(process.env.COST_PER_KM ?? '1.5');
const APP_FEE_FIXED = parseFloat(process.env.APP_FEE_FIXED ?? '2.00');

export function calculatePricing(input: PricingInput): PricingResult {
  const totalCost = input.distanceKm * COST_PER_KM + BASE_FARE;
  const costPerSeat = totalCost / input.totalSeats;
  const passengerShare = costPerSeat * input.requestedSeats;
  const appFee = APP_FEE_FIXED;
  const finalCharge = passengerShare + appFee;
  const driverPayout = passengerShare;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    costPerSeat: Math.round(costPerSeat * 100) / 100,
    passengerShare: Math.round(passengerShare * 100) / 100,
    appFee: Math.round(appFee * 100) / 100,
    finalCharge: Math.round(finalCharge * 100) / 100,
    driverPayout: Math.round(driverPayout * 100) / 100
  };
}
