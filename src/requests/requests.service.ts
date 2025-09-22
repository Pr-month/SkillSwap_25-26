import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from './entities/request.entity';
import { User } from '../users/entities/user.entity';
import { Skill } from '../skills/entities/skill.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestStatus } from '../users/enums';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request)
    private requestRepository: Repository<Request>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Skill)
    private skillRepository: Repository<Skill>,
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

    return result;
  }

  async update(
    id: string,
    updateRequestDto: UpdateRequestDto,
    userId: string,
    userRole: string,
  ): Promise<Request> {
    // Находим заявку с полной информацией
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

    // Обновляем поля
    if (updateRequestDto.isRead !== undefined) {
      request.isRead = updateRequestDto.isRead;
    }

    if (updateRequestDto.status !== undefined) {
      request.status = updateRequestDto.status;
    }

    // Сохраняем изменения
    const updatedRequest = await this.requestRepository.save(request);

    // Возвращаем обновленную заявку с полной информацией
    const result = await this.requestRepository.findOne({
      where: { id: updatedRequest.id },
      relations: ['sender', 'receiver', 'offeredSkill', 'requestedSkill'],
    });

    if (!result) {
      throw new NotFoundException('Ошибка при обновлении заявки');
    }

    return result;
  }
}
