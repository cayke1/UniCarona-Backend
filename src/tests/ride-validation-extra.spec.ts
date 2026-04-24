import request from 'supertest';
import { app } from '../app';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const testPassword = 'password123';

describe('Testes Extras de Validação de Carona', () => {
  let driverToken: string;
  let driverId: string;
  let passengerToken: string;
  let passengerId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testPassword, 10);

    const driverEmail = `extra_driver_${Date.now()}@example.com`;
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

    const passengerEmail = `extra_passenger_${Date.now()}@example.com`;
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
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({
      where: { user: { id: { in: [driverId, passengerId] } } }
    });
    await prisma.rideRequest.deleteMany({
      where: { passengerId }
    });
    await prisma.ride.deleteMany({
      where: { driverId }
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: [driverId, passengerId] } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: [driverId, passengerId] } }
    });
    await prisma.$disconnect();
  });

  it('Não deve permitir aceitar uma solicitação após o horário de partida', async () => {
    // Carona no passado (10 minutos atrás)
    const pastDate = new Date(Date.now() - 10 * 60 * 1000);
    
    const ride = await prisma.ride.create({
      data: {
        driverId,
        departureTime: pastDate,
        originAddress: 'Past Origin',
        originLat: -23.6445,
        originLng: -46.5761,
        destinationAddress: 'Past Destination',
        destinationLat: -23.6678,
        destinationLng: -46.4611,
        totalSeats: 2,
        availableSeats: 2,
        costPerSeat: 10,
        costPerKm: 1.5,
        distanceKm: 5,
        estimatedTotalCost: 20
      }
    });

    const reqRes = await request(app)
      .post(`/api/rides/${ride.id}/requests`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        pickupLocation: 'Ponto A',
        dropoffLocation: 'Ponto B',
        requestedSeats: 1
      });

    // Se a criação falhar por causa do tempo, o teste de aceite não faria sentido.
    // Mas o createRequest também bloqueia. Então vamos forçar uma solicitação via Prisma para testar o update.
    
    const requestManual = await prisma.rideRequest.create({
      data: {
        rideId: ride.id,
        passengerId: passengerId,
        pickupLocation: 'Ponto A',
        dropoffLocation: 'Ponto B',
        requestedSeats: 1,
        estimatedCost: 10,
        appFee: 1,
        totalCharged: 11,
        status: 'PENDING'
      }
    });

    const response = await request(app)
      .patch(`/api/requests/${requestManual.id}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'ACCEPTED' });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/already departed/i);
  });
});
