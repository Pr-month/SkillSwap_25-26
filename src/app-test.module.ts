import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthTestModule } from './auth/auth-test.module';
import { WinstonModule } from 'nest-winston';
import {
  requestLoggerMiddleware,
  requestLoggerOptions,
} from './logger/request-logger.middleware';
import { appConfig, jwtConfig, yandexOAuthConfig } from './config';
import type { IJwtConfig } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, yandexOAuthConfig],
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [jwtConfig.KEY],
      useFactory: (config: IJwtConfig) => ({
        secret: config.accessSecret,
        signOptions: {
          expiresIn: config.accessExpiration,
        },
      }),
    }),
    WinstonModule.forRoot(requestLoggerOptions),
    AuthTestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppTestModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(requestLoggerMiddleware).forRoutes('*');
  }
}
