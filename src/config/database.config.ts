import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

// Загружаем переменные окружения для скриптов
dotenv.config();

export const databaseConfig = registerAs(
  'DATABASE',
  (): DataSourceOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'skillswap',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV !== 'production', // Отключаем в продакшене
    // dropSchema: process.env.NODE_ENV === 'test', // Очищаем схему при тестах
  }),
);

// Создаем DataSource для скриптов
export const AppDataSource = new DataSource(databaseConfig());
