import {
    Controller,
    Get,
    Patch,
    Param,
    UseGuards,
    Request,
    Query,
  } from '@nestjs/common';
  import { NotificationsService } from './notifications.service';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { AuthenticatedRequest } from '../auth/interfaces/auth.interface';
  
  @Controller('notifications')
  @UseGuards(JwtAuthGuard)
  export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}
  
    @Get()
    async getNotifications(
      @Request() req: AuthenticatedRequest,
      @Query('limit') limit?: number,
    ) {
      return this.notificationsService.findByUserId(req.user.userId, limit);
    }
  
    @Get('unread-count')
    async getUnreadCount(@Request() req: AuthenticatedRequest) {
      const count = await this.notificationsService.getUnreadCount(req.user.userId);
      return { count };
    }
  
    @Patch(':id/read')
    async markAsRead(
      @Param('id') id: string,
      @Request() req: AuthenticatedRequest,
    ) {
      await this.notificationsService.markAsRead(id, req.user.userId);
      return { message: 'Уведомление отмечено как прочитанное' };
    }
  
    @Patch('read-all')
    async markAllAsRead(@Request() req: AuthenticatedRequest) {
      await this.notificationsService.markAllAsRead(req.user.userId);
      return { message: 'Все уведомления отмечены как прочитанные' };
    }
  }