import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const { userId, type, title, message, data } = createNotificationDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    const notification = this.notificationRepository.create({
      user,
      type,
      title,
      message,
      data,
      isRead: false,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);

    // Отправляем уведомление через WebSocket
    this.notificationsGateway.sendNotificationToUser(userId, savedNotification);

    return savedNotification;
  }

  async findByUserId(userId: string, limit = 50): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.notificationRepository.update(
      { id, user: { id: userId } },
      { isRead: true },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { user: { id: userId }, isRead: false },
    });
  }

  // Методы для создания специфичных уведомлений
  async createRequestNotification(
    receiverId: string,
    senderName: string,
    skillName: string,
    requestId: string,
  ): Promise<Notification> {
    return this.create({
      userId: receiverId,
      type: NotificationType.REQUEST_CREATED,
      title: 'Новая заявка на обмен',
      message: `${senderName} хочет обменяться навыком "${skillName}"`,
      data: { requestId, senderName, skillName },
    });
  }

  async createRequestStatusNotification(
    userId: string,
    status: 'accepted' | 'rejected',
    skillName: string,
    requestId: string,
  ): Promise<Notification> {
    const type =
      status === 'accepted'
        ? NotificationType.REQUEST_ACCEPTED
        : NotificationType.REQUEST_REJECTED;

    const title =
      status === 'accepted' ? 'Заявка принята!' : 'Заявка отклонена';

    const message =
      status === 'accepted'
        ? `Ваша заявка на обмен навыком "${skillName}" была принята`
        : `Ваша заявка на обмен навыком "${skillName}" была отклонена`;

    return this.create({
      userId,
      type,
      title,
      message,
      data: { requestId, skillName, status },
    });
  }
}
