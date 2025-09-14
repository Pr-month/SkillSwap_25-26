import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import {
  RefreshTokenPayload,
  RefreshTokenUser,
} from '../interfaces/auth.interface';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-token',
) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): string | null => {
          return (request?.body?.refreshToken as string) || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_REFRESH_SECRET') ||
        'default-refresh-secret',
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: RefreshTokenPayload,
  ): Promise<RefreshTokenUser> {
    const refreshToken = req.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // Проверяем, что это refresh токен
    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Неверный тип токена');
    }

    // Валидируем токен против БД
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isActive: true },
      relations: ['user'],
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Проверяем срок действия токена
    if (new Date() > tokenEntity.expiresAt) {
      // Деактивируем просроченный токен
      tokenEntity.isActive = false;
      await this.refreshTokenRepository.save(tokenEntity);
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      refreshToken,
      tokenType: 'refresh' as const,
    };
  }
}
