import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UniCarona API',
      version: '1.0.0',
      description: 'API para o aplicativo de caronas universitárias UniCarona',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            photoUrl: { type: 'string', nullable: true },
            roles: { type: 'array', items: { type: 'string', enum: ['DRIVER', 'PASSENGER'] } },
            pixKey: { type: 'string', nullable: true },
            balance: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Ride: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            departureTime: { type: 'string', format: 'date-time' },
            originAddress: { type: 'string' },
            originLat: { type: 'number' },
            originLng: { type: 'number' },
            destinationAddress: { type: 'string' },
            destinationLat: { type: 'number' },
            destinationLng: { type: 'number' },
            totalSeats: { type: 'integer' },
            availableSeats: { type: 'integer' },
            costPerKm: { type: 'number' },
            distanceKm: { type: 'number' },
            estimatedTotalCost: { type: 'number' },
            costPerSeat: { type: 'number' },
            status: { type: 'string', enum: ['ACTIVE', 'CANCELLED', 'COMPLETED'] },
            createdAt: { type: 'string', format: 'date-time' },
            driver: { $ref: '#/components/schemas/User' },
          },
        },
        RideRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            rideId: { type: 'string', format: 'uuid' },
            passengerId: { type: 'string', format: 'uuid' },
            pickupLocation: { type: 'string' },
            dropoffLocation: { type: 'string' },
            requestedSeats: { type: 'integer' },
            estimatedCost: { type: 'number' },
            appFee: { type: 'number' },
            totalCharged: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'ACCEPTED', 'AWAITING_PAYMENT', 'PAID', 'REJECTED', 'CANCELLED'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            details: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {},
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);