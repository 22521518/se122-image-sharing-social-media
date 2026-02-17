import { Test, TestingModule } from '@nestjs/testing';
import { AdminStatsService, SystemStats } from './admin-stats.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AdminStatsService', () => {
  let service: AdminStatsService;
  let prismaService: jest.Mocked<PrismaService>;

  // Mock data for consistent testing
  const mockStats = {
    totalUsers: 100,
    dau: 25,
    mau: 60,
    totalPosts: 500,
    totalMemories: 300,
    totalStorageBytes: 1073741824, // 1 GB
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        count: jest.fn(),
      },
      post: {
        count: jest.fn(),
      },
      memory: {
        count: jest.fn(),
      },
      media: {
        aggregate: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminStatsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminStatsService>(AdminStatsService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    beforeEach(() => {
      // Setup mock responses for all queries
      (prismaService.user.count as jest.Mock)
        .mockResolvedValueOnce(mockStats.totalUsers) // Total users
        .mockResolvedValueOnce(mockStats.dau) // DAU
        .mockResolvedValueOnce(mockStats.mau); // MAU

      (prismaService.post.count as jest.Mock)
        .mockResolvedValue(mockStats.totalPosts);

      (prismaService.memory.count as jest.Mock)
        .mockResolvedValue(mockStats.totalMemories);

      (prismaService.media.aggregate as jest.Mock)
        .mockResolvedValue({ _sum: { size: mockStats.totalStorageBytes } });
    });

    it('should return system stats with correct structure', async () => {
      const stats = await service.getStats();

      expect(stats).toMatchObject({
        totalUsers: mockStats.totalUsers,
        activeUsers: {
          dau: mockStats.dau,
          mau: mockStats.mau,
        },
        totalPosts: mockStats.totalPosts,
        totalMemories: mockStats.totalMemories,
        storageUsedGB: 1, // 1 GB
        errorRate: 0, // Placeholder
      });

      expect(stats.cachedAt).toBeDefined();
      expect(stats.cacheExpiresAt).toBeDefined();
    });

    it('should return cached data on subsequent calls within TTL', async () => {
      // First call - fetches from DB
      const firstCall = await service.getStats();

      // Reset mocks to verify no new DB calls
      jest.clearAllMocks();

      // Second call - should return cached data
      const secondCall = await service.getStats();

      expect(secondCall).toEqual(firstCall);
      expect(prismaService.user.count).not.toHaveBeenCalled();
      expect(prismaService.post.count).not.toHaveBeenCalled();
    });

    it('should query users with deletedAt: null', async () => {
      await service.getStats();

      expect(prismaService.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
        })
      );
    });

    it('should query posts with deletedAt: null', async () => {
      await service.getStats();

      expect(prismaService.post.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should query memories with deletedAt: null', async () => {
      await service.getStats();

      expect(prismaService.memory.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should aggregate storage from media table', async () => {
      await service.getStats();

      expect(prismaService.media.aggregate).toHaveBeenCalledWith({
        _sum: { size: true },
      });
    });
  });

  describe('refreshStats', () => {
    beforeEach(() => {
      (prismaService.user.count as jest.Mock)
        .mockResolvedValueOnce(mockStats.totalUsers)
        .mockResolvedValueOnce(mockStats.dau)
        .mockResolvedValueOnce(mockStats.mau);

      (prismaService.post.count as jest.Mock)
        .mockResolvedValue(mockStats.totalPosts);

      (prismaService.memory.count as jest.Mock)
        .mockResolvedValue(mockStats.totalMemories);

      (prismaService.media.aggregate as jest.Mock)
        .mockResolvedValue({ _sum: { size: mockStats.totalStorageBytes } });
    });

    it('should bypass cache and fetch fresh data', async () => {
      // First call to populate cache
      await service.getStats();

      jest.clearAllMocks();

      // Setup new mock data for refresh
      const updatedTotal = 150;
      (prismaService.user.count as jest.Mock)
        .mockResolvedValueOnce(updatedTotal)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(70);

      (prismaService.post.count as jest.Mock)
        .mockResolvedValue(600);

      (prismaService.memory.count as jest.Mock)
        .mockResolvedValue(400);

      (prismaService.media.aggregate as jest.Mock)
        .mockResolvedValue({ _sum: { size: 2147483648 } }); // 2 GB

      // Refresh should bypass cache
      const refreshedStats = await service.refreshStats();

      expect(refreshedStats.totalUsers).toBe(updatedTotal);
      expect(refreshedStats.totalPosts).toBe(600);
      expect(refreshedStats.totalMemories).toBe(400);
      expect(refreshedStats.storageUsedGB).toBe(2);
    });
  });

  describe('storage calculation', () => {
    it('should handle null storage sum gracefully', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);
      (prismaService.post.count as jest.Mock).mockResolvedValue(0);
      (prismaService.memory.count as jest.Mock).mockResolvedValue(0);
      (prismaService.media.aggregate as jest.Mock)
        .mockResolvedValue({ _sum: { size: null } });

      const stats = await service.getStats();

      expect(stats.storageUsedGB).toBe(0);
    });

    it('should correctly convert bytes to GB', async () => {
      (prismaService.user.count as jest.Mock).mockResolvedValue(0);
      (prismaService.post.count as jest.Mock).mockResolvedValue(0);
      (prismaService.memory.count as jest.Mock).mockResolvedValue(0);
      (prismaService.media.aggregate as jest.Mock)
        .mockResolvedValue({ _sum: { size: 5368709120 } }); // 5 GB

      const stats = await service.getStats();

      expect(stats.storageUsedGB).toBe(5);
    });
  });
});
