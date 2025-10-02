import { AppDataSource } from '../config/database.config';
import { Skill } from '../skills/entities/skill.entity';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/categories.entity';
import { RegularUsersData } from './users.data';

async function seedSkills() {
  try {
    await AppDataSource.initialize();

    const skillRepo = AppDataSource.getRepository(Skill);
    const userRepo = AppDataSource.getRepository(User);
    const categoryRepo = AppDataSource.getRepository(Category);

    const owners = await userRepo.find({
      where: RegularUsersData.map((user) => ({ email: user.email })),
    });

    if (owners.length < RegularUsersData.length) {
      throw new Error(
        'Не все тестовые пользователи найдены. Сначала запусти сидинг пользователей.',
      );
    }

    const frontend = await categoryRepo.findOne({
      where: { name: 'Frontend' },
    });
    const photo = await categoryRepo.findOne({ where: { name: 'Фотография' } });
    const guitar = await categoryRepo.findOne({ where: { name: 'Гитара' } });

    if (!frontend || !photo || !guitar) {
      throw new Error(
        'Одна или несколько категорий не найдены. Сначала запусти сидинг категорий.',
      );
    }

    const skillsData = [
      {
        title: 'React разработка',
        description: 'Создание приложений на React',
        owner: owners[0],
        category: frontend,
      },
      {
        title: 'Фотосъёмка',
        description: 'Портретная и пейзажная съёмка',
        owner: owners[1],
        category: photo,
      },
      {
        title: 'Игра на гитаре',
        description: 'Обучение игре на гитаре с нуля',
        owner: owners[2],
        category: guitar,
      },
    ];

    for (const data of skillsData) {
      const existing = await skillRepo.findOne({
        where: { title: data.title },
      });
      if (existing) {
        console.log(`Навык уже существует: ${data.title}`);
        continue;
      }

      const skill = skillRepo.create({
        ...data,
        category: data.category,
      });

      await skillRepo.save(skill);
      console.log(`Навык создан: ${data.title}`);
    }
  } catch (err) {
    console.error('Ошибка при сидинге skills:', err);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}

void seedSkills();
