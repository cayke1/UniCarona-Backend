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

describe('Testes de Promoção para Driver (T-17)', () => {
  afterAll(async () => {
    await prisma.refreshToken.deleteMany({
      where: { user: { email: { contains: 'driver_test_' } } }
    });
    await prisma.user.deleteMany({
      where: { email: { contains: 'driver_test_' } } }
    );
    await prisma.$disconnect();
  });

  async function registerAndLogin(suffix: string): Promise<string> {
    const email = `driver_test_${suffix}@example.com`;
    const password = 'password123';

    await request(app).post('/api/auth/register').send({
      name: 'Driver Test User',
      email,
      password,
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password,
    });

    return loginRes.body.accessToken;
  }

  it('Deve promover usuário a driver com pixKey no body (200)', async () => {
    const token = await registerAndLogin(`${Date.now()}_1`);

    if (!token) {
      throw new Error('No access token received');
    }

    const response = await request(app)
      .post('/api/users/me/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ pixKey: 'minhachavepix@email.com' });

    expect(response.status).toBe(200);
    expect(response.body.roles).toContain('DRIVER');
    expect(response.body.pixKey).toBe('minhachavepix@email.com');
    expect(response.body.balance).toBe('0');
  });

  it('Deve retornar erro 400 se usuário já é driver', async () => {
    const token = await registerAndLogin(`${Date.now()}_2`);

    await request(app)
      .post('/api/users/me/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ pixKey: 'chavepix@email.com' });

    const response = await request(app)
      .post('/api/users/me/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ pixKey: 'outrachavepix@email.com' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('User already is a DRIVER');
  });

  it('Deve retornar erro 401 se não autenticado', async () => {
    const response = await request(app)
      .post('/api/users/me/role')
      .send({ pixKey: 'testepix@email.com' });

    expect(response.status).toBe(401);
  });

  it('Deve usar pixKey existente do perfil se não enviar no body', async () => {
    const email = `driver_test_${Date.now()}_4@example.com`;
    const password = 'password123';

    await request(app).post('/api/auth/register').send({
      name: 'Driver Test User',
      email,
      password,
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password,
    });
    const token = loginRes.body.accessToken;

    await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ pixKey: 'chavejaexistente@email.com' });

    const promoteRes = await request(app)
      .post('/api/users/me/role')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(promoteRes.status).toBe(200);
    expect(promoteRes.body.pixKey).toBe('chavejaexistente@email.com');
  });

  it('Deve retornar erro 422 se não tiver pixKey', async () => {
    const token = await registerAndLogin(`${Date.now()}_5`);

    const response = await request(app)
      .post('/api/users/me/role')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('PIX key is required to become a driver');
  });
});