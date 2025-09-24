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

    // Проверяем наличие refresh token в заголовке Authorization: Bearer <token>
    const authHeader = request.headers?.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Authorization header is required');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header must be Bearer token',
      );
    }

    const token = authHeader.slice(7).trim();
    if (token.length === 0) {
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
