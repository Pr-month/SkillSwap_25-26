import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../interfaces/auth.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Получаем необходимые роли из декоратора @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Если роли не указаны, разрешаем доступ
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Получаем пользователя из запроса
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    // Если пользователь не аутентифицирован, запрещаем доступ
    if (!user) {
      throw new ForbiddenException('Пользователь не аутентифицирован');
    }

    // Проверяем, есть ли у пользователя необходимая роль
    const hasRole = requiredRoles.some((role) => user.role === role.toString());

    if (!hasRole) {
      throw new ForbiddenException(
        `Недостаточно прав. Требуемые роли: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
