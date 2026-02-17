import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Admin Stats Service (Story 8.2 - AC 3)
 * Provides system-wide statistics with caching (5min TTL)
 * 
 * Stats provided:
 * - Total Users / Active Users (DAU: last 24h, MAU: last 30 days)
 * - Total Posts/Memories/Storage Used (GB)
 * - Error Rate placeholder (from application logs - simplified for MVP)
 */
@Injectable()
export class AdminStatsService {
  // In-memory cache for stats (5min TTL as per AC 3)
  private statsCache: {
    data: SystemStats | null;
    expiresAt: number;
  } = { data: null, expiresAt: 0 };

  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Get system-wide stats (AC 3)
   * Returns cached data if available, otherwise fetches fresh data
   */
  async getStats(): Promise<SystemStats> {
    const now = Date.now();

    // Check cache validity
    if (this.statsCache.data && this.statsCache.expiresAt > now) {
      return this.statsCache.data;
    }

    // Fetch fresh stats
    const stats = await this.fetchStats();

    // Update cache
    this.statsCache = {
      data: stats,
      expiresAt: now + this.CACHE_TTL_MS,
    };

    return stats;
  }

  /**
   * Force refresh stats (bypasses cache)
   */
  async refreshStats(): Promise<SystemStats> {
    const stats = await this.fetchStats();

    this.statsCache = {
      data: stats,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    };

    return stats;
  }

  /**
   * Fetch all stats from database
   * Uses optimized queries with COUNT and SUM aggregations
   */
  private async fetchStats(): Promise<SystemStats> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Run all queries in parallel for performance
    const [
      totalUsers,
      dauCount,
      mauCount,
      totalPosts,
      totalMemories,
      storageResult,
    ] = await Promise.all([
      // Total non-deleted users
      this.prisma.user.count({
        where: { deletedAt: null },
      }),

      // DAU: Users with activity in last 24h (based on updatedAt as proxy for lastActiveAt)
      // Note: In production, we'd have a dedicated lastActiveAt field
      this.prisma.user.count({
        where: {
          deletedAt: null,
          updatedAt: { gte: last24h },
        },
      }),

      // MAU: Users with activity in last 30 days
      this.prisma.user.count({
        where: {
          deletedAt: null,
          updatedAt: { gte: last30d },
        },
      }),

      // Total non-deleted posts
      this.prisma.post.count({
        where: { deletedAt: null },
      }),

      // Total non-deleted memories
      this.prisma.memory.count({
        where: { deletedAt: null },
      }),

      // Total storage: SUM(size) from media table (Subtask 1.4)
      this.prisma.media.aggregate({
        _sum: { size: true },
      }),
    ]);

    // Convert bytes to GB (with 2 decimal places)
    const totalStorageBytes = storageResult._sum.size || 0;
    const totalStorageGB = Number((totalStorageBytes / (1024 * 1024 * 1024)).toFixed(2));

    // Error rate placeholder - in production this would come from logging infrastructure
    // For MVP, we return 0 as we don't have a dedicated error tracking system
    const errorRate = 0;

    return {
      totalUsers,
      activeUsers: {
        dau: dauCount,
        mau: mauCount,
      },
      totalPosts,
      totalMemories,
      storageUsedGB: totalStorageGB,
      errorRate,
      cachedAt: now.toISOString(),
      cacheExpiresAt: new Date(Date.now() + this.CACHE_TTL_MS).toISOString(),
    };
  }
}

/**
 * System stats response type
 */
export interface SystemStats {
  totalUsers: number;
  activeUsers: {
    dau: number; // Daily Active Users (last 24h)
    mau: number; // Monthly Active Users (last 30 days)
  };
  totalPosts: number;
  totalMemories: number;
  storageUsedGB: number;
  errorRate: number; // Percentage (0-100)
  cachedAt: string;
  cacheExpiresAt: string;
}
