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
    distanceKm: 10,
    durationMinutes: 25
  })
}));

const prisma = new PrismaClient();
const testPassword = 'password123';
const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

describe('Payment Mock Endpoint (POST /payments/mock)', () => {
  let driverToken: string;
  let driverId: string;
  let passengerToken: string;
  let passengerId: string;
  let rideId: string;
  let requestId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testPassword, 10);

    const driverEmail = `driver_pay_${Date.now()}@example.com`;
    const driver = await prisma.user.create({
      data: {
        name: 'Driver Payment Test',
        email: driverEmail,
        passwordHash,
        roles: [UserRole.DRIVER],
        balance: 0,
        pixKey: 'driver-pix-key'
      }
    });
    driverId = driver.id;

    const driverLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: driverEmail, password: testPassword });
    driverToken = driverLogin.body.accessToken;

    const passengerEmail = `passenger_pay_${Date.now()}@example.com`;
    const passenger = await prisma.user.create({
      data: {
        name: 'Passenger Payment Test',
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
        originAddress: 'Origin Payment Test',
        originLat: -23.6445,
        originLng: -46.5761,
        destinationAddress: 'Destination Payment Test',
        destinationLat: -23.6678,
        destinationLng: -46.4611,
        totalSeats: 4
      });
    rideId = rideRes.body.id;
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({
      where: { userId: { in: [driverId, passengerId] } }
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

  beforeEach(async () => {
    await prisma.transaction.deleteMany({
      where: { userId: { in: [driverId, passengerId] } }
    });
    await prisma.rideRequest.deleteMany({ where: { rideId } });
    await prisma.ride.update({
      where: { id: rideId },
      data: { availableSeats: 4 }
    });
    await prisma.user.update({
      where: { id: driverId },
      data: { balance: 0 }
    });

    const reqRes = await request(app)
      .post(`/api/rides/${rideId}/requests`)
      .set('Authorization', `Bearer ${passengerToken}`)
      .send({
        pickupLocation: 'Pickup Point',
        dropoffLocation: 'Dropoff Point',
        requestedSeats: 2
      });
    requestId = reqRes.body.id;

    await request(app)
      .patch(`/api/requests/${requestId}`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'ACCEPTED' });
  });

  describe('Success Cases', () => {
    it('Should process payment successfully and credit driver balance (200)', async () => {
      const requestBefore = await prisma.rideRequest.findUnique({
        where: { id: requestId }
      });
      const estimatedCost = Number(requestBefore?.estimatedCost);

      const response = await request(app)
        .post('/api/payments/mock')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ requestId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Payment processed successfully');
      expect(response.body.request.status).toBe('PAID');
      expect(response.body.driverBalance).toBe(estimatedCost);

      const driver = await prisma.user.findUnique({ where: { id: driverId } });
      expect(Number(driver?.balance)).toBe(estimatedCost);

      const transaction = await prisma.transaction.findFirst({
        where: { requestId, userId: driverId }
      });
      expect(transaction).not.toBeNull();
      expect(transaction?.type).toBe('CREDIT');
      expect(transaction?.status).toBe('CONFIRMED');
      expect(Number(transaction?.amount)).toBe(estimatedCost);
    }, 10000);

    it('Should credit only estimatedCost without appFee to driver', async () => {
      const requestBefore = await prisma.rideRequest.findUnique({
        where: { id: requestId }
      });
      const estimatedCost = Number(requestBefore?.estimatedCost);
      const appFee = Number(requestBefore?.appFee);
      const totalCharged = Number(requestBefore?.totalCharged);

      expect(totalCharged).toBe(estimatedCost + appFee);

      const response = await request(app)
        .post('/api/payments/mock')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ requestId });

      expect(response.status).toBe(200);
      expect(response.body.driverBalance).toBe(estimatedCost);
      expect(response.body.driverBalance).not.toBe(totalCharged);
    }, 10000);

    it('Should take approximately 1.5 seconds to process', async () => {
      const startTime = Date.now();

      await request(app)
        .post('/api/payments/mock')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ requestId });

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeGreaterThanOrEqual(1400);
      expect(elapsedTime).toBeLessThan(3000);
    }, 10000);
  });

  describe('Error Cases', () => {
    it('Should return 401 without authentication', async () => {
      const response = await request(app)
        .post('/api/payments/mock')
        .send({ requestId });

      expect(response.status).toBe(401);
    });

    it('Should return 400 for invalid request ID format', async () => {
      const response = await request(app)
        .post('/api/payments/mock')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ requestId: 'invalid-uuid' });

      expect(response.status).toBe(400);
    });

    it('Should return 404 for non-existent request', async () => {
      const response = await request(app)
        .post('/api/payments/mock')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ requestId: '00000000-0000-0000-0000-000000000000' });

      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/not found/i);
    }, 10000);

    it('Should return 403 if not the passenger who made the request', async () => {
      const response = await request(app)
        .post('/api/payments/mock')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ requestId });

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/not authorized/i);
    });

    it('Should return 400 if request is not in AWAITING_PAYMENT status', async () => {
      await prisma.rideRequest.update({
        where: { id: requestId },
        data: { status: 'PENDING' }
      });

      const response = await request(app)
        .post('/api/payments/mock')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ requestId });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/cannot process payment/i);
    });

    it('Should return 400 if request is already PAID', async () => {
      await request(app)
        .post('/api/payments/mock')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ requestId });

      const response = await request(app)
        .post('/api/payments/mock')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ requestId });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/cannot process payment.*PAID/i);
    }, 15000);
  });

  describe('Balance Accumulation', () => {
    it('Should accumulate balance for multiple payments', async () => {
      await request(app)
        .post('/api/payments/mock')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ requestId });

      const firstRequest = await prisma.rideRequest.findUnique({
        where: { id: requestId }
      });
      const firstPayment = Number(firstRequest?.estimatedCost);

      const secondPassengerEmail = `passenger2_pay_${Date.now()}@example.com`;
      const secondPassenger = await prisma.user.create({
        data: {
          name: 'Second Passenger',
          email: secondPassengerEmail,
          passwordHash: await bcrypt.hash(testPassword, 10),
          roles: [UserRole.PASSENGER]
        }
      });

      const secondLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: secondPassengerEmail, password: testPassword });

      const secondReqRes = await request(app)
        .post(`/api/rides/${rideId}/requests`)
        .set('Authorization', `Bearer ${secondLogin.body.accessToken}`)
        .send({
          pickupLocation: 'Another Pickup',
          dropoffLocation: 'Another Dropoff',
          requestedSeats: 1
        });

      await request(app)
        .patch(`/api/requests/${secondReqRes.body.id}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'ACCEPTED' });

      await request(app)
        .post('/api/payments/mock')
        .set('Authorization', `Bearer ${secondLogin.body.accessToken}`)
        .send({ requestId: secondReqRes.body.id });

      const secondRequest = await prisma.rideRequest.findUnique({
        where: { id: secondReqRes.body.id }
      });
      const secondPayment = Number(secondRequest?.estimatedCost);

      const driver = await prisma.user.findUnique({ where: { id: driverId } });
      expect(Number(driver?.balance)).toBe(firstPayment + secondPayment);

      await prisma.transaction.deleteMany({
        where: { request: { passengerId: secondPassenger.id } }
      });
      await prisma.rideRequest.deleteMany({
        where: { passengerId: secondPassenger.id }
      });
      await prisma.refreshToken.deleteMany({
        where: { userId: secondPassenger.id }
      });
      await prisma.user.delete({ where: { id: secondPassenger.id } });
    }, 20000);
  });
});
