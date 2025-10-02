import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { JwtWsGuard } from './guards/ws-jwt.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User]), UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, JwtWsGuard],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
