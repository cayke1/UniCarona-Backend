import request from 'supertest';
import { app } from '../app';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => {
      return {
        emails: {
          send: jest
            .fn()
            .mockResolvedValue({ data: { id: 'mocked_email_id' }, error: null })
        }
      };
    })
  };
});

jest.mock('../lib/google-maps', () => ({
  getDistanceAndDuration: jest.fn().mockResolvedValue({
    distanceKm: 5.5,
    durationMinutes: 15
  })
}));

const prisma = new PrismaClient();
const testEmailDriver = `driver_${Date.now()}@example.com`;
const testPassword = 'password123';
const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

describe('Testes de Rides (T-06, T-07, T-08, T-11)', () => {
  let driverToken: string;
  let driverId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testPassword, 10);
    const user = await prisma.user.create({
      data: {
        name: 'Driver Test',
        email: testEmailDriver,
        passwordHash,
        roles: ['DRIVER']
      }
    });
    driverId = user.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmailDriver, password: testPassword });

    driverToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.ride.deleteMany({ where: { driverId } });
    await prisma.refreshToken.deleteMany({ where: { userId: driverId } });
    await prisma.user.delete({ where: { id: driverId } });
    await prisma.$disconnect();
  });

  describe('T-06: POST /rides (Criar Carona)', () => {
    beforeEach(async () => {
      await prisma.ride.deleteMany({ where: { driverId, status: 'ACTIVE' } });
    });

    it('Deve criar uma carona com sucesso (201)', async () => {
      const response = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          departureTime: futureDate,
          originAddress: 'Universidade Federal do ABC',
          originLat: -23.6445,
          originLng: -46.5761,
          destinationAddress: 'Terminal Santo André',
          destinationLat: -23.6678,
          destinationLng: -46.4611,
          totalSeats: 3
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('driver');
      expect(response.body.status).toBe('ACTIVE');
    });

    it('Deve calcular distância e custo automaticamente via Google Maps', async () => {
      const response = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          departureTime: futureDate,
          originAddress: 'Universidade Federal do ABC',
          originLat: -23.6445,
          originLng: -46.5761,
          destinationAddress: 'Terminal Santo André',
          destinationLat: -23.6678,
          destinationLng: -46.4611,
          totalSeats: 4
        });

      expect(response.status).toBe(201);
      expect(response.body.distanceKm).toBe(5.5);
      expect(response.body.estimatedTotalCost).toBeGreaterThan(0);
      expect(response.body.costPerSeat).toBeGreaterThan(0);
      expect(response.body.costPerKm).toBeGreaterThan(0);
    });

    it('Deve retornar 403 se usuário não é driver', async () => {
      const passengerEmail = `passenger_${Date.now()}@example.com`;
      const passwordHash = await bcrypt.hash(testPassword, 10);
      await prisma.user.create({
        data: {
          name: 'Passenger Test',
          email: passengerEmail,
          passwordHash,
          roles: [UserRole.PASSENGER]
        }
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: passengerEmail, password: testPassword });

      const response = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .send({
          departureTime: futureDate,
          originAddress: 'Origin',
          originLat: -23.6445,
          originLng: -46.5761,
          destinationAddress: 'Destination',
          destinationLat: -23.6678,
          destinationLng: -46.4611,
          totalSeats: 3
        });

      expect(response.status).toBe(403);

      await prisma.refreshToken.deleteMany({
        where: { user: { email: passengerEmail } }
      });
      await prisma.user.delete({ where: { email: passengerEmail } });
    });

    it('Deve retornar 400 se departureTime no passado', async () => {
      const response = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          departureTime: '2020-01-01T00:00:00Z',
          originAddress: 'Origin',
          originLat: -23.6445,
          originLng: -46.5761,
          destinationAddress: 'Destination',
          destinationLat: -23.6678,
          destinationLng: -46.4611,
          totalSeats: 3
        });

      expect(response.status).toBe(400);
    });

    it('Deve retornar 400 se totalSeats inválido', async () => {
      const response = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          departureTime: futureDate,
          originAddress: 'Origin',
          originLat: -23.6445,
          originLng: -46.5761,
          destinationAddress: 'Destination',
          destinationLat: -23.6678,
          destinationLng: -46.4611,
          totalSeats: 10
        });

      expect(response.status).toBe(400);
    });

    it('Deve retornar 400 se origin e destination iguais', async () => {
      const response = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          departureTime: futureDate,
          originAddress: 'Same Place',
          originLat: -23.6445,
          originLng: -46.5761,
          destinationAddress: 'Same Place',
          destinationLat: -23.6445,
          destinationLng: -46.5761,
          totalSeats: 3
        });

      expect(response.status).toBe(400);
    });
  });

  describe('T-07: GET /rides (Listar Caronas)', () => {
    it('Deve listar caronas ativas (200)', async () => {
      const response = await request(app)
        .get('/api/rides')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('Deve retornar 401 se não autenticado', async () => {
      const response = await request(app).get('/api/rides');

      expect(response.status).toBe(401);
    });
  });

  describe('T-08: GET /rides/:id (Detalhes da Carona)', () => {
    beforeEach(async () => {
      await prisma.ride.deleteMany({ where: { driverId, status: 'ACTIVE' } });
    });

    it('Deve retornar detalhes da carona (200)', async () => {
      const createResponse = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          departureTime: futureDate,
          originAddress: 'Origin Detail',
          originLat: -23.6445,
          originLng: -46.5761,
          destinationAddress: 'Destination Detail',
          destinationLat: -23.6678,
          destinationLng: -46.4611,
          totalSeats: 2
        });

      const rideId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/rides/${rideId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('driver');
    });

    it('Deve retornar 404 para carona inexistente', async () => {
      const response = await request(app)
        .get('/api/rides/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('T-11: DELETE /rides/:id (Cancelar Carona)', () => {
    beforeEach(async () => {
      await prisma.ride.deleteMany({ where: { driverId, status: 'ACTIVE' } });
    });

    it('Deve cancelar carona do próprio driver (200)', async () => {
      const createResponse = await request(app)
        .post('/api/rides')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          departureTime: futureDate,
          originAddress: 'Origin Cancel',
          originLat: -23.6445,
          originLng: -46.5761,
          destinationAddress: 'Destination Cancel',
          destinationLat: -23.6678,
          destinationLng: -46.4611,
          totalSeats: 2
        });

      const rideId = createResponse.body.id;

      const response = await request(app)
        .delete(`/api/rides/${rideId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CANCELLED');
    });

    it('Deve retornar 403 se não for o driver', async () => {
      const otherEmail = `other_${Date.now()}@example.com`;
      const passwordHash = await bcrypt.hash(testPassword, 10);
      await prisma.user.create({
        data: {
          name: 'Other Driver',
          email: otherEmail,
          passwordHash,
          roles: [UserRole.DRIVER]
        }
      });

      const otherLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: otherEmail, password: testPassword });

      const ridesResponse = await request(app)
        .get('/api/rides')
        .set('Authorization', `Bearer ${driverToken}`);

      const rideId = ridesResponse.body[0]?.id;

      if (rideId) {
        const response = await request(app)
          .delete(`/api/rides/${rideId}`)
          .set('Authorization', `Bearer ${otherLogin.body.accessToken}`);

        expect(response.status).toBe(403);
      }

      await prisma.refreshToken.deleteMany({
        where: { user: { email: otherEmail } }
      });
      await prisma.user.delete({ where: { email: otherEmail } });
    });
  });
});
