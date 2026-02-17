import { Test, TestingModule } from '@nestjs/testing';
import { GraphService } from './graph.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotFoundException } from '@nestjs/common';

describe('GraphService', () => {
  let service: GraphService;
  let prisma: PrismaService;

  const mockPrismaService = {
    follow: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockNotificationsService = {
    create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<GraphService>(GraphService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('followUser', () => {
    it('should create a follow relationship and send notification', async () => {
      const followerId = 'user1';
      const followingId = 'user2';

      // First call: validate target user exists; Second call: get follower name for notification
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: followingId, name: 'User 2' }) // targetUser
        .mockResolvedValueOnce({ name: 'User 1' }); // follower (for notification)
      mockPrismaService.follow.create.mockResolvedValue({ id: 'follow1', followerId, followingId });

      const result = await service.followUser(followerId, followingId);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: followingId } });
      expect(prisma.follow.create).toHaveBeenCalledWith({
        data: {
          followerId,
          followingId,
        },
      });
      expect(result).toEqual(expect.objectContaining({ followerId, followingId }));
      // Verify notification was sent
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: followingId,
          type: 'FOLLOW',
        })
      );
    });

    it('should throw error if self-follow', async () => {
      const userId = 'user1';
      await expect(service.followUser(userId, userId)).rejects.toThrow('Cannot follow yourself');
    });

    it('should throw NotFoundException if target user does not exist', async () => {
      const followerId = 'user1';
      const followingId = 'nonexistent';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.followUser(followerId, followingId)).rejects.toThrow(NotFoundException);
    });

    it('should return existing follow record if already following (idempotent)', async () => {
      const followerId = 'user1';
      const followingId = 'user2';
      const existingFollow = { id: 'follow1', followerId, followingId };

      mockPrismaService.user.findUnique.mockResolvedValue({ id: followingId, name: 'User 2' });
      mockPrismaService.$transaction.mockRejectedValue({ code: 'P2002' });
      mockPrismaService.follow.findUniqueOrThrow.mockResolvedValue(existingFollow);

      const result = await service.followUser(followerId, followingId);

      expect(result).toEqual(existingFollow);
    });
  });

  describe('unfollowUser', () => {
    // FIXED: Previously skipped due to transaction mock issue
    it('should delete a follow relationship', async () => {
      const followerId = 'user1';
      const followingId = 'user2';

      // Mock successful transaction that completes without error
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        await callback(mockPrismaService);
      });
      mockPrismaService.follow.delete.mockResolvedValue({ id: 'follow1', followerId, followingId });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.unfollowUser(followerId, followingId);

      expect(result).toEqual({ success: true });
    });

    it('should return success if already unfollowed (idempotent)', async () => {
      const followerId = 'user1';
      const followingId = 'user2';

      mockPrismaService.$transaction.mockRejectedValue({ code: 'P2025' });

      const result = await service.unfollowUser(followerId, followingId);

      expect(result).toEqual({ success: true });
    });
  });

  describe('isFollowing', () => {
    it('should return true when follow relationship exists', async () => {
      const followerId = 'user1';
      const followingId = 'user2';

      mockPrismaService.follow.findUnique.mockResolvedValue({ id: 'follow1', followerId, followingId });

      const result = await service.isFollowing(followerId, followingId);

      expect(prisma.follow.findUnique).toHaveBeenCalledWith({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });
      expect(result).toBe(true);
    });

    it('should return false when follow relationship does not exist', async () => {
      const followerId = 'user1';
      const followingId = 'user2';

      mockPrismaService.follow.findUnique.mockResolvedValue(null);

      const result = await service.isFollowing(followerId, followingId);

      expect(result).toBe(false);
    });
  });
});
