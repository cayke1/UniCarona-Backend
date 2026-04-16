import { listRidesQuerySchema } from '../schemas/ride.query.schema';

describe('Ride Query Schema (T-14)', () => {
  it('should accept valid lat/lng parameters', () => {
    const result = listRidesQuerySchema.safeParse({
      lat: '-23.6445',
      lng: '-46.5761'
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lat).toBe(-23.6445);
      expect(result.data.lng).toBe(-46.5761);
    }
  });

  it('should accept empty query (no lat/lng)', () => {
    const result = listRidesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should reject invalid latitude (out of range)', () => {
    const result = listRidesQuerySchema.safeParse({
      lat: '100',
      lng: '-46.5761'
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid longitude (out of range)', () => {
    const result = listRidesQuerySchema.safeParse({
      lat: '-23.6445',
      lng: '-200'
    });

    expect(result.success).toBe(false);
  });
});
