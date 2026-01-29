import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationType } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;
  let gateway: NotificationsGateway;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockGateway = {
    emitToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
    gateway = module.get<NotificationsGateway>(NotificationsGateway);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create notification and emit via WebSocket', async () => {
      const dto = {
        userId: 'user-1',
        type: NotificationType.LIKE,
        title: 'New Like',
        message: 'Someone liked your post',
        data: { postId: 'post-1', actorId: 'actor-1' },
      };

      const createdNotification = {
        id: 'notif-1',
        ...dto,
        isRead: false,
        createdAt: new Date(),
      };

      mockPrismaService.notification.create.mockResolvedValue(createdNotification);

      const result = await service.create(dto);

      expect(result).toEqual(createdNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: dto.userId,
          type: dto.type,
          title: dto.title,
          message: dto.message,
        }),
      });
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        dto.userId,
        'notification',
        expect.objectContaining({
          id: 'notif-1',
          type: NotificationType.LIKE,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      const userId = 'user-1';
      const notifications = [
        { id: 'n1', type: NotificationType.LIKE, isRead: false },
        { id: 'n2', type: NotificationType.COMMENT, isRead: true },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(notifications);
      mockPrismaService.notification.count.mockResolvedValue(2);

      const result = await service.findAll(userId, { page: 1, limit: 10 });

      expect(result.data).toEqual(notifications);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should filter unread only when unreadOnly is true', async () => {
      const userId = 'user-1';

      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count.mockResolvedValue(0);

      await service.findAll(userId, { page: 1, limit: 10, unreadOnly: true });

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should cap limit at 100', async () => {
      const userId = 'user-1';

      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.notification.count.mockResolvedValue(0);

      const result = await service.findAll(userId, { page: 1, limit: 200 });

      expect(result.meta.limit).toBe(100);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(5);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = { id: 'n1', userId: 'user-1', isRead: false };

      mockPrismaService.notification.findUnique.mockResolvedValue(notification);
      mockPrismaService.notification.update.mockResolvedValue({
        ...notification,
        isRead: true,
      });

      const result = await service.markAsRead('n1', 'user-1');

      expect(result.isRead).toBe(true);
      expect(mockPrismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { isRead: true },
      });
    });

    it('should throw NotFoundException if notification not found', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('n1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if notification belongs to another user', async () => {
      const notification = { id: 'n1', userId: 'other-user', isRead: false };
      mockPrismaService.notification.findUnique.mockResolvedValue(notification);

      await expect(service.markAsRead('n1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ markedCount: 5 });
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should delete old read notifications', async () => {
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 10 });

      const result = await service.cleanupOldNotifications(30);

      expect(result).toEqual({ deletedCount: 10 });
      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          isRead: true,
          createdAt: { lt: expect.any(Date) },
        },
      });
    });
  });
});
