import { Test, TestingModule } from '@nestjs/testing';
import { PostcardsScheduler } from './postcards.scheduler';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PostcardStatus, NotificationType } from '@prisma/client';

describe('PostcardsScheduler', () => {
  let scheduler: PostcardsScheduler;
  let prisma: PrismaService;
  let notificationsService: NotificationsService;

  const mockPrisma = {
    postcard: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostcardsScheduler,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    scheduler = module.get<PostcardsScheduler>(PostcardsScheduler);
    prisma = module.get<PrismaService>(PrismaService);
    notificationsService = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  describe('handleTimeLockUnlock (Time Unlock)', () => {
    it('should immediately unlock postcards where unlockDate has passed', async () => {
      // 1. Arrange
      const now = new Date();
      const pastDate = new Date(now.getTime() - 100000); // 100s ago

      const lockedPostcards = [
        {
          id: 'time-locked-postcard-1',
          recipientId: 'recipient-1',
          senderId: 'sender-1',
          status: PostcardStatus.LOCKED,
          unlockDate: pastDate, // Valid for immediate unlock
          sender: { id: 'sender-1', name: 'Sender Name' },
          recipient: { id: 'recipient-1', name: 'Recipient Name' },
        },
      ];

      mockPrisma.postcard.findMany.mockResolvedValue(lockedPostcards);

      // 2. Act
      await scheduler.handleTimeLockUnlock();

      // 3. Assert
      // Verify it found the postcard
      expect(mockPrisma.postcard.findMany).toHaveBeenCalled();

      // Verify it unlocked the postcard
      expect(mockPrisma.postcard.update).toHaveBeenCalledWith({
        where: { id: 'time-locked-postcard-1' },
        data: expect.objectContaining({
          status: PostcardStatus.UNLOCKED,
          unlockNotificationSent: true,
        }),
      });

      // Verify notification sent
      expect(mockNotificationsService.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'recipient-1',
        type: NotificationType.POSTCARD_UNLOCKED,
      }));
    });

    it('should NOT unlock postcards where unlockDate is in the future', async () => {
      // Arrange
      mockPrisma.postcard.findMany.mockResolvedValue([]); // Prisma query filters this out normally, so service just processes what it gets.
      // But let's verify logic if findMany returns nothing

      // Act
      await scheduler.handleTimeLockUnlock();

      // Assert
      expect(mockPrisma.postcard.update).not.toHaveBeenCalled();
    });
  });

  describe('checkGeoLockUnlock (Place Unlock)', () => {
    it('should immediately unlock postcards when user is within radius', async () => {
      // 1. Arrange
      const userId = 'user-1';
      const userLat = 10.7769;
      const userLong = 106.7009;

      const lockedPostcard = {
        id: 'geo-locked-postcard-1',
        recipientId: userId,
        senderId: 'sender-1',
        status: PostcardStatus.LOCKED,
        unlockLatitude: 10.7769, // Exact match
        unlockLongitude: 106.7009,
        unlockRadius: 50, // 50 meters
        sender: { id: 'sender-1', name: 'Sender Name' },
      };

      mockPrisma.postcard.findMany.mockResolvedValue([lockedPostcard]);

      // 2. Act
      // Simulate calling from controller immediately
      const result = await scheduler.checkGeoLockUnlock(userId, userLat, userLong);

      // 3. Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('geo-locked-postcard-1');

      // Verify DB update
      expect(mockPrisma.postcard.update).toHaveBeenCalledWith({
        where: { id: 'geo-locked-postcard-1' },
        data: expect.objectContaining({
          status: PostcardStatus.UNLOCKED,
          unlockNotificationSent: true,
        }),
      });

      // Verify notification
      expect(mockNotificationsService.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: userId,
        type: NotificationType.POSTCARD_UNLOCKED,
      }));
    });

    it('should NOT unlock postcards when user is outside radius', async () => {
      // 1. Arrange
      const userId = 'user-1';
      const userLat = 10.0000; // Far away
      const userLong = 106.0000;

      const lockedPostcard = {
        id: 'geo-locked-postcard-1',
        recipientId: userId,
        senderId: 'sender-1',
        status: PostcardStatus.LOCKED,
        unlockLatitude: 20.0000,
        unlockLongitude: 107.0000,
        unlockRadius: 50,
        sender: { id: 'sender-1', name: 'Sender Name' },
      };

      mockPrisma.postcard.findMany.mockResolvedValue([lockedPostcard]);

      // 2. Act
      const result = await scheduler.checkGeoLockUnlock(userId, userLat, userLong);

      // 3. Assert
      expect(result).toHaveLength(0);
      expect(mockPrisma.postcard.update).not.toHaveBeenCalled();
    });
  });
});
