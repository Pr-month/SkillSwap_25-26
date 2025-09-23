import { UserRole, Gender } from '../users/enums';

export const AdminUserData = {
  name: 'Администратор',
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'admin123',
  about: 'Администратор платформы SkillSwap',
  city: 'Москва',
  gender: Gender.MALE,
  role: UserRole.ADMIN,
};

export const RegularUserData = {
  name: 'Иван Иванов',
  email: 'user@example.com',
  password: 'user123',
  about: 'Обычный тестовый пользователь',
  city: 'Санкт-Петербург',
  gender: Gender.MALE,
  role: UserRole.USER,
};
