import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FriendshipStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';
import { GraphService } from './graph.service';

export interface FriendshipStatusResult {
  status: 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked';
  friendshipId?: string;
}

export interface FriendInfo {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface FriendRequest {
  id: string;
  requester: FriendInfo;
  addressee: FriendInfo;
  status: FriendshipStatus;
  createdAt: Date;
}

@Injectable()
export class FriendshipService {
  private readonly logger = new Logger(FriendshipService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private graphService: GraphService,
  ) { }

  /**
   * Send a friend request from requesterId to addresseeId
   */
  async sendFriendRequest(requesterId: string, addresseeId: string): Promise<FriendRequest> {
    if (requesterId === addresseeId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: addresseeId },
      select: { id: true, name: true },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if there's already a friendship record (in either direction)
    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === FriendshipStatus.ACCEPTED) {
        throw new BadRequestException('You are already friends');
      }
      if (existingFriendship.status === FriendshipStatus.PENDING) {
        if (existingFriendship.requesterId === requesterId) {
          throw new BadRequestException('Friend request already sent');
        } else {
          // They already sent us a request, auto-accept it
          return this.acceptFriendRequest(existingFriendship.id, requesterId);
        }
      }
      if (existingFriendship.status === FriendshipStatus.BLOCKED) {
        throw new ForbiddenException('Cannot send friend request to this user');
      }
    }

    // Create new friendship request
    const friendship = await this.prisma.friendship.create({
      data: {
        requesterId,
        addresseeId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        requester: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
        addressee: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
      },
    });

    // Send notification to addressee
    try {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { name: true },
      });
      const requesterName = requester?.name || 'Someone';

      await this.notificationsService.create({
        userId: addresseeId,
        type: NotificationType.FRIEND_REQUEST,
        title: 'Friend Request',
        message: `${requesterName} sent you a friend request`,
        data: { requesterId, requesterName, friendshipId: friendship.id },
      });
      this.logger.debug(`Sent FRIEND_REQUEST notification to ${addresseeId}`);
    } catch (error) {
      this.logger.warn(`Failed to send FRIEND_REQUEST notification: ${error.message}`);
    }

    return {
      id: friendship.id,
      requester: friendship.requester,
      addressee: friendship.addressee,
      status: friendship.status,
      createdAt: friendship.createdAt,
    };
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(friendshipId: string, userId: string): Promise<FriendRequest> {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        requester: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
        addressee: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    // Only the addressee can accept
    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException('You cannot accept this friend request');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('This friend request is not pending');
    }

    // Update friendship status and increment friend counts
    const updatedFriendship = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.friendship.update({
        where: { id: friendshipId },
        data: { status: FriendshipStatus.ACCEPTED },
        include: {
          requester: {
            select: { id: true, name: true, avatarUrl: true, bio: true },
          },
          addressee: {
            select: { id: true, name: true, avatarUrl: true, bio: true },
          },
        },
      });

      const { requesterId, addresseeId } = friendship;

      // 1. Establish Mutual Follow: Requester -> Addressee
      const followRA = await tx.follow.findUnique({
        where: { followerId_followingId: { followerId: requesterId, followingId: addresseeId } },
      });

      let reqFollowingInc = 0;
      let addrFollowerInc = 0;

      if (!followRA) {
        await tx.follow.create({
          data: { followerId: requesterId, followingId: addresseeId },
        });
        reqFollowingInc = 1;
        addrFollowerInc = 1;
      }

      // 2. Establish Mutual Follow: Addressee -> Requester
      const followAR = await tx.follow.findUnique({
        where: { followerId_followingId: { followerId: addresseeId, followingId: requesterId } },
      });

      let addrFollowingInc = 0;
      let reqFollowerInc = 0;

      if (!followAR) {
        await tx.follow.create({
          data: { followerId: addresseeId, followingId: requesterId },
        });
        addrFollowingInc = 1;
        reqFollowerInc = 1;
      }

      // 3. Update Requester Counts
      await tx.user.update({
        where: { id: requesterId },
        data: {
          friendCount: { increment: 1 },
          followingCount: { increment: reqFollowingInc },
          followerCount: { increment: reqFollowerInc },
        },
      });

      // 4. Update Addressee Counts
      await tx.user.update({
        where: { id: addresseeId },
        data: {
          friendCount: { increment: 1 },
          followingCount: { increment: addrFollowingInc },
          followerCount: { increment: addrFollowerInc },
        },
      });

      return updated;
    });

    // Send notification to requester
    try {
      const addresseeName = friendship.addressee.name || 'Someone';

      await this.notificationsService.create({
        userId: friendship.requesterId,
        type: NotificationType.FRIEND_ACCEPTED,
        title: 'Friend Request Accepted',
        message: `${addresseeName} accepted your friend request`,
        data: { addresseeId: friendship.addresseeId, addresseeName },
      });
      this.logger.debug(`Sent FRIEND_ACCEPTED notification to ${friendship.requesterId}`);
    } catch (error) {
      this.logger.warn(`Failed to send FRIEND_ACCEPTED notification: ${error.message}`);
    }

    return {
      id: updatedFriendship.id,
      requester: updatedFriendship.requester,
      addressee: updatedFriendship.addressee,
      status: updatedFriendship.status,
      createdAt: updatedFriendship.createdAt,
    };
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(friendshipId: string, userId: string): Promise<{ success: boolean }> {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    // Only the addressee can reject
    if (friendship.addresseeId !== userId) {
      throw new ForbiddenException('You cannot reject this friend request');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('This friend request is not pending');
    }

    // Delete the friendship record
    await this.prisma.friendship.delete({
      where: { id: friendshipId },
    });

    return { success: true };
  }

  /**
   * Cancel a sent friend request
   */
  async cancelFriendRequest(friendshipId: string, userId: string): Promise<{ success: boolean }> {
    const friendship = await this.prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Friend request not found');
    }

    // Only the requester can cancel
    if (friendship.requesterId !== userId) {
      throw new ForbiddenException('You cannot cancel this friend request');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('This friend request is not pending');
    }

    await this.prisma.friendship.delete({
      where: { id: friendshipId },
    });

    return { success: true };
  }

  /**
   * Remove a friend (unfriend)
   */
  async removeFriend(userId: string, friendId: string): Promise<{ success: boolean }> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
        status: FriendshipStatus.ACCEPTED,
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.friendship.delete({
        where: { id: friendship.id },
      });

      const { requesterId, addresseeId } = friendship;

      // 1. Remove Follow: Requester -> Addressee
      let reqFollowingDec = 0;
      let addrFollowerDec = 0;
      try {
        await tx.follow.delete({
          where: { followerId_followingId: { followerId: requesterId, followingId: addresseeId } },
        });
        reqFollowingDec = 1;
        addrFollowerDec = 1;
      } catch (e) {
        // Not following or already removed
      }

      // 2. Remove Follow: Addressee -> Requester
      let addrFollowingDec = 0;
      let reqFollowerDec = 0;
      try {
        await tx.follow.delete({
          where: { followerId_followingId: { followerId: addresseeId, followingId: requesterId } },
        });
        addrFollowingDec = 1;
        reqFollowerDec = 1;
      } catch (e) {
        // Not following or already removed
      }

      // 3. Decrement Requester Counts
      await tx.user.update({
        where: { id: requesterId },
        data: {
          friendCount: { decrement: 1 },
          followingCount: { decrement: reqFollowingDec },
          followerCount: { decrement: reqFollowerDec },
        },
      });

      // 4. Decrement Addressee Counts
      await tx.user.update({
        where: { id: addresseeId },
        data: {
          friendCount: { decrement: 1 },
          followingCount: { decrement: addrFollowingDec },
          followerCount: { decrement: addrFollowerDec },
        },
      });
    });

    return { success: true };
  }

  /**
   * Get list of friends for a user
   */
  async getFriends(userId: string): Promise<FriendInfo[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: FriendshipStatus.ACCEPTED },
          { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
        ],
      },
      include: {
        requester: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
        addressee: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Return the "other" user in each friendship
    return friendships.map((f) =>
      f.requesterId === userId ? f.addressee : f.requester,
    );
  }

  /**
   * Get pending friend requests received by the user
   */
  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    const requests = await this.prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        requester: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
        addressee: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      requester: r.requester,
      addressee: r.addressee,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Get friend requests sent by the user
   */
  async getSentRequests(userId: string): Promise<FriendRequest[]> {
    const requests = await this.prisma.friendship.findMany({
      where: {
        requesterId: userId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        requester: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
        addressee: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((r) => ({
      id: r.id,
      requester: r.requester,
      addressee: r.addressee,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Get friendship status between two users
   */
  async getFriendshipStatus(userId: string, targetId: string): Promise<FriendshipStatusResult> {
    if (userId === targetId) {
      return { status: 'none' };
    }

    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: targetId },
          { requesterId: targetId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) {
      return { status: 'none' };
    }

    if (friendship.status === FriendshipStatus.ACCEPTED) {
      return { status: 'friends', friendshipId: friendship.id };
    }

    if (friendship.status === FriendshipStatus.BLOCKED) {
      return { status: 'blocked', friendshipId: friendship.id };
    }

    if (friendship.status === FriendshipStatus.PENDING) {
      if (friendship.requesterId === userId) {
        return { status: 'pending_sent', friendshipId: friendship.id };
      } else {
        return { status: 'pending_received', friendshipId: friendship.id };
      }
    }

    return { status: 'none' };
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    if (userId1 === userId2) return false;

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
   * Get list of friend IDs for a user (for privacy filtering)
   */
  async getFriendIds(userId: string): Promise<string[]> {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: FriendshipStatus.ACCEPTED },
          { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
        ],
      },
      select: {
        requesterId: true,
        addresseeId: true,
      },
    });

    return friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId,
    );
  }
}
