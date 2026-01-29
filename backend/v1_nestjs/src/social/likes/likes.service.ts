import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Like, NotificationType } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';

export interface ToggleLikeResult {
  liked: boolean;
  likeCount: number;
}

@Injectable()
export class LikesService {
  private readonly logger = new Logger(LikesService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) { }

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

      // Story 6.2 AC 5: Trigger notification if userId !== post.authorId
      if (userId !== post.authorId) {
        const liker = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        const likerName = liker?.name || 'Someone';

        await this.notificationsService.create({
          userId: post.authorId,
          type: NotificationType.LIKE,
          title: 'New Like',
          message: `${likerName} liked your post`,
          data: { postId, actorId: userId, actorName: likerName },
        });
        this.logger.debug(`Sent LIKE notification for post ${postId} to ${post.authorId}`);
      }

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

  /**
   * Toggle like on a memory
   */
  async toggleLikeMemory(userId: string, memoryId: string): Promise<ToggleLikeResult> {
    // Validate memory exists
    const memory = await this.prisma.memory.findUnique({
      where: { id: memoryId },
      select: { id: true, userId: true, likeCount: true },
    });

    if (!memory) {
      throw new NotFoundException('Memory not found');
    }

    // Check if like exists
    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_memoryId: {
          userId,
          memoryId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await this.prisma.$transaction(async (tx) => {
        await tx.like.delete({
          where: { id: existingLike.id },
        });

        await tx.memory.update({
          where: { id: memoryId },
          data: { likeCount: { decrement: 1 } },
        });
      });

      return {
        liked: false,
        likeCount: Math.max(0, memory.likeCount - 1),
      };
    } else {
      // Like
      await this.prisma.$transaction(async (tx) => {
        await tx.like.create({
          data: {
            userId,
            memoryId,
          },
        });

        await tx.memory.update({
          where: { id: memoryId },
          data: { likeCount: { increment: 1 } },
        });
      });

      // Story 6.2: Trigger notification if userId !== memory owner
      if (userId !== memory.userId) {
        const liker = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        const likerName = liker?.name || 'Someone';

        await this.notificationsService.create({
          userId: memory.userId,
          type: NotificationType.LIKE,
          title: 'New Like',
          message: `${likerName} liked your memory`,
          data: { memoryId, actorId: userId, actorName: likerName },
        });
        this.logger.debug(`Sent LIKE notification for memory ${memoryId} to ${memory.userId}`);
      }

      return {
        liked: true,
        likeCount: memory.likeCount + 1,
      };
    }
  }

  /**
   * Check if user has liked a memory
   */
  async hasLikedMemory(userId: string, memoryId: string): Promise<boolean> {
    const like = await this.prisma.like.findUnique({
      where: {
        userId_memoryId: {
          userId,
          memoryId,
        },
      },
    });
    return !!like;
  }

  /**
   * Get like count for a memory
   */
  async getMemoryLikeCount(memoryId: string): Promise<number> {
    const memory = await this.prisma.memory.findUnique({
      where: { id: memoryId },
      select: { likeCount: true },
    });

    if (!memory) {
      throw new NotFoundException('Memory not found');
    }

    return memory.likeCount;
  }
}
