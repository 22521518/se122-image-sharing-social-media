import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SearchQueryDto,
  SearchResponse,
  TrendingResponse,
  UserResult,
  PostResult,
  HashtagResult,
} from './dto/discovery.dto';

@Injectable()
export class DiscoveryService {
  constructor(private prisma: PrismaService) { }

  /**
   * Search for users, posts, and hashtags
   * AC 5: Returns matching Hashtags, Users, and Posts
   * AC 6: Results filtered to PUBLIC content only for posts
   */
  async search(query: SearchQueryDto): Promise<SearchResponse> {
    const { q, type = 'all', limit = 20 } = query;
    // Note: For case-insensitive search in production (Postgres), use mode: 'insensitive'
    // SQLite LIKE is case-insensitive by default for ASCII, but for full Unicode support
    // consider Postgres full-text search or Elasticsearch
    const searchTerm = q.toLowerCase();

    const result: SearchResponse = {
      users: [],
      posts: [],
      hashtags: [],
    };

    // Search Users (username/displayName)
    // Issue #8 Fix: Using lowercase comparison for SQLite compatibility
    if (type === 'all' || type === 'users') {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm } },
            { email: { contains: searchTerm } },
          ],
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          bio: true,
        },
        take: limit,
      });

      result.users = users.map((u) => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
      }));
    }

    // AC 6: Search Posts - STRICTLY filter privacy = 'PUBLIC'
    if (type === 'all' || type === 'posts') {
      const posts = await this.prisma.post.findMany({
        where: {
          content: { contains: searchTerm },
          privacy: 'public', // AC 6: PUBLIC only
          deletedAt: null,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          likeCount: true,
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      result.posts = posts.map((p) => ({
        id: p.id,
        content: p.content,
        createdAt: p.createdAt,
        likeCount: p.likeCount,
        author: p.author,
      }));
    }

    // Search Hashtags (exact + prefix match)
    if (type === 'all' || type === 'hashtags') {
      // Remove # prefix if present
      const tagSearch = searchTerm.replace(/^#/, '');

      const hashtags = await this.prisma.hashtag.findMany({
        where: {
          tag: { startsWith: tagSearch },
        },
        select: {
          id: true,
          tag: true,
          _count: {
            select: { posts: true },
          },
        },
        take: limit,
      });

      result.hashtags = hashtags.map((h) => ({
        id: h.id,
        tag: h.tag,
        postCount: h._count.posts,
      }));
    }

    return result;
  }

  /**
   * Get trending public posts
   * AC 3: Most liked in last 24h, max 50 results
   */
  async getTrending(): Promise<TrendingResponse> {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    // AC 3: Query public posts from last 24h, sorted by likes
    const posts = await this.prisma.post.findMany({
      where: {
        privacy: 'public', // AC 6: PUBLIC only
        createdAt: { gte: oneDayAgo },
        deletedAt: null,
      },
      orderBy: { likeCount: 'desc' },
      take: 50, // AC 3: max 50 results
      select: {
        id: true,
        content: true,
        createdAt: true,
        likeCount: true,
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        createdAt: p.createdAt,
        likeCount: p.likeCount,
        author: p.author,
      })),
    };
  }
}
