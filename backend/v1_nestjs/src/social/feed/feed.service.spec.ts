import { Test, TestingModule } from '@nestjs/testing';
import { FeedService } from './feed.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FeedService', () => {
  let service: FeedService;
  let prisma: PrismaService;

  const mockPrisma = {
    follow: {
      findMany: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFeed', () => {
    const userId = 'user-123';
    const followedUser1 = 'user-followed-1';
    const followedUser2 = 'user-followed-2';

    beforeEach(() => {
      // Mock followed users
      mockPrisma.follow.findMany.mockResolvedValue([
        { followingId: followedUser1 },
        { followingId: followedUser2 },
      ]);
    });

    it('should return posts from followed users and own posts', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          content: 'Hello from followed user',
          privacy: 'friends',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          likeCount: 5,
          commentCount: 2,
          author: { id: followedUser1, name: 'User 1', avatarUrl: null },
          likes: [],
          media: [],
        },
        {
          id: 'post-2',
          content: 'My own post',
          privacy: 'friends',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          likeCount: 10,
          commentCount: 3,
          author: { id: userId, name: 'Me', avatarUrl: null },
          likes: [{ id: 'like-1' }],
          media: [],
        },
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);

      const result = await service.getFeed(userId, { limit: 20 });

      expect(result.posts).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();

      // Verify first post (from followed user)
      expect(result.posts[0].id).toBe('post-1');
      expect(result.posts[0].liked).toBe(false);

      // Verify second post (own post, liked)
      expect(result.posts[1].id).toBe('post-2');
      expect(result.posts[1].liked).toBe(true);
    });

    it('should include own posts even when not following anyone', async () => {
      mockPrisma.follow.findMany.mockResolvedValue([]);

      const myPost = {
        id: 'my-post',
        content: 'My solo post',
        privacy: 'friends',
        createdAt: new Date(),
        updatedAt: new Date(),
        likeCount: 0,
        commentCount: 0,
        author: { id: userId, name: 'Me', avatarUrl: null },
        likes: [],
        media: [],
      };

      mockPrisma.post.findMany.mockResolvedValue([myPost]);

      const result = await service.getFeed(userId, {});

      // Should still query for own posts
      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: { in: [userId] },
          }),
        }),
      );

      expect(result.posts).toHaveLength(1);
    });

    it('should return hasMore=true and nextCursor when more posts exist', async () => {
      // Create 21 posts (limit + 1 to trigger hasMore)
      const mockPosts = Array.from({ length: 21 }, (_, i) => ({
        id: `post-${i}`,
        content: `Post ${i}`,
        privacy: 'friends',
        createdAt: new Date(`2024-01-${String(21 - i).padStart(2, '0')}`),
        updatedAt: new Date(`2024-01-${String(21 - i).padStart(2, '0')}`),
        likeCount: 0,
        commentCount: 0,
        author: { id: followedUser1, name: 'User 1', avatarUrl: null },
        likes: [],
        media: [],
      }));

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);

      const result = await service.getFeed(userId, { limit: 20 });

      expect(result.posts).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
      expect(result.nextCursor).toContain('post-19');
    });

    it('should apply cursor for pagination', async () => {
      const cursorDate = new Date('2024-01-15T12:00:00.000Z');
      const cursor = `${cursorDate.toISOString()}_post-100`;

      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getFeed(userId, { cursor, limit: 20 });

      // Verify cursor condition was applied
      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { createdAt: { lt: cursorDate } },
              expect.objectContaining({
                createdAt: cursorDate,
                id: { lt: 'post-100' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should use default limit of 20', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getFeed(userId, {});

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 21, // limit + 1 for hasMore check
        }),
      );
    });

    it('should include media with posts sorted by sortOrder', async () => {
      const postWithMedia = {
        id: 'post-media',
        content: 'Post with images',
        privacy: 'public',
        createdAt: new Date(),
        updatedAt: new Date(),
        likeCount: 0,
        commentCount: 0,
        author: { id: userId, name: 'Me', avatarUrl: null },
        likes: [],
        media: [
          { id: 'media-1', url: 'url1', type: 'image', caption: 'First', sortOrder: 0 },
          { id: 'media-2', url: 'url2', type: 'image', caption: 'Second', sortOrder: 1 },
        ],
      };

      mockPrisma.post.findMany.mockResolvedValue([postWithMedia]);

      const result = await service.getFeed(userId, {});

      expect(result.posts[0].media).toHaveLength(2);
      expect(result.posts[0].media![0].sortOrder).toBe(0);
      expect(result.posts[0].media![1].sortOrder).toBe(1);
    });

    it('should sort posts by createdAt DESC', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getFeed(userId, {});

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        }),
      );
    });

    it('should exclude soft-deleted posts', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getFeed(userId, {});

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });
});
