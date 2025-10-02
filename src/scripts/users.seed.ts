import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database.config';
import { User } from '../users/entities/user.entity';
import { RegularUsersData } from './users.data';

async function seedTestUsers() {
  try {
    console.log('🌱 Инициализация подключения к базе данных...');
    await AppDataSource.initialize();

    const userRepo = AppDataSource.getRepository(User);

    const saltRounds = 10;

    console.log('👤 Создание обычных пользователей...');

    for (const RegularUserData of RegularUsersData) {
      const existingUser = await userRepo.findOne({
        where: { email: RegularUserData.email },
      });

      if (existingUser) {
        console.log(`пользователь уже существует: ${existingUser.email}`);
        continue;
      }

      const hashedPasswordUser = await bcrypt.hash(
        RegularUserData.password,
        saltRounds,
      );

      const regularUser = new User();
      regularUser.name = RegularUserData.name;
      regularUser.email = RegularUserData.email;
      regularUser.password = hashedPasswordUser;
      regularUser.about = RegularUserData.about;
      regularUser.city = RegularUserData.city;
      regularUser.gender = RegularUserData.gender;
      regularUser.role = RegularUserData.role;

      const savedUser = await userRepo.save(regularUser);
      console.log(
        `✅ Создан пользователь: ${savedUser.name} (${savedUser.email})`,
      );
    }

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

void seedTestUsers();
