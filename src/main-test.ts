import { NestFactory } from '@nestjs/core';
import { AppTestModule } from './app-test.module';

async function bootstrap() {
  const app = await NestFactory.create(AppTestModule);

  // Настройка CORS для тестирования
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Test server running on http://localhost:${port}`);
  console.log(`📋 Test endpoints:`);
  console.log(`   - GET http://localhost:${port}/auth-test/config`);
  console.log(`   - GET http://localhost:${port}/auth-test/yandex-url`);
  console.log(`   - GET http://localhost:${port}/auth/yandex/login`);
}

bootstrap();
