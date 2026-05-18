import { z } from 'zod';

export const rideRouteGeometrySchema = z.object({
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
});

export type RideRouteGeometryInput = z.infer<typeof rideRouteGeometrySchema>;
