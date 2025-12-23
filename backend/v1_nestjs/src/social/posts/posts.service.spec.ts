import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: PrismaService;

  const mockPrisma = {
    post: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getPostById', () => {
    const mockPostId = 'post-123';
    const mockUserId = 'user-456';

    const mockPostWithLike = {
      id: mockPostId,
      content: 'Test post content',
      createdAt: new Date('2025-12-23T10:00:00Z'),
      updatedAt: new Date('2025-12-23T10:00:00Z'),
      likeCount: 5,
      commentCount: 3,
      author: {
        id: 'author-789',
        name: 'Test Author',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      likes: [{ id: 'like-1' }], // User has liked
    };

    const mockPostWithoutLike = {
      ...mockPostWithLike,
      likes: [], // User has not liked
    };

    it('should return post details with liked=true when user has liked', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPostWithLike);

      const result = await service.getPostById(mockPostId, mockUserId);

      expect(result).toEqual({
        id: mockPostId,
        content: 'Test post content',
        createdAt: mockPostWithLike.createdAt,
        updatedAt: mockPostWithLike.updatedAt,
        likeCount: 5,
        commentCount: 3,
        author: {
          id: 'author-789',
          name: 'Test Author',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        liked: true,
      });

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: mockPostId, deletedAt: null },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true },
          },
          likes: {
            where: { userId: mockUserId },
            select: { id: true },
            take: 1,
          },
        },
      });
    });

    it('should return post details with liked=false when user has not liked', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(mockPostWithoutLike);

      const result = await service.getPostById(mockPostId, mockUserId);

      expect(result.liked).toBe(false);
    });

    it('should throw NotFoundException when post does not exist', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.getPostById(mockPostId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getPostById(mockPostId, mockUserId)).rejects.toThrow(
        'Post not found',
      );
    });

    it('should handle post with null author name and avatarUrl', async () => {
      const postWithNullAuthor = {
        ...mockPostWithLike,
        author: {
          id: 'author-789',
          name: null,
          avatarUrl: null,
        },
      };
      mockPrisma.post.findUnique.mockResolvedValue(postWithNullAuthor);

      const result = await service.getPostById(mockPostId, mockUserId);

      expect(result.author.name).toBeNull();
      expect(result.author.avatarUrl).toBeNull();
    });

    it('should exclude soft-deleted posts', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.getPostById(mockPostId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );

      // Verify the query includes deletedAt: null filter
      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });
  });
});
