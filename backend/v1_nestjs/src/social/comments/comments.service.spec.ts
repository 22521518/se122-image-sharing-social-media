import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('CommentsService', () => {
  let service: CommentsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    comment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
    memory: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createComment', () => {
    const userId = 'user-123';
    const postId = 'post-456';
    const mockPost = { id: postId, authorId: 'author-789', commentCount: 5 };
    const mockComment = {
      id: 'comment-1',
      content: 'Great post!',
      userId,
      postId,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: userId, name: 'Test User', avatarUrl: null },
    };

    it('should create a comment and increment count', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.$transaction.mockResolvedValue([mockComment, {}]);

      const result = await service.createComment(userId, postId, { content: 'Great post!' });

      expect(result.comment.content).toBe('Great post!');
      expect(result.comment.isOwner).toBe(true);
      expect(result.commentCount).toBe(6);
    });

    it('should throw NotFoundException if post does not exist', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(
        service.createComment(userId, postId, { content: 'Hello' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if content exceeds 500 chars', async () => {
      const longContent = 'a'.repeat(501);

      await expect(
        service.createComment(userId, postId, { content: longContent }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteComment', () => {
    const userId = 'user-123';
    const commentId = 'comment-1';
    const mockComment = {
      id: commentId,
      userId,
      postId: 'post-456',
      post: { id: 'post-456', commentCount: 5 },
    };

    it('should delete comment if user is the author', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(mockComment);
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.deleteComment(userId, commentId);

      expect(result.success).toBe(true);
      expect(result.commentCount).toBe(4);
    });

    it('should throw ForbiddenException if user is not the author', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        ...mockComment,
        userId: 'other-user',
      });

      await expect(service.deleteComment(userId, commentId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if comment does not exist', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(service.deleteComment(userId, commentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getComments', () => {
    const userId = 'user-123';
    const postId = 'post-456';
    const mockComments = [
      {
        id: 'comment-1',
        content: 'First!',
        userId: 'other-user',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        user: { id: 'other-user', name: 'Other', avatarUrl: null },
      },
      {
        id: 'comment-2',
        content: 'Second',
        userId,
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02'),
        user: { id: userId, name: 'Me', avatarUrl: null },
      },
    ];

    it('should return comments sorted chronologically', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({ id: postId });
      mockPrismaService.comment.findMany.mockResolvedValue(mockComments);

      const result = await service.getComments(userId, postId);

      expect(result).toHaveLength(2);
      expect(result[0].isOwner).toBe(false);
      expect(result[1].isOwner).toBe(true);
    });

    it('should throw NotFoundException if post does not exist', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.getComments(userId, postId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCommentCount', () => {
    const postId = 'post-456';

    it('should return the comment count', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({ commentCount: 10 });

      const result = await service.getCommentCount(postId);

      expect(result).toBe(10);
    });

    it('should throw NotFoundException if post does not exist', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.getCommentCount(postId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
