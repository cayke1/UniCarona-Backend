import { PrismaClient, UserRole, RideStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Senha123!', 10);

  const motorista = await prisma.user.upsert({
    where: { email: 'motorista.palmas@unicarona.com' },
    update: {},
    create: {
      name: 'Carlos Motorista',
      email: 'motorista.palmas@unicarona.com',
      passwordHash,
      roles: [UserRole.DRIVER, UserRole.PASSENGER],
    },
  });

  console.log('Motorista criado:', motorista.id);

  const now = new Date();

  const rides = [
    {
      originAddress: 'ARNOS - Área Residencial Noroeste Sul, Palmas - TO',
      originLat: -10.1833,
      originLng: -48.3476,
      destinationAddress: 'Praça dos Girassóis, Centro, Palmas - TO',
      destinationLat: -10.1835,
      destinationLng: -48.3338,
      departureTime: new Date(now.getTime() + 60 * 60 * 1000), // 1h
      totalSeats: 3,
      distanceKm: 1.8,
      costPerSeat: 4.5,
    },
    {
      originAddress: 'Plano Diretor Sul, Palmas - TO',
      originLat: -10.2058,
      originLng: -48.3321,
      destinationAddress: 'UFT - Universidade Federal do Tocantins, Palmas - TO',
      destinationLat: -10.1838,
      destinationLng: -48.3316,
      departureTime: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2h
      totalSeats: 4,
      distanceKm: 2.5,
      costPerSeat: 6.0,
    },
    {
      originAddress: 'Aureny III, Palmas - TO',
      originLat: -10.2156,
      originLng: -48.3589,
      destinationAddress: 'Plano Diretor Norte, Palmas - TO',
      destinationLat: -10.1624,
      destinationLng: -48.3248,
      departureTime: new Date(now.getTime() + 90 * 60 * 1000), // 1h30
      totalSeats: 2,
      distanceKm: 6.2,
      costPerSeat: 9.0,
    },
    {
      originAddress: 'Taquaralto, Palmas - TO',
      originLat: -10.2417,
      originLng: -48.3527,
      destinationAddress: 'Palmas Shopping, Palmas - TO',
      destinationLat: -10.1892,
      destinationLng: -48.3398,
      departureTime: new Date(now.getTime() + 3 * 60 * 60 * 1000), // 3h
      totalSeats: 3,
      distanceKm: 7.1,
      costPerSeat: 10.5,
    },
  ];

  for (const ride of rides) {
    const created = await prisma.ride.create({
      data: {
        driverId: motorista.id,
        departureTime: ride.departureTime,
        originAddress: ride.originAddress,
        originLat: ride.originLat,
        originLng: ride.originLng,
        destinationAddress: ride.destinationAddress,
        destinationLat: ride.destinationLat,
        destinationLng: ride.destinationLng,
        totalSeats: ride.totalSeats,
        availableSeats: ride.totalSeats,
        costPerKm: parseFloat((ride.costPerSeat / ride.distanceKm).toFixed(2)),
        distanceKm: ride.distanceKm,
        estimatedTotalCost: parseFloat((ride.costPerSeat * ride.totalSeats).toFixed(2)),
        costPerSeat: ride.costPerSeat,
        status: RideStatus.ACTIVE,
      },
    });
    console.log(`Carona criada: ${ride.originAddress.split(',')[0]} → ${ride.destinationAddress.split(',')[0]} (id: ${created.id})`);
  }

  console.log('\nPronto! 4 caronas em Palmas inseridas.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
