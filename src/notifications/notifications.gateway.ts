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
import { JwtWsGuard } from './guards/ws-jwt.guard';

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
    const authedClient = await this.jwtWsGuard.verify(client);
    const userId = authedClient.data.user.userId;
    this.userConnections.set(userId, authedClient);
    void authedClient.join(`user_${userId}`);
    console.log(`Client connected: ${client.id} as user ${userId}`);
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
  handleLeave(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.userConnections.delete(data.userId);
    void client.leave(`user_${data.userId}`);
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
