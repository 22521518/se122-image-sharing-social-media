import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    findAll: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  };

  const mockRequest = {
    user: { sub: 'user-1' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      const result = {
        data: [{ id: 'n1', type: NotificationType.LIKE }],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
      mockNotificationsService.findAll.mockResolvedValue(result);

      const response = await controller.findAll(mockRequest, 1, 20, undefined);

      expect(response).toEqual(result);
      expect(mockNotificationsService.findAll).toHaveBeenCalledWith('user-1', {
        page: 1,
        limit: 20,
        unreadOnly: false,
      });
    });

    it('should pass unreadOnly=true when query param is "true"', async () => {
      mockNotificationsService.findAll.mockResolvedValue({ data: [], meta: {} });

      await controller.findAll(mockRequest, 1, 20, 'true');

      expect(mockNotificationsService.findAll).toHaveBeenCalledWith('user-1', {
        page: 1,
        limit: 20,
        unreadOnly: true,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(5);

      const response = await controller.getUnreadCount(mockRequest);

      expect(response).toEqual({ count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = { id: 'n1', isRead: true };
      mockNotificationsService.markAsRead.mockResolvedValue(notification);

      const response = await controller.markAsRead('n1', mockRequest);

      expect(response).toEqual(notification);
      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith(
        'n1',
        'user-1',
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue({ markedCount: 3 });

      const response = await controller.markAllAsRead(mockRequest);

      expect(response).toEqual({ markedCount: 3 });
    });
  });
});
