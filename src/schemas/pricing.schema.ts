import { z } from 'zod';

export const calculatePriceSchema = z.object({
  distanceKm: z
    .number()
    .min(0, 'Distance must be non-negative')
    .describe('Distance in kilometers'),
  availableSeats: z
    .number()
    .int()
    .min(1, 'Available seats must be at least 1')
    .describe('Number of available seats in the ride')
});

export type CalculatePriceInput = z.infer<typeof calculatePriceSchema>;
