/* eslint-disable @typescript-eslint/no-require-imports */
describe('Pricing Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      COST_PER_KM: '2.0',
      BASE_FARE: '5.0',
      APP_FEE_FIXED: '2.0'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should calculate total cost correctly (T-13)', () => {
    const { calculatePricing } = require('../services/pricing.service');

    const result = calculatePricing({
      distanceKm: 10,
      totalSeats: 4,
      requestedSeats: 2
    });

    expect(result.totalCost).toBe(25);
    expect(result.costPerSeat).toBe(6.25);
    expect(result.passengerShare).toBe(12.5);
    expect(result.appFee).toBe(2);
    expect(result.finalCharge).toBe(14.5);
    expect(result.driverPayout).toBe(12.5);
  });

  it('should calculate with single seat requested (T-13)', () => {
    process.env.COST_PER_KM = '1.5';
    process.env.BASE_FARE = '0';
    process.env.APP_FEE_FIXED = '1.0';

    const { calculatePricing } = require('../services/pricing.service');

    const result = calculatePricing({
      distanceKm: 20,
      totalSeats: 4,
      requestedSeats: 1
    });

    expect(result.totalCost).toBe(30);
    expect(result.costPerSeat).toBe(7.5);
    expect(result.passengerShare).toBe(7.5);
    expect(result.finalCharge).toBe(8.5);
  });

  it('should use default env values when not set (T-13)', () => {
    delete process.env.COST_PER_KM;
    delete process.env.BASE_FARE;
    delete process.env.APP_FEE_FIXED;

    const { calculatePricing } = require('../services/pricing.service');

    const result = calculatePricing({
      distanceKm: 10,
      totalSeats: 4,
      requestedSeats: 2
    });

    expect(result.totalCost).toBe(15);
    expect(result.appFee).toBe(2);
  });

  it('should round values to 2 decimal places (T-13)', () => {
    process.env.COST_PER_KM = '1.333';
    process.env.BASE_FARE = '0';
    process.env.APP_FEE_FIXED = '1.5';

    const { calculatePricing } = require('../services/pricing.service');

    const result = calculatePricing({
      distanceKm: 7,
      totalSeats: 3,
      requestedSeats: 1
    });

    expect(result.totalCost).toBe(9.33);
    expect(result.costPerSeat).toBe(3.11);
  });
});
