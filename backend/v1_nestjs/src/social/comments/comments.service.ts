import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Comment, NotificationType } from '@prisma/client';
import { CreateCommentDto } from './dto/create-comment.dto';
import { NotificationsService } from '../../notifications/notifications.service';

export interface CommentWithAuthor {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  isOwner: boolean;
}

export interface CreateCommentResult {
  comment: CommentWithAuthor;
  commentCount: number;
}

export interface DeleteCommentResult {
  success: boolean;
  commentCount: number;
}

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) { }

  /**
   * Create a new comment on a post
   * Updates Post.commentCount in the SAME transaction
   */
  async createComment(
    userId: string,
    postId: string,
    dto: CreateCommentDto,
  ): Promise<CreateCommentResult> {
    // Validate content length (also validated by DTO, but double-check)
    if (dto.content.length > 500) {
      throw new BadRequestException('Comment cannot exceed 500 characters');
    }

    // Validate post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, commentCount: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Create comment and update count in transaction
    const [comment, _] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: {
          content: dto.content,
          userId,
          postId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    // Story 6.3 AC 4: Trigger notification if userId !== post.authorId
    if (userId !== post.authorId) {
      const commenterName = comment.user.name || 'Someone';

      await this.notificationsService.create({
        userId: post.authorId,
        type: NotificationType.COMMENT,
        title: 'New Comment',
        message: `${commenterName} commented on your post`,
        data: { postId, commentId: comment.id, actorId: userId, actorName: commenterName },
      });
      this.logger.debug(`Sent COMMENT notification for post ${postId} to ${post.authorId}`);
    }

    return {
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: {
          id: comment.user.id,
          name: comment.user.name,
          avatarUrl: comment.user.avatarUrl,
        },
        isOwner: true,
      },
      commentCount: post.commentCount + 1,
    };
  }

  /**
   * Delete a comment - only the comment author can delete
   */
  async deleteComment(
    userId: string,
    commentId: string,
  ): Promise<DeleteCommentResult> {
    // Find comment and verify ownership
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: { id: true, commentCount: true },
        },
        memory: {
          select: { id: true, commentCount: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Authorization check
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Delete comment and update count in transaction
    if (comment.postId && comment.post) {
      await this.prisma.$transaction([
        this.prisma.comment.delete({
          where: { id: commentId },
        }),
        this.prisma.post.update({
          where: { id: comment.postId },
          data: { commentCount: { decrement: 1 } },
        }),
      ]);

      return {
        success: true,
        commentCount: Math.max(0, comment.post.commentCount - 1),
      };
    } else if (comment.memoryId && comment.memory) {
      await this.prisma.$transaction([
        this.prisma.comment.delete({
          where: { id: commentId },
        }),
        this.prisma.memory.update({
          where: { id: comment.memoryId },
          data: { commentCount: { decrement: 1 } },
        }),
      ]);

      return {
        success: true,
        commentCount: Math.max(0, comment.memory.commentCount - 1),
      };
    }

    // Fallback if neither (should be unreachable with valid data)
    await this.prisma.comment.delete({
      where: { id: commentId },
    });

    return {
      success: true,
      commentCount: 0,
    };
  }

  /**
   * Create a new comment on a memory
   */
  async createCommentOnMemory(
    userId: string,
    memoryId: string,
    dto: CreateCommentDto,
  ): Promise<CreateCommentResult> {
    if (dto.content.length > 500) {
      throw new BadRequestException('Comment cannot exceed 500 characters');
    }

    const memory = await this.prisma.memory.findUnique({
      where: { id: memoryId },
      select: { id: true, userId: true, commentCount: true },
    });

    if (!memory) {
      throw new NotFoundException('Memory not found');
    }

    const [comment, _] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: {
          content: dto.content,
          userId,
          memoryId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.memory.update({
        where: { id: memoryId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    // Story 6.3: Trigger notification if userId !== memory owner
    if (userId !== memory.userId) {
      const commenterName = comment.user.name || 'Someone';

      await this.notificationsService.create({
        userId: memory.userId,
        type: NotificationType.COMMENT,
        title: 'New Comment',
        message: `${commenterName} commented on your memory`,
        data: { memoryId, commentId: comment.id, actorId: userId, actorName: commenterName },
      });
      this.logger.debug(`Sent COMMENT notification for memory ${memoryId} to ${memory.userId}`);
    }

    return {
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: {
          id: comment.user.id,
          name: comment.user.name,
          avatarUrl: comment.user.avatarUrl,
        },
        isOwner: true,
      },
      commentCount: memory.commentCount + 1,
    };
  }

  /**
   * Get all comments for a post
   */
  async getComments(userId: string, postId: string): Promise<CommentWithAuthor[]> {
    // Validate post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Story 8.3 AC 5: Hide comments from banned users
    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        deletedAt: null,
        user: {
          isBanned: false,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.user.id,
        name: comment.user.name,
        avatarUrl: comment.user.avatarUrl,
      },
      isOwner: comment.userId === userId,
    }));
  }

  /**
   * Get all comments for a memory
   */
  async getMemoryComments(userId: string, memoryId: string): Promise<CommentWithAuthor[]> {
    const memory = await this.prisma.memory.findUnique({
      where: { id: memoryId },
      select: { id: true },
    });

    if (!memory) {
      throw new NotFoundException('Memory not found');
    }

    // Story 8.3 AC 5: Hide comments from banned users
    const comments = await this.prisma.comment.findMany({
      where: {
        memoryId,
        deletedAt: null,
        user: {
          isBanned: false,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.user.id,
        name: comment.user.name,
        avatarUrl: comment.user.avatarUrl,
      },
      isOwner: comment.userId === userId,
    }));
  }

  /**
   * Get comment count for a post
   */
  async getCommentCount(postId: string): Promise<number> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { commentCount: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post.commentCount;
  }

  /**
   * Get comment count for a memory
   */
  async getMemoryCommentCount(memoryId: string): Promise<number> {
    const memory = await this.prisma.memory.findUnique({
      where: { id: memoryId },
      select: { commentCount: true },
    });

    if (!memory) {
      throw new NotFoundException('Memory not found');
    }

    return memory.commentCount;
  }
}
