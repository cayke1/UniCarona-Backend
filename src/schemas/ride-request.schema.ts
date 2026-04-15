import { z } from 'zod';

export const createRideRequestSchema = z.object({
  pickupLocation: z.string().min(1, 'Pickup location is required'),
  dropoffLocation: z.string().min(1, 'Dropoff location is required'),
  requestedSeats: z.number().int().min(1, 'At least one seat is required'),
});

export const updateRideRequestStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});

export type CreateRideRequestInput = z.infer<typeof createRideRequestSchema>;
export type UpdateRideRequestStatusInput = z.infer<typeof updateRideRequestStatusSchema>;
