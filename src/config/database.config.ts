import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('DATABASE', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'skillswap',
  synchronize: process.env.NODE_ENV !== 'production', // Отключаем в продакшене
}));
