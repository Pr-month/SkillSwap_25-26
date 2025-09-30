import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { nestLoggerOptions } from './logger/nest-logger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import type { IAppConfig } from './config';
import { AllExpectionFilter } from './common/all-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  // Глобальный сериализатор для автоматического исключения полей с @Exclude()
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.useGlobalFilters(new AllExpectionFilter());

  // Статическая раздача файлов из папки public
  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/public/',
  });

  // Подключение swagger-документации. swagger-ui досутпен по адресу /docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SkillSwap API')
    .setDescription('API документация проекта SkillSwap')
    .setVersion('1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

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
