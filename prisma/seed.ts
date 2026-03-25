import { PrismaClient, Gender, UserRole, RideStatus, RideRequestStatus, TransactionType, PaymentMethod, TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed started...');

  // 1. Create Users
  const user1 = await prisma.user.upsert({
    where: { email: 'motorista@example.com' },
    update: {},
    create: {
      name: 'João Motorista',
      email: 'motorista@example.com',
      passwordHash: '$2b$10$xyz...', // hash mockup
      gender: Gender.MALE,
      roles: [UserRole.DRIVER, UserRole.PASSENGER],
      pixKey: 'joao@pix.com',
      balance: 50.0,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'passageiro@example.com' },
    update: {},
    create: {
      name: 'Maria Passageira',
      email: 'passageiro@example.com',
      passwordHash: '$2b$10$abc...', // hash mockup
      gender: Gender.FEMALE,
      roles: [UserRole.PASSENGER],
      balance: 0.0,
    },
  });

  // 2. Create a Ride
  const ride = await prisma.ride.create({
    data: {
      driverId: user1.id,
      departureTime: new Date(Date.now() + 3600000), // In 1 hour
      originAddress: 'Rua A, 123',
      originLat: -23.5505,
      originLng: -46.6333,
      destinationAddress: 'Av B, 456',
      destinationLat: -23.5500,
      destinationLng: -46.6300,
      totalSeats: 4,
      availableSeats: 3,
      costPerKm: 2.5,
      distanceKm: 10.0,
      estimatedTotalCost: 25.0,
      costPerSeat: 6.25,
      status: RideStatus.ACTIVE,
    },
  });

  // 3. Create a Ride Request
  const request = await prisma.rideRequest.create({
    data: {
      rideId: ride.id,
      passengerId: user2.id,
      pickupLocation: 'Rua A, 123',
      dropoffLocation: 'Av B, 456',
      requestedSeats: 1,
      estimatedCost: 6.25,
      appFee: 1.0,
      totalCharged: 7.25,
      status: RideRequestStatus.PAID,
    },
  });

  // 4. Create a Transaction
  await prisma.transaction.create({
    data: {
      requestId: request.id,
      userId: user2.id,
      type: TransactionType.PAYMENT,
      amount: 7.25,
      paymentMethod: PaymentMethod.CARD,
      pagarMeId: 'tr_123456789',
      status: TransactionStatus.CONFIRMED,
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

