import { z } from 'zod';

export const listRidesQuerySchema = z.object({
  lat: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .refine((val) => val === undefined || (val >= -90 && val <= 90), {
      message: 'Latitude must be between -90 and 90'
    }),

  lng: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .refine((val) => val === undefined || (val >= -180 && val <= 180), {
      message: 'Longitude must be between -180 and 180'
    })
});

export type ListRidesQuery = z.infer<typeof listRidesQuerySchema>;
