import { Test, TestingModule } from '@nestjs/testing';
import { LikesService } from './likes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('LikesService', () => {
  let service: LikesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    like: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    memory: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LikesService>(LikesService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('toggleLike', () => {
    const userId = 'user-123';
    const postId = 'post-456';
    const mockPost = { id: postId, authorId: 'author-789', likeCount: 5 };

    it('should create a like if not exists (like action)', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.like.findUnique.mockResolvedValue(null);
      mockPrismaService.like.create.mockResolvedValue({ id: 'like-1', userId, postId });

      const result = await service.toggleLike(userId, postId);

      expect(result).toEqual({ liked: true, likeCount: 6 });
      expect(mockPrismaService.like.create).toHaveBeenCalledWith({
        data: { userId, postId },
      });
      expect(mockPrismaService.post.update).toHaveBeenCalledWith({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });
    });

    it('should delete a like if exists (unlike action)', async () => {
      const existingLike = { id: 'like-1', userId, postId };
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.like.findUnique.mockResolvedValue(existingLike);

      const result = await service.toggleLike(userId, postId);

      expect(result).toEqual({ liked: false, likeCount: 4 });
      expect(mockPrismaService.like.delete).toHaveBeenCalledWith({
        where: { id: existingLike.id },
      });
      expect(mockPrismaService.post.update).toHaveBeenCalledWith({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      });
    });

    it('should throw NotFoundException if post does not exist', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.toggleLike(userId, postId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle toggle cycle: like -> unlike -> like', async () => {
      // First toggle: like
      mockPrismaService.post.findUnique.mockResolvedValue({ ...mockPost, likeCount: 0 });
      mockPrismaService.like.findUnique.mockResolvedValue(null);

      let result = await service.toggleLike(userId, postId);
      expect(result.liked).toBe(true);
      expect(result.likeCount).toBe(1);

      // Second toggle: unlike
      mockPrismaService.post.findUnique.mockResolvedValue({ ...mockPost, likeCount: 1 });
      mockPrismaService.like.findUnique.mockResolvedValue({ id: 'like-1', userId, postId });

      result = await service.toggleLike(userId, postId);
      expect(result.liked).toBe(false);
      expect(result.likeCount).toBe(0);

      // Third toggle: like again
      mockPrismaService.post.findUnique.mockResolvedValue({ ...mockPost, likeCount: 0 });
      mockPrismaService.like.findUnique.mockResolvedValue(null);

      result = await service.toggleLike(userId, postId);
      expect(result.liked).toBe(true);
      expect(result.likeCount).toBe(1);
    });

    it('should not allow likeCount to go below 0', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({ ...mockPost, likeCount: 0 });
      mockPrismaService.like.findUnique.mockResolvedValue({ id: 'like-1', userId, postId });

      const result = await service.toggleLike(userId, postId);

      expect(result.likeCount).toBe(0); // Math.max(0, -1) = 0
    });
  });

  describe('hasLiked', () => {
    const userId = 'user-123';
    const postId = 'post-456';

    it('should return true if user has liked the post', async () => {
      mockPrismaService.like.findUnique.mockResolvedValue({ id: 'like-1', userId, postId });

      const result = await service.hasLiked(userId, postId);

      expect(result).toBe(true);
    });

    it('should return false if user has not liked the post', async () => {
      mockPrismaService.like.findUnique.mockResolvedValue(null);

      const result = await service.hasLiked(userId, postId);

      expect(result).toBe(false);
    });
  });

  describe('getLikeCount', () => {
    const postId = 'post-456';

    it('should return the like count for a post', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({ likeCount: 42 });

      const result = await service.getLikeCount(postId);

      expect(result).toBe(42);
    });

    it('should throw NotFoundException if post does not exist', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.getLikeCount(postId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
  describe('toggleLikeMemory', () => {
    const userId = 'user-123';
    const memoryId = 'memory-456';
    const mockMemory = { id: memoryId, userId: 'author-789', likeCount: 5 };

    it('should create a like if not exists (like action)', async () => {
      mockPrismaService.memory.findUnique.mockResolvedValue(mockMemory);
      mockPrismaService.like.findUnique.mockResolvedValue(null);
      mockPrismaService.like.create.mockResolvedValue({ id: 'like-1', userId, memoryId });

      const result = await service.toggleLikeMemory(userId, memoryId);

      expect(result).toEqual({ liked: true, likeCount: 6 });
      expect(mockPrismaService.like.create).toHaveBeenCalledWith({
        data: { userId, memoryId },
      });
      expect(mockPrismaService.memory.update).toHaveBeenCalledWith({
        where: { id: memoryId },
        data: { likeCount: { increment: 1 } },
      });
    });

    it('should delete a like if exists (unlike action)', async () => {
      const existingLike = { id: 'like-1', userId, memoryId };
      mockPrismaService.memory.findUnique.mockResolvedValue(mockMemory);
      mockPrismaService.like.findUnique.mockResolvedValue(existingLike);

      const result = await service.toggleLikeMemory(userId, memoryId);

      expect(result).toEqual({ liked: false, likeCount: 4 });
      expect(mockPrismaService.like.delete).toHaveBeenCalledWith({
        where: { id: existingLike.id },
      });
      expect(mockPrismaService.memory.update).toHaveBeenCalledWith({
        where: { id: memoryId },
        data: { likeCount: { decrement: 1 } },
      });
    });

    it('should throw NotFoundException if memory does not exist', async () => {
      mockPrismaService.memory.findUnique.mockResolvedValue(null);

      await expect(service.toggleLikeMemory(userId, memoryId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hasLikedMemory', () => {
    const userId = 'user-123';
    const memoryId = 'memory-456';

    it('should return true if user has liked the memory', async () => {
      mockPrismaService.like.findUnique.mockResolvedValue({ id: 'like-1', userId, memoryId });

      const result = await service.hasLikedMemory(userId, memoryId);

      expect(result).toBe(true);
    });

    it('should return false if user has not liked the memory', async () => {
      mockPrismaService.like.findUnique.mockResolvedValue(null);

      const result = await service.hasLikedMemory(userId, memoryId);

      expect(result).toBe(false);
    });
  });

  describe('getMemoryLikeCount', () => {
    const memoryId = 'memory-456';

    it('should return the like count for a memory', async () => {
      mockPrismaService.memory.findUnique.mockResolvedValue({ likeCount: 10 });

      const result = await service.getMemoryLikeCount(memoryId);

      expect(result).toBe(10);
    });

    it('should throw NotFoundException if memory does not exist', async () => {
      mockPrismaService.memory.findUnique.mockResolvedValue(null);

      await expect(service.getMemoryLikeCount(memoryId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
