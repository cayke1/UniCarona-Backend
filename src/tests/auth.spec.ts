import request from 'supertest';
import { app } from '../app'; 
import { PrismaClient } from '@prisma/client';

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => {
      return {
        emails: {
          send: jest.fn().mockResolvedValue({ data: { id: 'mocked_email_id' }, error: null }),
        },
      };
    }),
  };
});

const prisma = new PrismaClient();
const testEmail = `testuser_${Date.now()}@example.com`;
const testPassword = "password123";

describe('Testes de Autenticação (T-16)', () => {
  
  afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: testEmail } });
    if (user) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
  });

  it('Deve registrar um novo usuário com sucesso (201)', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: "Test User",
        email: testEmail,
        password: testPassword,
        gender: "MALE"
      });

      if (response.status !== 201) {
      console.log("🚨 ERRO INTERNO DO BACKEND:", response.body);
    }

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user'); 
    expect(response.body.user).toHaveProperty('id'); 
  });

  it('Deve retornar erro ao tentar registrar um e-mail já existente (400 ou 409)', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: "Test User 2",
        email: testEmail, 
        password: testPassword,
        gender: "MALE"
      });

    expect([400, 409]).toContain(response.status);
    expect(response.body).toHaveProperty('message');
  });

  it('Deve fazer login com sucesso e retornar um token (200)', async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword
      });

      if (response.status !== 200) {
      console.log("🚨 ERRO INTERNO DO BACKEND NO LOGIN:", response.body);
    }

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken'); 
  });

  it('Deve retornar erro ao fazer login com senha incorreta (401)', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: "senhaerrada123"
      });

    expect(response.status).toBe(401);
  });
});