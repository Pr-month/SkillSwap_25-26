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
