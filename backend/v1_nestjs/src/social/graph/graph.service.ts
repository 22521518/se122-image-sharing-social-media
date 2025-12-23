import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Follow } from '@prisma/client';

@Injectable()
export class GraphService {
  constructor(private prisma: PrismaService) { }

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
      return await this.prisma.$transaction(async (tx) => {
        // 1. Create the follow record
        const follow = await tx.follow.create({
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

        return follow;
      });
    } catch (error) {
      if (error.code === 'P2002') {
        // Already following - return existing record
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
}
