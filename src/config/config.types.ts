import { ConfigType } from '@nestjs/config';
import { appConfig } from './app.config';
import { jwtConfig } from './jwt.config';
import { databaseConfig } from './database.config';
import { yandexOAuthConfig } from './yandex-oauth.config';

// Тип конфигурации приложения
export type IAppConfig = ConfigType<typeof appConfig>;

// Тип конфигурации JWT
export type IJwtConfig = ConfigType<typeof jwtConfig>;

// Тип конфигурации базы данных
export type IDatabaseConfig = ConfigType<typeof databaseConfig>;

// Тип конфигурации Яндекс OAuth
export type IYandexOAuthConfig = ConfigType<typeof yandexOAuthConfig>;
