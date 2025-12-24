import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService } from './discovery.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
    },
    post: {
      findMany: jest.fn(),
    },
    hashtag: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should search all types by default', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Test User', avatarUrl: null, bio: 'A bio' },
      ]);
      mockPrisma.post.findMany.mockResolvedValue([
        {
          id: 'post-1',
          content: 'Test post',
          createdAt: new Date(),
          likeCount: 5,
          author: { id: 'user-1', name: 'Test User', avatarUrl: null },
        },
      ]);
      mockPrisma.hashtag.findMany.mockResolvedValue([
        { id: 'hash-1', tag: 'test', _count: { posts: 10 } },
      ]);

      const result = await service.search({ q: 'test' });

      expect(result.users).toHaveLength(1);
      expect(result.posts).toHaveLength(1);
      expect(result.hashtags).toHaveLength(1);
    });

    it('should search only users when type=users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Test', avatarUrl: null, bio: null },
      ]);

      const result = await service.search({ q: 'test', type: 'users' });

      expect(mockPrisma.user.findMany).toHaveBeenCalled();
      expect(mockPrisma.post.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.hashtag.findMany).not.toHaveBeenCalled();
      expect(result.users).toHaveLength(1);
    });

    it('should search only posts when type=posts', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.search({ q: 'hello', type: 'posts' });

      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.post.findMany).toHaveBeenCalled();
      expect(mockPrisma.hashtag.findMany).not.toHaveBeenCalled();
    });

    it('should only return PUBLIC posts (AC 6)', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.search({ q: 'test', type: 'posts' });

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            privacy: 'public',
          }),
        }),
      );
    });

    it('should search hashtags with prefix match', async () => {
      mockPrisma.hashtag.findMany.mockResolvedValue([
        { id: 'h1', tag: 'travel', _count: { posts: 5 } },
        { id: 'h2', tag: 'travelgram', _count: { posts: 3 } },
      ]);

      const result = await service.search({ q: 'travel', type: 'hashtags' });

      expect(mockPrisma.hashtag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tag: { startsWith: 'travel' } },
        }),
      );
      expect(result.hashtags).toHaveLength(2);
    });

    it('should strip # from hashtag search', async () => {
      mockPrisma.hashtag.findMany.mockResolvedValue([]);

      await service.search({ q: '#travel', type: 'hashtags' });

      expect(mockPrisma.hashtag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tag: { startsWith: 'travel' } },
        }),
      );
    });
  });

  describe('getTrending', () => {
    it('should return top liked public posts from last 24h', async () => {
      const mockPosts = [
        {
          id: 'p1',
          content: 'Trending post',
          createdAt: new Date(),
          likeCount: 100,
          author: { id: 'u1', name: 'User', avatarUrl: null },
        },
      ];
      mockPrisma.post.findMany.mockResolvedValue(mockPosts);

      const result = await service.getTrending();

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].likeCount).toBe(100);
    });

    it('should filter only PUBLIC posts', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getTrending();

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            privacy: 'public',
          }),
        }),
      );
    });

    it('should sort by likeCount DESC', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getTrending();

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { likeCount: 'desc' },
        }),
      );
    });

    it('should limit to 50 results (AC 3)', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getTrending();

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should filter posts from last 24 hours', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);

      await service.getTrending();

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });
});
