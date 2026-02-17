import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth-core/guards/jwt-auth.guard';

/**
 * NotificationsController
 *
 * REST API endpoints for notification management.
 * Provides paginated list retrieval and mark-as-read functionality.
 *
 * @see Story 9.1: Notification Infrastructure (Task 2)
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  /**
   * GET /notifications
   * AC7: Paginated list of notifications sorted by date desc
   */
  @Get()
  async findAll(
    @Request() req: { user: { id: string } },
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findAll(req.user.id, {
      page,
      limit,
      unreadOnly: unreadOnly === 'true',
    });
  }

  /**
   * GET /notifications/unread-count
   * Quick count of unread notifications for UI badge
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req: { user: { id: string } }) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  /**
   * PATCH /notifications/:id/read
   * AC8: Mark a single notification as read
   */
  @Patch(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  /**
   * PATCH /notifications/read-all
   * AC8: Mark all notifications as read
   */
  @Patch('read-all')
  async markAllAsRead(@Request() req: { user: { id: string } }) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }
}
