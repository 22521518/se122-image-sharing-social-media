import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PostDetailResult {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  commentCount: number;
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
}
