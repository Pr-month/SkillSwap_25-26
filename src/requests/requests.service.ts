import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Request } from './entities/request.entity';
import { User } from '../users/entities/user.entity';
import { Skill } from '../skills/entities/skill.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestStatus } from '../users/enums';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request)
    private requestRepository: Repository<Request>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async create(
    createRequestDto: CreateRequestDto,
    senderId: string,
  ): Promise<Request> {
    const { offeredSkillId, requestedSkillId } = createRequestDto;

    // Проверяем, что пользователь не отправляет заявку самому себе
    if (offeredSkillId === requestedSkillId) {
      throw new BadRequestException(
        'Нельзя отправить заявку на обмен одного и того же навыка',
      );
    }

    // Получаем навыки с их владельцами
    const offeredSkill = await this.skillRepository.findOne({
      where: { id: offeredSkillId },
      relations: ['owner'],
    });

    const requestedSkill = await this.skillRepository.findOne({
      where: { id: requestedSkillId },
      relations: ['owner'],
    });

    // Проверяем существование навыков
    if (!offeredSkill) {
      throw new NotFoundException('Предлагаемый навык не найден');
    }

    if (!requestedSkill) {
      throw new NotFoundException('Запрашиваемый навык не найден');
    }

    // Проверяем, что предлагаемый навык принадлежит отправителю
    if (offeredSkill.owner.id !== senderId) {
      throw new ForbiddenException('Вы можете предлагать только свои навыки');
    }

    // Проверяем, что запрашиваемый навык не принадлежит отправителю
    if (requestedSkill.owner.id === senderId) {
      throw new BadRequestException(
        'Нельзя отправить заявку на обмен самому себе',
      );
    }

    // Получаем получателя заявки (владельца запрашиваемого навыка)
    const receiver = requestedSkill.owner;

    // Создаем заявку
    const request = this.requestRepository.create({
      sender: { id: senderId } as User,
      receiver: { id: receiver.id } as User,
      offeredSkill: offeredSkill,
      requestedSkill: requestedSkill,
      status: RequestStatus.PENDING,
      isRead: false,
    });

    // Сохраняем заявку
    const savedRequest = await this.requestRepository.save(request);

    // Возвращаем заявку с полной информацией
    const result = await this.requestRepository.findOne({
      where: { id: savedRequest.id },
      relations: ['sender', 'receiver', 'offeredSkill', 'requestedSkill'],
    });

    if (!result) {
      throw new NotFoundException('Ошибка при создании заявки');
    }

    // Отправляем уведомление получателю о новой заявке
    this.notificationsGateway.notifyNewRequest(receiver.id, {
      fromUserId: senderId,
      skillTitle: requestedSkill.title,
      message: `Поступила новая заявка от пользователя ${senderId}`,
    });

    return result;
  }

  async getIncomingRequests(userId: string): Promise<Request[]> {
    return this.requestRepository.find({
      where: {
        receiver: { id: userId },
        status: RequestStatus.PENDING,
      },
      relations: ['sender', 'receiver', 'offeredSkill', 'requestedSkill'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getOutgoingRequests(userId: string): Promise<Request[]> {
    return this.requestRepository.find({
      where: {
        sender: { id: userId },
        status: In([RequestStatus.PENDING, RequestStatus.IN_PROGRESS]),
      },
      relations: ['sender', 'receiver', 'offeredSkill', 'requestedSkill'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async remove(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<{ message: string }> {
    // Получаем заявку с информацией об отправителе
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['sender'],
    });

    // Проверяем существование заявки
    if (!request) {
      throw new NotFoundException(`Заявка с ID ${id} не найдена`);
    }

    // Проверяем права доступа:
    // - Админ может удалять все заявки
    // - Пользователь может удалять только свои заявки
    if (userRole !== 'admin' && request.sender.id !== userId) {
      throw new ForbiddenException('У вас нет прав на удаление этой заявки');
    }

    // Удаляем заявку из базы данных
    const result = await this.requestRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Заявка с ID ${id} не найдена`);
    }

    return { message: 'Заявка успешно удалена' };
  }

  async update(
    id: string,
    updateRequestDto: UpdateRequestDto,
    userId: string,
    userRole: string,
  ): Promise<{ message: string }> {
    // Находим заявку БЕЗ relations (только для проверки прав)
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['sender', 'receiver', 'offeredSkill', 'requestedSkill'],
    });

    if (!request) {
      throw new NotFoundException('Заявка не найдена');
    }

    // Проверяем права доступа: только получатель, отправитель или админ могут обновлять заявку
    const isReceiver = request.receiver.id === userId;
    const isSender = request.sender.id === userId;
    const isAdmin = userRole === 'admin';

    if (!isReceiver && !isSender && !isAdmin) {
      throw new ForbiddenException('У вас нет прав для обновления этой заявки');
    }

    // Обновляем только нужные поля через update (более эффективно)
    await this.requestRepository.update(id, {
      ...(updateRequestDto.isRead !== undefined && {
        isRead: updateRequestDto.isRead,
      }),
      ...(updateRequestDto.status !== undefined && {
        status: updateRequestDto.status,
      }),
    });

    // Отправка уведомлений по статусам
    if (updateRequestDto.status === RequestStatus.ACCEPTED) {
      this.notificationsGateway.notifyAcceptedRequest(request.sender.id, {
        fromUserId: request.receiver.id,
        skillTitle: request.requestedSkill.title,
        message: 'Ваша заявка была принята',
      });
    }

    if (updateRequestDto.status === RequestStatus.REJECTED) {
      this.notificationsGateway.notifyRejectedRequest(request.sender.id, {
        fromUserId: request.receiver.id,
        skillTitle: request.requestedSkill.title,
        message: 'Ваша заявка была отклонена',
      });
    }

    return { message: 'Заявка успешно обновлена' };
  }
}
