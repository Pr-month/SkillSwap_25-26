import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Notification } from './entities/notification.entity';
import { JwtWsGuard, SocketWithUser } from './guards/ws-jwt.guard';

export interface NotificationPayload {
  type: 'new' | 'accepted' | 'rejected';
  skillTitle: string;
  fromUserId: string;
  message?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userConnections = new Map<string, Socket>();

  constructor(private readonly jwtWsGuard: JwtWsGuard) {}

  async handleConnection(client: Socket) {
    try {
      const authedClient = await this.jwtWsGuard.verify(client);
      const userId = authedClient.data.user.userId;
      this.userConnections.set(userId, authedClient);
      void authedClient.join(`user_${userId}`);
      console.log(`Client connected: ${client.id} as user ${userId}`);
    } catch {
      // Если авторизация не прошла — отключаем клиента
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Удаляем соединение из карты
    for (const [userId, socket] of this.userConnections.entries()) {
      if (socket.id === client.id) {
        this.userConnections.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: Socket) {
    // Получаем userId из авторизованных данных клиента
    const userId = (client as SocketWithUser).data?.user?.userId;

    if (!userId) {
      console.log(
        `Client ${client.id} attempted to leave without proper authentication`,
      );
      return;
    }

    this.userConnections.delete(userId);
    void client.leave(`user_${userId}`);
    console.log(`User ${userId} left notifications room`);
  }

  // Метод для отправки уведомления конкретному пользователю (в комнату user_<id>)
  notifyUser(userId: string, payload: NotificationPayload) {
    this.server.to(`user_${userId}`).emit('notificateNewRequest', payload);
  }

  // Удобные методы под конкретные статусы
  notifyNewRequest(userId: string, payload: Omit<NotificationPayload, 'type'>) {
    this.notifyUser(userId, { type: 'new', ...payload });
  }

  notifyAcceptedRequest(
    userId: string,
    payload: Omit<NotificationPayload, 'type'>,
  ) {
    this.notifyUser(userId, { type: 'accepted', ...payload });
  }

  notifyRejectedRequest(
    userId: string,
    payload: Omit<NotificationPayload, 'type'>,
  ) {
    this.notifyUser(userId, { type: 'rejected', ...payload });
  }

  // Метод для отправки уведомления конкретному пользователю (legacy)
  sendNotificationToUser(userId: string, notification: Notification) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  // Метод для отправки уведомления всем подключенным пользователям
  broadcastNotification(notification: Notification) {
    this.server.emit('notification', notification);
  }
}
