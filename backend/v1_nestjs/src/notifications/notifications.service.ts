import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import { NotificationsGateway } from './notifications.gateway';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  actorId?: string; // Optional actor ID to prevent self-notifications
}

export interface NotificationListQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * NotificationsService
 *
 * Handles notification CRUD operations and real-time delivery.
 * Creates notifications in the database and pushes to connected WebSocket clients.
 *
 * @see Story 9.1: Notification Infrastructure
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) { }

  /**
   * Create a notification and push via WebSocket if user is online
   * @param dto Notification data
   * @returns Created notification or null if self-notification blocked
   */
  async create(dto: CreateNotificationDto) {
    // Prevent self-notifications centrally
    // Check both explicit actorId and actorId inside data payload
    const actorId = dto.actorId || (dto.data as any)?.actorId;

    if (actorId && actorId === dto.userId) {
      this.logger.debug(`Blocked self-notification for user ${dto.userId}`);
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        // ... rest of data
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data as Prisma.InputJsonValue,
      },
    });

    // Push via WebSocket to connected client
    this.gateway.emitToUser(dto.userId, 'notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    });

    this.logger.debug(`Created notification ${notification.id} for user ${dto.userId}`);
    return notification;
  }

  /**
   * Get paginated list of notifications for a user (sorted by date desc)
   * AC7: Paginated list for offline viewing
   */
  async findAll(userId: string, query: NotificationListQuery) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark a single notification as read
   * AC8: Mark as read
   */
  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   * AC8: Mark all as read
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { markedCount: result.count };
  }

  /**
   * Delete old read notifications (cleanup utility)
   * @param daysOld Delete notifications older than this many days
   */
  async cleanupOldNotifications(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old notifications`);
    return { deletedCount: result.count };
  }
}
