import { AppDataSource } from '../config/database.config';
import { Request } from '../requests/entities/request.entity';
import { User } from '../users/entities/user.entity';
import { Skill } from '../skills/entities/skill.entity';
import { RequestStatus } from '../users/enums';

async function seedRequests() {
  try {
    console.log('🌱 Инициализация подключения к базе данных...');
    await AppDataSource.initialize();

    const requestRepo = AppDataSource.getRepository(Request);
    const userRepo = AppDataSource.getRepository(User);
    const skillRepo = AppDataSource.getRepository(Skill);

    const users = await userRepo.find({ take: 2 });
    const skills = await skillRepo.find({ take: 2 });

    if (users.length < 2 || skills.length < 2) {
      console.log('Недостаточно данных (пользователей) для создания заявок.');
      return;
    }

    console.log('Создание заявок...');

    const requestsData = [
      {
        sender: users[0],
        receiver: users[1],
        offeredSkill: skills[0],
        requestedSkill: skills[1],
        status: RequestStatus.PENDING,
      },
      {
        sender: users[1],
        receiver: users[0],
        offeredSkill: skills[1],
        requestedSkill: skills[0],
        status: RequestStatus.ACCEPTED,
      },
    ];

    for (const data of requestsData) {
      if (data.sender.id === data.receiver.id) {
        console.log(
          `Пропуск: ${data.sender.name} не может отправить заявку самому себе`,
        );
        continue;
      }

      const duplicate = await requestRepo.findOne({
        where: {
          sender: { id: data.sender.id },
          receiver: { id: data.receiver.id },
          offeredSkill: { id: data.offeredSkill.id },
          requestedSkill: { id: data.requestedSkill.id },
        },
        relations: ['sender', 'receiver', 'offeredSkill', 'requestedSkill'],
      });

      if (duplicate) {
        console.log(
          `Пропуск дубликата: ${data.sender.name} (${data.offeredSkill.title}) → ${data.receiver.name} (${data.requestedSkill.title})`,
        );
        continue;
      }

      const request = requestRepo.create(data);
      const saved = await requestRepo.save(request);
      console.log(
        `Заявка создана: ${saved.sender.name} → ${saved.receiver.name}`,
      );
    }

    console.log('Сидинг заявок завершен');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Ошибка при сидинге заявок:', error);
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    process.exit(1);
  }
}

void seedRequests();
