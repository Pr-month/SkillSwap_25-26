import { ConfigType } from '@nestjs/config';
import { appConfig } from './app.config';
import { jwtConfig } from './jwt.config';
import { databaseConfig } from './database.config';

// Тип конфигурации приложения
export type IAppConfig = ConfigType<typeof appConfig>;

// Тип конфигурации JWT
export type IJwtConfig = ConfigType<typeof jwtConfig>;

// Тип конфигурации базы данных
export type IDatabaseConfig = ConfigType<typeof databaseConfig>;
