import { Module } from '@nestjs/common';
import { AuthTestController } from './auth-test.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { YandexTestStrategy } from './strategies/yandex-test.strategy';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthTestController],
  providers: [YandexTestStrategy],
  exports: [],
})
export class AuthTestModule {}
