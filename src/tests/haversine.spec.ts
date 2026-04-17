import { haversine } from '../lib/haversine';

describe('Haversine Distance (T-14)', () => {
  it('should calculate distance between two points correctly', () => {
    const distance = haversine(-23.6445, -46.5761, -23.6678, -46.4611);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(20);
  });

  it('should return 0 for same coordinates', () => {
    const distance = haversine(-23.6445, -46.5761, -23.6445, -46.5761);
    expect(distance).toBe(0);
  });

  it('should calculate known distance between Sao Paulo points', () => {
    const unifesp = { lat: -23.6445, lng: -46.5761 };
    const anhangabau = { lat: -23.5564, lng: -46.6339 };

    const distance = haversine(
      unifesp.lat,
      unifesp.lng,
      anhangabau.lat,
      anhangabau.lng
    );

    expect(distance).toBeGreaterThan(5);
    expect(distance).toBeLessThan(15);
  });
});
