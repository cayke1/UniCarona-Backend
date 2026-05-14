import { z } from 'zod';

const MIN_DEPARTURE_TIME_MINUTES = 15;

export const createRideSchema = z.object({
  departureTime: z
    .string()
    .datetime({ message: 'Data e hora de partida inválida' })
    .refine((date) => {
      const departure = new Date(date);
      const minTime = new Date(Date.now() + MIN_DEPARTURE_TIME_MINUTES * 60 * 1000);
      return departure >= minTime;
    }, { message: 'A data de partida deve ser pelo menos 15 minutos no futuro' }),

  originAddress: z
    .string()
    .min(1, 'Endereço de origem é obrigatório'),

  originLat: z
    .number()
    .min(-90, 'Latitude deve estar entre -90 e 90')
    .max(90, 'Latitude deve estar entre -90 e 90'),

  originLng: z
    .number()
    .min(-180, 'Longitude deve estar entre -180 e 180')
    .max(180, 'Longitude deve estar entre -180 e 180'),

  destinationAddress: z
    .string()
    .min(1, 'Endereço de destino é obrigatório'),

  destinationLat: z
    .number()
    .min(-90, 'Latitude deve estar entre -90 e 90')
    .max(90, 'Latitude deve estar entre -90 e 90'),

  destinationLng: z
    .number()
    .min(-180, 'Longitude deve estar entre -180 e 180')
    .max(180, 'Longitude deve estar entre -180 e 180'),

  totalSeats: z
    .number()
    .int('Número de assentos deve ser um inteiro')
    .min(1, 'Deve ter pelo menos 1 assento')
    .max(8, 'Máximo de 8 assentos'),

  costPerKm: z.number().optional(),
  distanceKm: z.number().optional(),
  estimatedTotalCost: z.number().optional(),
  costPerSeat: z.number().optional(),
}).refine(
  (data) => {
    return (
      data.originLat !== data.destinationLat ||
      data.originLng !== data.destinationLng
    );
  },
  { message: 'Origem e destino não podem ser iguais', path: ['destinationAddress'] }
);

export type CreateRideInput = z.infer<typeof createRideSchema>;
export const updateRideSchema = z.object({
  acceptingRequests: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'CANCELLED', 'COMPLETED']).optional(),
});

export type UpdateRideInput = z.infer<typeof updateRideSchema>;
