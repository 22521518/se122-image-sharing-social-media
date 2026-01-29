import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FriendshipStatus, PrivacyLevel, Prisma } from '@prisma/client';

export interface PostDetailResult {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  commentCount: number;
  imageUrls?: string[];
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  liked: boolean;
}

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Check if two users are friends (accepted friendship)
   */
  private async areFriends(userId1: string, userId2: string): Promise<boolean> {
    if (userId1 === userId2) return true; // Same user

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId1, addresseeId: userId2 },
          { requesterId: userId2, addresseeId: userId1 },
        ],
        status: FriendshipStatus.ACCEPTED,
      },
    });
    return !!friendship;
  }

  /**
   * Build privacy filter for posts based on viewer relationship
   * - public: anyone can see
   * - friends: only friends can see
   * - private: only owner can see
   */
  private async buildPrivacyFilter(
    targetUserId: string,
    viewerId: string,
  ): Promise<Prisma.PostWhereInput> {
    // If viewing own posts, show all
    if (targetUserId === viewerId) {
      return { authorId: targetUserId };
    }

    // Check if viewer is a friend
    const isFriend = await this.areFriends(targetUserId, viewerId);

    // Build filter based on relationship
    const privacyConditions: PrivacyLevel[] = [PrivacyLevel.public];
    if (isFriend) {
      privacyConditions.push(PrivacyLevel.friends);
    }

    return {
      authorId: targetUserId,
      privacy: { in: privacyConditions },
    };
  }

  /**
   * Get full post details by ID including author info and like status
   */
  async getPostById(postId: string, currentUserId: string): Promise<PostDetailResult> {
    const post = await this.prisma.post.findUnique({
      where: {
        id: postId,
        deletedAt: null, // Exclude soft-deleted posts
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        likes: {
          where: { userId: currentUserId },
          select: { id: true },
          take: 1,
        },
        media: {
          select: {
            id: true,
            url: true,
            type: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return {
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      imageUrls: post.media.filter(m => m.type === 'image').map(m => m.url),
      author: {
        id: post.author.id,
        name: post.author.name,
        avatarUrl: post.author.avatarUrl,
      },
      liked: post.likes.length > 0,
    };
  }

  /**
   * Get recent posts for development/testing feed
   */
  async createPost(data: any): Promise<PostDetailResult> {
    const { authorId, content, privacy, mediaMetadata } = data;

    // AC 2: Validate max 10 media items
    if (mediaMetadata && mediaMetadata.length > 10) {
      throw new Error('Posts can have a maximum of 10 media items');
    }

    // AC 4: Validate caption max 200 chars
    if (mediaMetadata) {
      for (const media of mediaMetadata) {
        if (media.caption && media.caption.length > 200) {
          throw new Error('Media captions cannot exceed 200 characters');
        }
      }
    }

    // Extract hashtags
    const hashtagRegex = /#(\w+)/g;
    const hashtags = [];
    let match;

    // Using a Set to avoid duplicate tags in same post
    const uniqueTags = new Set<string>();

    while ((match = hashtagRegex.exec(content)) !== null) {
      // Limit to 10 hashtags
      if (uniqueTags.size >= 10) break;
      uniqueTags.add(match[1]); // match[1] is the group capture (without #)
    }

    // Use transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Create post
      const post = await tx.post.create({
        data: {
          authorId,
          content,
          privacy,
          media: data.mediaIds?.length > 0 ? {
            connect: data.mediaIds.map((id: string) => ({ id })),
          } : undefined,
        },
      });

      // AC 5: Update each media item with caption and sortOrder
      if (mediaMetadata && mediaMetadata.length > 0) {
        for (const mediaItem of mediaMetadata) {
          await tx.media.update({
            where: { id: mediaItem.mediaId },
            data: {
              caption: mediaItem.caption,
              sortOrder: mediaItem.sortOrder,
            },
          });
        }
      }

      // Process hashtags
      for (const tag of uniqueTags) {
        // Upsert hashtag (create if new, get if exists)
        const hashtag = await tx.hashtag.upsert({
          where: { tag },
          update: {},
          create: { tag },
        });

        // Link to post
        await tx.postHashtag.create({
          data: {
            postId: post.id,
            hashtagId: hashtag.id,
          },
        });
      }

      // Fetch the complete post with author and media info to return
      const completePost = await tx.post.findUnique({
        where: { id: post.id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              type: true,
              sortOrder: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });

      return {
        id: completePost!.id,
        content: completePost!.content,
        createdAt: completePost!.createdAt,
        updatedAt: completePost!.updatedAt,
        likeCount: completePost!.likeCount,
        commentCount: completePost!.commentCount,
        imageUrls: completePost!.media.filter(m => m.type === 'image').map(m => m.url),
        author: {
          id: completePost!.author.id,
          name: completePost!.author.name,
          avatarUrl: completePost!.author.avatarUrl,
        },
        liked: false, // New post, not liked yet
      };
    });
  }

  /**
   * Get posts by a specific user ID with privacy filtering
   */
  async getPostsByUserId(userId: string, currentUserId: string, limit: number = 50): Promise<PostDetailResult[]> {
    // Build privacy-aware filter
    const privacyFilter = await this.buildPrivacyFilter(userId, currentUserId);

    const posts = await this.prisma.post.findMany({
      where: {
        ...privacyFilter,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        likes: {
          where: { userId: currentUserId },
          select: { id: true },
          take: 1,
        },
        media: {
          select: {
            id: true,
            url: true,
            type: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    return posts.map((post) => ({
      id: post.id,
      content: post.content,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      imageUrls: post.media.filter(m => m.type === 'image').map(m => m.url),
      author: {
        id: post.author.id,
        name: post.author.name,
        avatarUrl: post.author.avatarUrl,
      },
      liked: post.likes.length > 0,
    }));
  }

  async getRecentPosts(currentUserId: string, limit: number = 20): Promise<PostDetailResult[]> {
    const posts = await this.prisma.post.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        likes: {
          where: { userId: currentUserId },
          select: { id: true },
          take: 1,
        },
      },
    });

    return posts.map((post) => ({
      id: post.id,
      content: post.content,
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
    }));
  }


  /**
   * Update a post
   */
  async updatePost(postId: string, userId: string, data: any): Promise<PostDetailResult> {
    const { content, privacy, mediaMetadata } = data;

    // 1. Check existence and ownership
    const existingPost = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }

    if (existingPost.authorId !== userId) {
      throw new NotFoundException('You can only edit your own posts'); // Or Forbidden
    }

    // 2. Validate inputs (similar to create)
    if (mediaMetadata && mediaMetadata.length > 10) {
      throw new Error('Posts can have a maximum of 10 media items');
    }

    if (mediaMetadata) {
      for (const media of mediaMetadata) {
        if (media.caption && media.caption.length > 200) {
          throw new Error('Media captions cannot exceed 200 characters');
        }
      }
    }

    // Extract hashtags if content is updated
    let hashtags: string[] = [];
    let uniqueTags = new Set<string>();

    if (content) {
      const hashtagRegex = /#(\w+)/g;
      let match;
      while ((match = hashtagRegex.exec(content)) !== null) {
        if (uniqueTags.size >= 10) break;
        uniqueTags.add(match[1]);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Update post fields
      const post = await tx.post.update({
        where: { id: postId },
        data: {
          content,
          privacy,
          // Note: Handling mediaIds updates (adding/removing) is complex and omitted for now
          // unless explicitly requested. We assume media is mostly static or handled separately.
          // If mediaIds IS provided, we could disconnect all and connect new, but sticking to metadata for now.
        },
      });

      // Update Media Metadata
      if (mediaMetadata && mediaMetadata.length > 0) {
        for (const mediaItem of mediaMetadata) {
          // Verify media belongs to post?
          await tx.media.updateMany({ // Use updateMany to be safe or check ownership
            where: { id: mediaItem.mediaId, postId: postId },
            data: {
              caption: mediaItem.caption,
              sortOrder: mediaItem.sortOrder,
            },
          });
        }
      }

      // Update Hashtags if content changed
      if (content) {
        // Clear existing hashtags
        await tx.postHashtag.deleteMany({
          where: { postId: post.id },
        });

        // Add new ones
        for (const tag of uniqueTags) {
          const hashtag = await tx.hashtag.upsert({
            where: { tag },
            update: {},
            create: { tag },
          });

          await tx.postHashtag.create({
            data: {
              postId: post.id,
              hashtagId: hashtag.id,
            },
          });
        }
      }

      // Return updated post
      const completePost = await tx.post.findUnique({
        where: { id: post.id },
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
            take: 1
          },
          media: {
            select: {
              id: true,
              url: true,
              type: true,
              sortOrder: true,
            },
            orderBy: {
              sortOrder: 'asc',
            },
          },
        },
      });

      return {
        id: completePost!.id,
        content: completePost!.content,
        createdAt: completePost!.createdAt,
        updatedAt: completePost!.updatedAt,
        likeCount: completePost!.likeCount,
        commentCount: completePost!.commentCount,
        imageUrls: completePost!.media.filter(m => m.type === 'image').map(m => m.url),
        author: {
          id: completePost!.author.id,
          name: completePost!.author.name,
          avatarUrl: completePost!.author.avatarUrl,
        },
        liked: completePost!.likes.length > 0,
      };
    });
  }
}
