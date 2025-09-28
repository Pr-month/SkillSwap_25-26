import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Notification } from './entities/notification.entity';

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

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
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

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Сохраняем соединение пользователя
    this.userConnections.set(data.userId, client);
    client.join(`user_${data.userId}`);
    console.log(`User ${data.userId} joined notifications room`);
  }

  @SubscribeMessage('leave')
  handleLeave(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.userConnections.delete(data.userId);
    client.leave(`user_${data.userId}`);
    console.log(`User ${data.userId} left notifications room`);
  }

  // Метод для отправки уведомления конкретному пользователю
  sendNotificationToUser(userId: string, notification: Notification) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  // Метод для отправки уведомления всем подключенным пользователям
  broadcastNotification(notification: Notification) {
    this.server.emit('notification', notification);
  }
}
