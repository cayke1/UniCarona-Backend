import { z } from 'zod';

export const processPaymentSchema = z.object({
  requestId: z.string().uuid('Invalid request ID format')
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
