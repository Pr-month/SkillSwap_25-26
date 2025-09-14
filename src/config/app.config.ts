import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('APP', () => ({
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
}));
