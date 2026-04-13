import 'dotenv/config';

interface Config {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  MAIL_FROM: string;
  RESEND_API_KEY: string;
  GOOGLE_MAPS_API_KEY: string;
  PRICING_BASE_RATE: number;
  PRICING_PER_KM: number;
  PRICING_APP_FEE_PERCENT: number;
}

const config: Config = {
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  MAIL_FROM: process.env.MAIL_FROM || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
  PRICING_BASE_RATE: Number(process.env.PRICING_BASE_RATE) || 3.00,
  PRICING_PER_KM: Number(process.env.PRICING_PER_KM) || 0.50,
  PRICING_APP_FEE_PERCENT: Number(process.env.PRICING_APP_FEE_PERCENT) || 10,
};

export { config };
