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
    distanceKm: 8.3,
    durationMinutes: 20
  })
}));

const prisma = new PrismaClient();
const testPassword = 'password123';
const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

describe('Fluxo Integrado de Carona (T-14)', () => {
  let driverToken: string;
  let passengerToken: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testPassword, 10);

    const driverEmail = `driver_int_${Date.now()}@example.com`;
    await prisma.user.create({
      data: {
        name: 'Driver Integration',
        email: driverEmail,
        passwordHash,
        roles: [UserRole.DRIVER]
      }
    });

    const driverLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: driverEmail, password: testPassword });
    driverToken = driverLogin.body.accessToken;

    const passengerEmail = `passenger_int_${Date.now()}@example.com`;
    await prisma.user.create({
      data: {
        name: 'Passenger Integration',
        email: passengerEmail,
        passwordHash,
        roles: [UserRole.PASSENGER]
      }
    });

    const passengerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: passengerEmail, password: testPassword });
    passengerToken = passengerLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.rideRequest.deleteMany({
      where: { ride: { driver: { email: { contains: '_int_' } } } }
    });
    await prisma.ride.deleteMany({
      where: { driver: { email: { contains: '_int_' } } }
    });
    await prisma.user.deleteMany({
      where: { email: { contains: '_int_' } }
    });
    await prisma.$disconnect();
  });

  it('Deve calcular custo via Google Maps e propagar para request', async () => {
    const rideRes = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        departureTime: futureDate,
        originAddress: 'Casa do Motorista',
        originLat: -23.6500,
        originLng: -46.5800,
        destinationAddress: 'Faculdade',
        destinationLat: -23.5500,
        destinationLng: -46.6300,
        totalSeats: 4
      });

    expect(rideRes.status).toBe(201);
    expect(rideRes.body.distanceKm).toBe(8.3);
    expect(rideRes.body.costPerKm).toBeGreaterThan(0);

    const rideId = rideRes.body.id;

    const requestRes = await request(app)
      .post(`/api/rides/${rideId}/requests`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        pickupLocation: 'Rua A',
        dropoffLocation: 'Faculdade',
        requestedSeats: 1
      });

    expect(requestRes.status).toBe(201);
    expect(Number(requestRes.body.estimatedCost)).toBeGreaterThan(0);

    await prisma.rideRequest.deleteMany({ where: { rideId } });
    await prisma.ride.deleteMany({ where: { id: rideId } });
  });

  it('Deve ordenar rides por distância do usuário (Haversine)', async () => {
    await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        departureTime: futureDate,
        originAddress: 'Origem A',
        originLat: -23.5500,
        originLng: -46.6300,
        destinationAddress: 'Destino A',
        destinationLat: -23.5600,
        destinationLng: -46.6400,
        totalSeats: 2
      });

    const response = await request(app)
      .get('/api/rides')
      .set('Authorization', `Bearer ${passengerToken}`)
      .query({ lat: -23.5600, lng: -46.6400 });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('Testes de Solicitação de Carona (Task 1 & 2)', () => {
  let driverToken: string;
  let driverId: string;
  let passengerToken: string;
  let passengerId: string;
  let rideId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testPassword, 10);

    const driverEmail = `driver_req_${Date.now()}@example.com`;
    const driver = await prisma.user.create({
      data: {
        name: 'Driver Test',
        email: driverEmail,
        passwordHash,
        roles: [UserRole.DRIVER]
      }
    });
    driverId = driver.id;

    const driverLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: driverEmail, password: testPassword });
    driverToken = driverLogin.body.accessToken;

    const passengerEmail = `passenger_req_${Date.now()}@example.com`;
    const passenger = await prisma.user.create({
      data: {
        name: 'Passenger Test',
        email: passengerEmail,
        passwordHash,
        roles: [UserRole.PASSENGER]
      }
    });
    passengerId = passenger.id;

    const passengerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: passengerEmail, password: testPassword });
    passengerToken = passengerLogin.body.accessToken;

    const rideRes = await request(app)
      .post('/api/rides')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        departureTime: futureDate,
        originAddress: 'Origin Test',
        originLat: -23.6445,
        originLng: -46.5761,
        destinationAddress: 'Destination Test',
        destinationLat: -23.6678,
        destinationLng: -46.4611,
        totalSeats: 2,
        costPerSeat: 10
      });
    rideId = rideRes.body.id;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({
      where: { user: { id: { in: [driverId, passengerId] } } }
    });
    await prisma.rideRequest.deleteMany({ where: { rideId } });
    await prisma.ride.deleteMany({ where: { id: rideId } });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [driverId, passengerId] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [driverId, passengerId] } }
    });
    await prisma.$disconnect();
  });

  describe('POST /rides/:id/requests (Solicitação do Passageiro)', () => {
    it('Deve criar uma solicitação com sucesso (201)', async () => {
      const response = await request(app)
        .post(`/api/rides/${rideId}/requests`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          pickupLocation: 'Ponto A',
          dropoffLocation: 'Ponto B',
          requestedSeats: 1
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('PENDING');
      expect(Number(response.body.totalCharged)).toBeGreaterThan(0);
    });

    it('Deve retornar 400 para solicitação duplicada', async () => {
      const response = await request(app)
        .post(`/api/rides/${rideId}/requests`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          pickupLocation: 'Ponto A',
          dropoffLocation: 'Ponto B',
          requestedSeats: 1
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/already requested/i);
    });

    it('Deve retornar 400 se o passageiro for o motorista', async () => {
      const response = await request(app)
        .post(`/api/rides/${rideId}/requests`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          pickupLocation: 'Ponto A',
          dropoffLocation: 'Ponto B',
          requestedSeats: 1
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(
        /cannot request a ride for yourself/i
      );
    });

    it('S4-T7: Deve retornar 400 se a carona tiver pricing inválido', async () => {
      await prisma.ride.update({
        where: { id: rideId },
        data: { costPerSeat: 0 }
      });

      const response = await request(app)
        .post(`/api/rides/${rideId}/requests`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          pickupLocation: 'Ponto A',
          dropoffLocation: 'Ponto B',
          requestedSeats: 1
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/pricing/i);

      await prisma.ride.update({
        where: { id: rideId },
        data: { costPerSeat: 6.225 }
      });
    });

    it('Deve retornar 400 se não houver assentos suficientes', async () => {
      const p2Email = `p2_${Date.now()}@example.com`;
      await prisma.user.create({
        data: {
          name: 'P2',
          email: p2Email,
          passwordHash: await bcrypt.hash(testPassword, 10),
          roles: [UserRole.PASSENGER]
        }
      });
      const p2Login = await request(app)
        .post('/api/auth/login')
        .send({ email: p2Email, password: testPassword });

      const response = await request(app)
        .post(`/api/rides/${rideId}/requests`)
        .set('Authorization', `Bearer ${p2Login.body.accessToken}`)
        .send({
          pickupLocation: 'Ponto A',
          dropoffLocation: 'Ponto B',
          requestedSeats: 5
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/not enough available seats/i);

      await prisma.refreshToken.deleteMany({
        where: { user: { email: p2Email } }
      });
      await prisma.user.delete({ where: { email: p2Email } });
    });
  });

  describe('PATCH /requests/:id (Decisão do Motorista)', () => {
    let requestId: string;

    beforeEach(async () => {
      await prisma.ride.update({
        where: { id: rideId },
        data: { availableSeats: 2 }
      });
      await prisma.rideRequest.deleteMany({ where: { rideId } });

      const res = await request(app)
        .post(`/api/rides/${rideId}/requests`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          pickupLocation: 'Ponto A',
          dropoffLocation: 'Ponto B',
          requestedSeats: 1
        });
      requestId = res.body.id;
    });

    it('Deve aceitar uma solicitação (200)', async () => {
      const response = await request(app)
        .patch(`/api/requests/${requestId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'ACCEPTED' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('AWAITING_PAYMENT');

      const ride = await prisma.ride.findUnique({ where: { id: rideId } });
      expect(ride?.availableSeats).toBe(1);
    });

    it('Deve recusar uma solicitação (200)', async () => {
      const response = await request(app)
        .patch(`/api/requests/${requestId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'REJECTED' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('REJECTED');

      const ride = await prisma.ride.findUnique({ where: { id: rideId } });
      expect(ride?.availableSeats).toBe(2);
    });

    it('Deve retornar 403 se não for o motorista da carona', async () => {
      const response = await request(app)
        .patch(`/api/requests/${requestId}`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ status: 'ACCEPTED' });

      expect(response.status).toBe(403);
    });
  });

  describe('Status Transitions', () => {
    let requestId: string;

    beforeEach(async () => {
      await prisma.ride.update({
        where: { id: rideId },
        data: { availableSeats: 2 }
      });
      await prisma.rideRequest.deleteMany({ where: { rideId } });

      const res = await request(app)
        .post(`/api/rides/${rideId}/requests`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          pickupLocation: 'Ponto A',
          dropoffLocation: 'Ponto B',
          requestedSeats: 1
        });
      requestId = res.body.id;
    });

    it('Deve bloquear transição inválida REJECTED -> ACCEPTED (400)', async () => {
      await request(app)
        .patch(`/api/requests/${requestId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'REJECTED' });

      const response = await request(app)
        .patch(`/api/requests/${requestId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'ACCEPTED' });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/invalid.*transition/i);
    });

    it('Deve permitir aceite após departureTime se a carona ainda estiver ACTIVE', async () => {
      await prisma.ride.update({
        where: { id: rideId },
        data: { departureTime: new Date(Date.now() - 60 * 60 * 1000) }
      });

      const response = await request(app)
        .patch(`/api/requests/${requestId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'ACCEPTED' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('AWAITING_PAYMENT');
    });
  });

  describe('GET Endpoints', () => {
    it('Deve listar minhas solicitações (200)', async () => {
      const response = await request(app)
        .get('/api/requests/me')
        .set('Authorization', `Bearer ${passengerToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('Deve listar pedidos da carona para o motorista (200)', async () => {
      const response = await request(app)
        .get(`/api/rides/${rideId}/requests`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});