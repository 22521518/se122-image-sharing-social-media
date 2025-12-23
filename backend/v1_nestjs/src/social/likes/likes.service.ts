import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Like } from '@prisma/client';

export interface ToggleLikeResult {
  liked: boolean;
  likeCount: number;
}

@Injectable()
export class LikesService {
  constructor(private prisma: PrismaService) { }

  /**
   * Toggle like on a post - creates if not exists, deletes if exists
   * Updates Post.likeCount in the SAME transaction
   */
  async toggleLike(userId: string, postId: string): Promise<ToggleLikeResult> {
    // Validate post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, likeCount: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if like exists
    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingLike) {
      // Unlike: delete like and decrement count
      await this.prisma.$transaction(async (tx) => {
        await tx.like.delete({
          where: { id: existingLike.id },
        });

        await tx.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        });
      });

      return {
        liked: false,
        likeCount: Math.max(0, post.likeCount - 1),
      };
    } else {
      // Like: create like and increment count
      await this.prisma.$transaction(async (tx) => {
        await tx.like.create({
          data: {
            userId,
            postId,
          },
        });

        await tx.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
        });
      });

      // TODO: Trigger notification if userId !== post.authorId (Subtask 1.4)
      // This will be implemented when notification system is ready

      return {
        liked: true,
        likeCount: post.likeCount + 1,
      };
    }
  }

  /**
   * Check if user has liked a post
   */
  async hasLiked(userId: string, postId: string): Promise<boolean> {
    const like = await this.prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });
    return !!like;
  }

  /**
   * Get like count for a post
   */
  async getLikeCount(postId: string): Promise<number> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { likeCount: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post.likeCount;
  }
}
