/**
 * Notification Service
 * 
 * API client for notification-related endpoints
 */

import { ApiService } from './api.service';

export enum NotificationType {
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  FOLLOW = 'FOLLOW',
  SYSTEM_WARN = 'SYSTEM_WARN',
  ADMIN_INFO = 'ADMIN_INFO',
  POSTCARD_RECEIVED = 'POSTCARD_RECEIVED',
  POSTCARD_UNLOCKED = 'POSTCARD_UNLOCKED',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_ACCEPTED = 'FRIEND_ACCEPTED',
}


export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  data: Notification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkAllReadResponse {
  markedCount: number;
}

export class NotificationService {
  /**
   * Get paginated list of notifications
   */
  static async getNotifications(
    token: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ): Promise<NotificationListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(unreadOnly && { unreadOnly: 'true' }),
    });

    return ApiService.get<NotificationListResponse>(
      `/api/notifications?${params.toString()}`,
      token,
    );
  }

  /**
   * Get count of unread notifications
   */
  static async getUnreadCount(token: string): Promise<number> {
    const response = await ApiService.get<UnreadCountResponse>(
      '/api/notifications/unread-count',
      token,
    );
    return response.count;
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(token: string, notificationId: string): Promise<Notification> {
    return ApiService.patch<unknown, Notification>(
      `/api/notifications/${notificationId}/read`,
      {},
      token,
    );
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(token: string): Promise<MarkAllReadResponse> {
    return ApiService.patch<unknown, MarkAllReadResponse>(
      '/api/notifications/read-all',
      {},
      token,
    );
  }
}
