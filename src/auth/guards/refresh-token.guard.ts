import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { RefreshTokenUser, AuthGuardError } from '../interfaces/auth.interface';

@Injectable()
export class RefreshTokenGuard extends AuthGuard('refresh-token') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    // Проверяем наличие refresh token в body
    const refreshToken = request.body?.refreshToken;
    if (!refreshToken && refreshToken !== '') {
      throw new UnauthorizedException('Refresh token is required');
    }

    // Проверяем, что это строка
    if (typeof refreshToken !== 'string') {
      throw new UnauthorizedException('Refresh token must be a string');
    }

    // Проверяем, что токен не пустой
    if (refreshToken.trim().length === 0) {
      throw new UnauthorizedException('Refresh token cannot be empty');
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = RefreshTokenUser>(
    err: AuthGuardError | null,
    user: RefreshTokenUser | null,
    ...args: unknown[]
  ): TUser {
    // Игнорируем дополнительные аргументы
    void args;
    // Если есть ошибка или пользователь не найден
    if (err || !user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Проверяем, что это действительно refresh token
    if (user.tokenType && user.tokenType !== 'refresh') {
      throw new UnauthorizedException(
        'Invalid token type. Expected refresh token',
      );
    }

    return user as TUser;
  }
}
