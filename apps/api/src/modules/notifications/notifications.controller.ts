import { Controller, Get, Post, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, TenantId } from '../../common/decorators/user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @CurrentUser('id') userId: string, @Query() query: any) {
    return this.notificationsService.findAll(tenantId, userId, query);
  }

  @Get('unread-count')
  getUnreadCount(@TenantId() tenantId: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(tenantId, userId);
  }

  @Patch('mark-all-read')
  markAllRead(@TenantId() tenantId: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markAsRead(tenantId, userId);
  }

  @Patch(':id/read')
  markRead(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(tenantId, userId, id);
  }
}
