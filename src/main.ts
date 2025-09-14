import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { nestLoggerOptions } from './logger/nest-logger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import type { IAppConfig } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(nestLoggerOptions),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Статическая раздача файлов из папки public
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });

  // Получаем типизированный конфиг приложения
  const configService = app.get(ConfigService);
  const appConfigData = configService.get<IAppConfig>('APP');

  if (!appConfigData) {
    throw new Error('App config not found');
  }

  await app.listen(appConfigData.port);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
