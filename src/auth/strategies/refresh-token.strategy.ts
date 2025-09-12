import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
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
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request): string | null => {
          return (request?.cookies?.refreshToken as string) || null;
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
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // Проверяем, что это refresh токен
    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Неверный тип токена');
    }

    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    // TODO: Add refresh token validation against stored token in DB
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      refreshToken,
      tokenType: 'refresh' as const,
    };
  }
}
