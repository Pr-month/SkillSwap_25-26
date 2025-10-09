import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SkillsModule } from './skills/skills.module';
import { CategoriesModule } from './categories/categories.module';
import { WinstonModule } from 'nest-winston';
import {
  requestLoggerMiddleware,
  requestLoggerOptions,
} from './logger/request-logger.middleware';
import { FilesModule } from './files/files.module';
import {
  appConfig,
  jwtConfig,
  databaseConfig,
  yandexOAuthConfig,
} from './config';
import type { IJwtConfig, IDatabaseConfig } from './config';
import { RequestsModule } from './requests/requests.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, databaseConfig, yandexOAuthConfig],
      envFilePath: ['.env.test.local', '.env'],
      ignoreEnvFile: false,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [databaseConfig.KEY],
      useFactory: (config: IDatabaseConfig) => ({
        ...config,
        autoLoadEntities: true,
      }),
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
    UsersModule,
    AuthModule,
    SkillsModule,
    CategoriesModule,
    FilesModule,
    RequestsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(requestLoggerMiddleware).forRoutes('*');
  }
}
