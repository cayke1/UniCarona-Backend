import { PrismaClient, Genero, Papel, RideStatus, RideRequestStatus, TransactionType, MeioPagamento, TransactionStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed started...');

  // 1. Create Users
  const user1 = await prisma.user.upsert({
    where: { email: 'motorista@example.com' },
    update: {},
    create: {
      nome: 'João Motorista',
      email: 'motorista@example.com',
      senha_hash: '$2b$10$xyz...', // hash mockup
      genero: Genero.MASCULINO,
      papel: [Papel.MOTORISTA, Papel.PASSAGEIRO],
      chave_pix: 'joao@pix.com',
      saldo: 50.0,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'passageiro@example.com' },
    update: {},
    create: {
      nome: 'Maria Passageira',
      email: 'passageiro@example.com',
      senha_hash: '$2b$10$abc...', // hash mockup
      genero: Genero.FEMININO,
      papel: [Papel.PASSAGEIRO],
      saldo: 0.0,
    },
  });

  // 2. Create a Ride
  const ride = await prisma.ride.create({
    data: {
      motorista_id: user1.id,
      horario_saida: new Date(Date.now() + 3600000), // In 1 hour
      origem_endereco: 'Rua A, 123',
      origem_lat: -23.5505,
      origem_lng: -46.6333,
      destino_endereco: 'Av B, 456',
      destino_lat: -23.5500,
      destino_lng: -46.6300,
      assentos_totais: 4,
      assentos_disponiveis: 3,
      custo_por_km: 2.5,
      distancia_km: 10.0,
      custo_total_estimado: 25.0,
      custo_por_assento: 6.25,
      status: RideStatus.ATIVA,
    },
  });

  // 3. Create a Ride Request
  const request = await prisma.rideRequest.create({
    data: {
      carona_id: ride.id,
      passageiro_id: user2.id,
      origem_embarque: 'Rua A, 123',
      destino_desembarque: 'Av B, 456',
      assentos_solicitados: 1,
      custo_estimado: 6.25,
      taxa_app: 1.0,
      total_cobrado: 7.25,
      status: RideRequestStatus.PAGA,
    },
  });

  // 4. Create a Transaction
  await prisma.transaction.create({
    data: {
      solicitacao_id: request.id,
      usuario_id: user2.id,
      tipo: TransactionType.PAGAMENTO,
      valor: 7.25,
      meio_pagamento: MeioPagamento.CARTAO,
      pagarme_id: 'tr_123456789',
      status: TransactionStatus.CONFIRMADA,
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
