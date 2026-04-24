import request from 'supertest';
import { app } from '../app';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const testPassword = 'password123';
const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

describe('Testes de Solicitação de Carona (Task 1 & 2)', () => {
  let driverToken: string;
  let driverId: string;
  let passengerToken: string;
  let passengerId: string;
  let rideId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testPassword, 10);

    // Create Driver
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

    // Create Passenger
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

    // Create a Ride
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
      expect(response.body.message).toMatch(/already have an active request/i);
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
        /cannot request a seat on their own ride/i
      );
    });

    it('Deve retornar 400 se não houver assentos suficientes', async () => {
      // Create another passenger for this test
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
          requestedSeats: 5 // More than available
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/not enough seats available/i);

      await prisma.refreshToken.deleteMany({
        where: { user: { email: p2Email } }
      });
      await prisma.user.delete({ where: { email: p2Email } });
    });
  });

  describe('PATCH /requests/:id (Decisão do Motorista)', () => {
    let requestId: string;

    beforeEach(async () => {
      // Reset availableSeats and clean up requests
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

      // Check if seats were decremented
      const ride = await prisma.ride.findUnique({ where: { id: rideId } });
      expect(ride?.availableSeats).toBe(1); // 2 - 1 = 1
    });

    it('Deve recusar uma solicitação (200)', async () => {
      const response = await request(app)
        .patch(`/api/requests/${requestId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'REJECTED' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('REJECTED');

      // Check if seats were NOT decremented
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
});
