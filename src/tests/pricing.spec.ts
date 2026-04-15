import request from 'supertest';
import { app } from '../app';
import { PricingService } from '../services/pricing.service';

describe('Pricing Service (T13)', () => {
  describe('calculatePrice', () => {
    it('Deve calcular o preço corretamente para 10km com 4 assentos', () => {
      const result = PricingService.calculatePrice({
        distanceKm: 10,
        availableSeats: 4
      });

      expect(result.baseRate).toBe(3.0);
      expect(result.distanceCost).toBe(5.0);
      expect(result.totalCost).toBe(8.0);
      expect(result.appFee).toBe(0.8);
      expect(result.driverEarnings).toBe(7.2);
      expect(result.costPerSeat).toBe(2.0);
      expect(result.availableSeats).toBe(4);
    });

    it('Deve calcular o preço corretamente para 0km (taxa base apenas)', () => {
      const result = PricingService.calculatePrice({
        distanceKm: 0,
        availableSeats: 2
      });

      expect(result.baseRate).toBe(3.0);
      expect(result.distanceCost).toBe(0);
      expect(result.totalCost).toBe(3.0);
      expect(result.appFee).toBe(0.3);
      expect(result.driverEarnings).toBe(2.7);
      expect(result.costPerSeat).toBe(1.5);
    });

    it('Deve calcular o preço corretamente para distancia grande', () => {
      const result = PricingService.calculatePrice({
        distanceKm: 100,
        availableSeats: 3
      });

      expect(result.baseRate).toBe(3.0);
      expect(result.distanceCost).toBe(50.0);
      expect(result.totalCost).toBe(53.0);
      expect(result.appFee).toBe(5.3);
      expect(result.driverEarnings).toBe(47.7);
      expect(result.costPerSeat).toBe(17.67);
    });

    it('Deve lancar erro para distancia negativa', () => {
      expect(() =>
        PricingService.calculatePrice({
          distanceKm: -5,
          availableSeats: 4
        })
      ).toThrow('Distance must be non-negative');
    });

    it('Deve lancar erro para zero assentos', () => {
      expect(() =>
        PricingService.calculatePrice({
          distanceKm: 10,
          availableSeats: 0
        })
      ).toThrow('Available seats must be at least 1');
    });

    it('Deve lancar erro para assentos negativos', () => {
      expect(() =>
        PricingService.calculatePrice({
          distanceKm: 10,
          availableSeats: -1
        })
      ).toThrow('Available seats must be at least 1');
    });
  });

  describe('getPricingConfig', () => {
    it('Deve retornar a configuracao atual de precificacao', () => {
      const config = PricingService.getPricingConfig();

      expect(config).toHaveProperty('baseRate');
      expect(config).toHaveProperty('perKm');
      expect(config).toHaveProperty('appFeePercent');
      expect(typeof config.baseRate).toBe('number');
      expect(typeof config.perKm).toBe('number');
      expect(typeof config.appFeePercent).toBe('number');
    });
  });
});

describe('Pricing Routes (T13)', () => {
  describe('POST /api/pricing/calculate', () => {
    it('Deve retornar 200 e calcular preco para entrada valida', async () => {
      const response = await request(app).post('/api/pricing/calculate').send({
        distanceKm: 15,
        availableSeats: 3
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('baseRate');
      expect(response.body).toHaveProperty('distanceCost');
      expect(response.body).toHaveProperty('totalCost');
      expect(response.body).toHaveProperty('appFee');
      expect(response.body).toHaveProperty('driverEarnings');
      expect(response.body).toHaveProperty('costPerSeat');
      expect(response.body.totalCost).toBe(10.5);
    });

    it('Deve retornar 400 para distancia negativa', async () => {
      const response = await request(app).post('/api/pricing/calculate').send({
        distanceKm: -5,
        availableSeats: 4
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid input');
      expect(response.body).toHaveProperty('errors');
    });

    it('Deve retornar 400 para assentos zero', async () => {
      const response = await request(app).post('/api/pricing/calculate').send({
        distanceKm: 10,
        availableSeats: 0
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid input');
    });

    it('Deve retornar 400 para entrada sem campos obrigatorios', async () => {
      const response = await request(app)
        .post('/api/pricing/calculate')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid input');
    });

    it('Deve retornar 400 para distancia como string', async () => {
      const response = await request(app).post('/api/pricing/calculate').send({
        distanceKm: 'dez',
        availableSeats: 4
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/pricing/config', () => {
    it('Deve retornar 200 com a configuracao de precificacao', async () => {
      const response = await request(app).get('/api/pricing/config');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('baseRate');
      expect(response.body).toHaveProperty('perKm');
      expect(response.body).toHaveProperty('appFeePercent');
    });
  });
});
