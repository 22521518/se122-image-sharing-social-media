import { Test, TestingModule } from '@nestjs/testing';
import { PostcardsService } from './postcards.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostcardStatus } from '@prisma/client';

describe('PostcardsService', () => {
  let service: PostcardsService;
  let prisma: PrismaService;

  const mockPrisma = {
    postcard: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    follow: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostcardsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PostcardsService>(PostcardsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const senderId = 'sender-uuid';
    const recipientId = 'recipient-uuid';

    it('should throw BadRequestException if neither unlock condition is set', async () => {
      const dto = { recipientId, message: 'Hello' };

      await expect(service.create(senderId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(senderId, dto)).rejects.toThrow(
        'Must specify either an unlock date OR an unlock location'
      );
    });

    it('should throw BadRequestException if BOTH unlock conditions are set', async () => {
      const dto = {
        recipientId,
        message: 'Hello',
        unlockDate: '2026-01-01',
        unlockLatitude: 10.5,
        unlockLongitude: 106.5,
      };

      await expect(service.create(senderId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(senderId, dto)).rejects.toThrow(
        'Cannot specify both unlock date AND unlock location'
      );
    });

    it('should throw BadRequestException if unlock date is in the past', async () => {
      const dto = {
        recipientId,
        message: 'Hello',
        unlockDate: '2020-01-01', // Past date
      };

      await expect(service.create(senderId, dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(senderId, dto)).rejects.toThrow(
        'Unlock date must be at least tomorrow'
      );
    });

    it('should throw NotFoundException if recipient does not exist', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const dto = {
        recipientId,
        message: 'Hello',
        unlockDate: futureDate.toISOString(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(senderId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if sender does not follow recipient', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const dto = {
        recipientId,
        message: 'Hello',
        unlockDate: futureDate.toISOString(),
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: recipientId });
      mockPrisma.follow.findUnique.mockResolvedValue(null);

      await expect(service.create(senderId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should allow self-postcards without follow relationship', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const dto = {
        recipientId: senderId, // Self-postcard
        message: 'Note to future self',
        unlockDate: futureDate.toISOString(),
      };

      mockPrisma.postcard.create.mockResolvedValue({
        id: 'postcard-uuid',
        senderId,
        recipientId: senderId,
        message: dto.message,
        status: PostcardStatus.LOCKED,
        unlockDate: new Date(dto.unlockDate),
        sender: { id: senderId, name: 'Test User', avatarUrl: null },
      });

      const result = await service.create(senderId, dto);

      expect(result).toBeDefined();
      expect(result.status).toBe(PostcardStatus.LOCKED);
      // Self-postcards can see their own content
      expect(result.message).toBe(dto.message);
    });

    it('should create a time-locked postcard with valid data', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const dto = {
        recipientId,
        message: 'Hello from the past!',
        unlockDate: futureDate.toISOString(),
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: recipientId });
      mockPrisma.follow.findUnique.mockResolvedValue({ followerId: senderId, followingId: recipientId });
      mockPrisma.postcard.create.mockResolvedValue({
        id: 'postcard-uuid',
        senderId,
        recipientId,
        message: dto.message,
        status: PostcardStatus.LOCKED,
        unlockDate: new Date(dto.unlockDate),
        sender: { id: senderId, name: 'Sender', avatarUrl: null },
        recipient: { id: recipientId, name: 'Recipient', avatarUrl: null },
      });

      const result = await service.create(senderId, dto);

      expect(mockPrisma.postcard.create).toHaveBeenCalled();
      expect(result.id).toBe('postcard-uuid');
      expect(result.status).toBe(PostcardStatus.LOCKED);
    });

    it('should create a geo-locked postcard with valid location', async () => {
      const dto = {
        recipientId,
        message: 'Open when you arrive!',
        unlockLatitude: 10.7769,
        unlockLongitude: 106.7009,
        unlockRadius: 100,
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: recipientId });
      mockPrisma.follow.findUnique.mockResolvedValue({ followerId: senderId, followingId: recipientId });
      mockPrisma.postcard.create.mockResolvedValue({
        id: 'postcard-uuid',
        senderId,
        recipientId,
        message: dto.message,
        status: PostcardStatus.LOCKED,
        unlockLatitude: dto.unlockLatitude,
        unlockLongitude: dto.unlockLongitude,
        unlockRadius: dto.unlockRadius,
        sender: { id: senderId, name: 'Sender', avatarUrl: null },
      });

      const result = await service.create(senderId, dto);

      expect(result.unlockLatitude).toBe(dto.unlockLatitude);
      expect(result.unlockLongitude).toBe(dto.unlockLongitude);
    });
  });

  describe('getReceivedPostcards', () => {
    it('should return postcards with hidden content for LOCKED status', async () => {
      const userId = 'user-uuid';
      mockPrisma.postcard.findMany.mockResolvedValue([
        {
          id: 'postcard-1',
          senderId: 'sender-uuid',
          recipientId: userId,
          message: 'Secret message',
          mediaUrl: 'https://example.com/image.jpg',
          status: PostcardStatus.LOCKED,
          sender: { id: 'sender-uuid', name: 'Sender', avatarUrl: null },
        },
      ]);

      const result = await service.getReceivedPostcards(userId);

      expect(result).toHaveLength(1);
      // Content should be hidden because status is LOCKED
      expect(result[0].message).toBeUndefined();
      expect(result[0].mediaUrl).toBeUndefined();
    });

    it('should return postcards with visible content for UNLOCKED status', async () => {
      const userId = 'user-uuid';
      mockPrisma.postcard.findMany.mockResolvedValue([
        {
          id: 'postcard-1',
          senderId: 'sender-uuid',
          recipientId: userId,
          message: 'Now visible!',
          mediaUrl: 'https://example.com/image.jpg',
          status: PostcardStatus.UNLOCKED,
          sender: { id: 'sender-uuid', name: 'Sender', avatarUrl: null },
        },
      ]);

      const result = await service.getReceivedPostcards(userId);

      expect(result).toHaveLength(1);
      // Content should be visible because status is UNLOCKED
      expect(result[0].message).toBe('Now visible!');
      expect(result[0].mediaUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('getPostcardById', () => {
    it('should throw NotFoundException if postcard does not exist', async () => {
      mockPrisma.postcard.findUnique.mockResolvedValue(null);

      await expect(service.getPostcardById('invalid-id', 'user-uuid')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw ForbiddenException if user is not sender or recipient', async () => {
      mockPrisma.postcard.findUnique.mockResolvedValue({
        id: 'postcard-uuid',
        senderId: 'sender-uuid',
        recipientId: 'recipient-uuid',
      });

      await expect(service.getPostcardById('postcard-uuid', 'other-user')).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow sender to view locked postcard content', async () => {
      const senderId = 'sender-uuid';
      mockPrisma.postcard.findUnique.mockResolvedValue({
        id: 'postcard-uuid',
        senderId,
        recipientId: 'recipient-uuid',
        message: 'Secret message',
        status: PostcardStatus.LOCKED,
        sender: { id: senderId, name: 'Sender', avatarUrl: null },
      });

      const result = await service.getPostcardById('postcard-uuid', senderId);

      // Sender can see content even when locked
      expect(result.message).toBe('Secret message');
    });
  });
});
