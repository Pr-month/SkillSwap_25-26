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

export const RegularUsersData = [
  {
    name: 'Иван Иванов',
    email: 'ivan@example.com',
    password: 'ivan123',
    about: 'Обычный тестовый пользователь',
    city: 'Санкт-Петербург',
    gender: Gender.MALE,
    role: UserRole.USER,
  },
  {
    name: 'Ольга Петрова',
    email: 'olga@example.com',
    password: 'user123',
    about: 'Еще один пользователь',
    city: 'Псков',
    gender: Gender.FEMALE,
    role: UserRole.USER,
  },
  {
    name: 'Кот Котовский',
    email: 'cat@example.com',
    password: 'cat123',
    about: 'Без кота жизнь не та',
    city: 'Зеленоградск',
    gender: Gender.MALE,
    role: UserRole.USER,
  },
];
