import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/enums';

export const ROLES_KEY = 'roles';

/**
 * Декоратор для указания необходимых ролей для доступа к эндпоинту
 * @param roles - массив ролей, которые имеют доступ к эндпоинту
 * @example
 * @Roles(UserRole.ADMIN)
 * @Roles(UserRole.USER, UserRole.ADMIN)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
