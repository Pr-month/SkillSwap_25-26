import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database.config';
import { User } from '../users/entities/user.entity';
import { AdminUserData } from './users.data';

async function seed() {
  try {
    console.log('🌱 Инициализация подключения к базе данных...');
    await AppDataSource.initialize();

    const userRepo = AppDataSource.getRepository(User);

    // Проверяем, есть ли уже пользователи в базе данных
    const existing = await userRepo.count();
    if (existing > 0) {
      console.log(
        '👥 Пользователи уже существуют в базе данных. Пропускаем сидинг.',
      );
      await AppDataSource.destroy();
      return;
    }

    console.log('👤 Создание администратора...');

    // Хешируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      AdminUserData.password,
      saltRounds,
    );

    // Создаем пользователя-администратора
    const adminUser = new User();
    adminUser.name = AdminUserData.name;
    adminUser.email = AdminUserData.email;
    adminUser.password = hashedPassword;
    adminUser.about = AdminUserData.about;
    adminUser.city = AdminUserData.city;
    adminUser.gender = AdminUserData.gender;
    adminUser.role = AdminUserData.role;

    const savedAdmin = await userRepo.save(adminUser);
    console.log(
      `✅ Создан администратор: ${savedAdmin.name} (${savedAdmin.email})`,
    );

    console.log('🎉 Сидинг пользователей успешно завершен!');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Ошибка при выполнении сидинга пользователей:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

void seed();
