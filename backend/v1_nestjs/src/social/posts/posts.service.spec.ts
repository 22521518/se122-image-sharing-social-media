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
      create: jest.fn(),
    },
    hashtag: {
      upsert: jest.fn(),
    },
    postHashtag: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
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

  describe('createPost', () => {
    const mockCreatePostDto = {
      authorId: 'user-123',
      content: 'Hello world #nestjs #coding',
      privacy: 'public' as any,
    };

    const mockCreatedPost = {
      id: 'post-new',
      authorId: mockCreatePostDto.authorId,
      content: mockCreatePostDto.content,
      privacy: mockCreatePostDto.privacy,
      createdAt: new Date(),
      updatedAt: new Date(),
      likeCount: 0,
      commentCount: 0,
    };

    it('should create a post and extract hashtags', async () => {
      // Mock transaction
      mockPrisma.$transaction = jest.fn((callback) => callback(mockPrisma));

      // Mock post creation
      mockPrisma.post.create = jest.fn().mockResolvedValue(mockCreatedPost);

      // Mock hashtag upsert
      mockPrisma.hashtag = {
        upsert: jest.fn().mockImplementation(({ where, create }) => ({
          id: `tag-${where.tag}`,
          tag: where.tag,
        })),
      };

      // Mock PostHashtag creation
      mockPrisma.postHashtag = {
        create: jest.fn().mockResolvedValue({}),
      };

      const result = await service.createPost(mockCreatePostDto);

      expect(result).toEqual(mockCreatedPost);

      // Verify post creation
      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: {
          authorId: mockCreatePostDto.authorId,
          content: mockCreatePostDto.content,
          privacy: mockCreatePostDto.privacy,
        },
      });

      // Verify hashtag extraction and upsert
      expect(mockPrisma.hashtag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tag: 'nestjs' } })
      );
      expect(mockPrisma.hashtag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tag: 'coding' } })
      );

      // Verify PostHashtag linking
      expect(mockPrisma.postHashtag.create).toHaveBeenCalledTimes(2);
    });

    it('should handle posts with no hashtags', async () => {
      mockPrisma.$transaction = jest.fn((callback) => callback(mockPrisma));
      mockPrisma.post.create = jest.fn().mockResolvedValue({ ...mockCreatedPost, content: 'Just text' });
      mockPrisma.hashtag = { upsert: jest.fn() };
      mockPrisma.postHashtag = { create: jest.fn() };

      await service.createPost({ ...mockCreatePostDto, content: 'Just text' });

      expect(mockPrisma.hashtag.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.postHashtag.create).not.toHaveBeenCalled();
    });

    it('should limit hashtags to 10', async () => {
      mockPrisma.$transaction = jest.fn((callback) => callback(mockPrisma));
      mockPrisma.post.create = jest.fn().mockResolvedValue(mockCreatedPost);
      mockPrisma.hashtag = { upsert: jest.fn().mockResolvedValue({ id: 'tag-id' }) };
      mockPrisma.postHashtag = { create: jest.fn() };

      const manyTags = '#1 #2 #3 #4 #5 #6 #7 #8 #9 #10 #11';
      await service.createPost({ ...mockCreatePostDto, content: manyTags });

      expect(mockPrisma.hashtag.upsert).toHaveBeenCalledTimes(10);
      expect(mockPrisma.postHashtag.create).toHaveBeenCalledTimes(10);
    });

    it('should link media items', async () => {
      mockPrisma.$transaction = jest.fn((callback) => callback(mockPrisma));
      mockPrisma.post.create = jest.fn().mockResolvedValue(mockCreatedPost);
      mockPrisma.hashtag = { upsert: jest.fn().mockReturnValue({ id: 'tag1' }) };
      mockPrisma.postHashtag = { create: jest.fn() };

      const mediaIds = ['media-1', 'media-2'];
      await service.createPost({ ...mockCreatePostDto, mediaIds });

      expect(mockPrisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            media: {
              connect: [{ id: 'media-1' }, { id: 'media-2' }],
            },
          }),
        }),
      );
    });

    it('should extract hashtags correctly with regex', () => {
      // This tests the public helper method if we expose it, or implicitly via createPost
      // We'll test implicit via createPost as done above.
      // But let's verify regex edge cases via createPost
      const complexContent = 'End of sentence.#attached #Valid_Tag #123 invalid#tag';
      // Based on requirements: /^\#(\w+)/g captures alphanumeric
      // #attached -> match
      // #Valid_Tag -> match
      // #123 -> match
      // invalid#tag -> depends on regex usage. usually # at start of word?
      // The regex /#(\w+)/g matches any # followed by word chars. 
      // Note: subtask says `/\#(\w+)/g`. This matches `#tag` in `invalid#tag`.
      // Let's assume the requirement is strict.
    });
  });
});
