import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Follow, NotificationType } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) { }

  async followUser(followerId: string, followingId: string): Promise<Follow> {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Validate target user exists
    const targetUser = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Idempotent follow: transactionally create follow and update counts
    try {
      const follow = await this.prisma.$transaction(async (tx) => {
        // 1. Create the follow record
        const newFollow = await tx.follow.create({
          data: {
            followerId,
            followingId,
          },
        });

        // 2. Increment following count for the follower
        await tx.user.update({
          where: { id: followerId },
          data: { followingCount: { increment: 1 } },
        });

        // 3. Increment follower count for the followed user
        await tx.user.update({
          where: { id: followingId },
          data: { followerCount: { increment: 1 } },
        });

        return newFollow;
      });

      // Story 9.2: Notify the followed user (only for new follows, not duplicates)
      // Fire-and-forget: notification failure should not fail the follow operation
      try {
        const follower = await this.prisma.user.findUnique({
          where: { id: followerId },
          select: { name: true },
        });
        const followerName = follower?.name || 'Someone';

        await this.notificationsService.create({
          userId: followingId,
          type: NotificationType.FOLLOW,
          title: 'New Follower',
          message: `${followerName} started following you`,
          data: { followerId, followerName },
        });
        this.logger.debug(`Sent FOLLOW notification to ${followingId}`);
      } catch (notificationError) {
        this.logger.warn(`Failed to send FOLLOW notification to ${followingId}: ${notificationError.message}`);
      }

      return follow;
    } catch (error) {
      if (error.code === 'P2002') {
        // Already following - return existing record (no notification for re-follow)
        return this.prisma.follow.findUniqueOrThrow({
          where: {
            followerId_followingId: {
              followerId,
              followingId,
            },
          },
        });
      }
      throw error;
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<{ success: boolean }> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Delete the follow record
        // This will throw if record doesn't exist, which is fine (or we catch P2025)
        await tx.follow.delete({
          where: {
            followerId_followingId: {
              followerId,
              followingId,
            },
          },
        });

        // 2. Decrement following count for the follower
        await tx.user.update({
          where: { id: followerId },
          data: { followingCount: { decrement: 1 } },
        });

        // 3. Decrement follower count for the followed user
        await tx.user.update({
          where: { id: followingId },
          data: { followerCount: { decrement: 1 } },
        });
      });
      return { success: true };
    } catch (error) {
      if (error.code === 'P2025') {
        // Record not found -> already unfollowed
        return { success: true };
      }
      throw error;
    }
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });
    return !!follow;
  }

  async getFollowing(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return follows.map(f => f.following);
  }

  async getFollowers(userId: string) {
    const follows = await this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return follows.map(f => f.follower);
  }
}
