import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeedQueryDto, FeedPostResult, FeedResponse } from './dto/feed-query.dto';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) { }

  /**
   * Get personalized feed for a user - posts from followed users + own posts
   * Uses cursor-based pagination for consistent results with new posts arriving
   * AC 3: Retrieves posts from users I follow (plus my own)/indexed queries
   * AC 4: Sorted chronologically (newest first) with cursor-based pagination
   */
  async getFeed(userId: string, query: FeedQueryDto): Promise<FeedResponse> {
    const limit = query.limit || 20;

    // Parse cursor: format is "timestamp_postId" for stable ordering
    let cursorCondition = {};
    if (query.cursor) {
      const [timestampStr, cursorPostId] = query.cursor.split('_');
      const cursorDate = new Date(timestampStr);

      // Use OR condition for cursor: either older than cursor date, 
      // or same date but lower ID (for stable tie-breaking)
      cursorCondition = {
        OR: [
          { createdAt: { lt: cursorDate } },
          {
            createdAt: cursorDate,
            id: { lt: cursorPostId },
          },
        ],
      };
    }

    // Validate userId - this should never be undefined if JwtAuthGuard is working
    if (!userId) {
      throw new Error('User authentication required for feed access');
    }

    // Get IDs of users being followed
    const followedUserIds = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = followedUserIds.map((f) => f.followingId);

    // Include own posts + posts from followed users
    // Filter out any undefined/null values to prevent Prisma validation errors
    const authorFilter = [...followingIds, userId].filter((id): id is string => id != null);

    // AC 3: Query posts from followed users + own posts
    // AC 4: Sorted by createdAt DESC with cursor pagination
    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { in: authorFilter },
        deletedAt: null,
        ...cursorCondition,
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }, // Secondary sort for stable ordering
      ],
      take: limit + 1, // Fetch one extra to determine hasMore
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        likes: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
        media: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            url: true,
            type: true,
            caption: true,
            sortOrder: true,
          },
        },
      },
    });

    // Check if there are more results
    const hasMore = posts.length > limit;
    const resultPosts = hasMore ? posts.slice(0, limit) : posts;

    // Build next cursor from last post
    let nextCursor: string | null = null;
    if (hasMore && resultPosts.length > 0) {
      const lastPost = resultPosts[resultPosts.length - 1];
      nextCursor = `${lastPost.createdAt.toISOString()}_${lastPost.id}`;
    }

    // Map to response format
    const feedPosts: FeedPostResult[] = resultPosts.map((post) => ({
      id: post.id,
      content: post.content,
      privacy: post.privacy,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      author: {
        id: post.author.id,
        name: post.author.name,
        avatarUrl: post.author.avatarUrl,
      },
      liked: post.likes.length > 0,
      media: post.media,
    }));

    return {
      posts: feedPosts,
      nextCursor,
      hasMore,
    };
  }
}
