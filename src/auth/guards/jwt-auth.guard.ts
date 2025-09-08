import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Определяем тип пользователя, который будет возвращать JWT стратегия
interface JwtUser {
  userId: number;
  email: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Переопределяем обработку ошибок
  handleRequest<T = JwtUser>(err: Error, user: T): T {
    // Если есть ошибка или пользователь не найден, выбрасываем исключение
    if (err || !user) {
      throw new UnauthorizedException('Пожалуйста, авторизуйтесь для доступа');
    }
    return user;
  }
}
