import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, AdminAction, User } from '@prisma/client';

/**
 * Admin Users Service (Story 8.1 - AC 4, 5, 6, 7)
 * Handles user management: role assignment, account locking, and audit logging
 */
@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Search users by username/email (AC 2)
   */
  async searchUsers(query: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where = query
      ? {
        OR: [
          { email: { contains: query } },
          { name: { contains: query } },
        ],
        deletedAt: null,
      }
      : { deletedAt: null };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isLocked: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isLocked: u.isLocked,
        joinDate: u.createdAt,
        postCount: u._count.posts,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user details (AC 3)
   */
  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isLocked: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            memories: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isLocked: user.isLocked,
      joinDate: user.createdAt,
      postCount: user._count.posts,
      memoryCount: user._count.memories,
      followerCount: user._count.followers,
      followingCount: user._count.following,
    };
  }

  /**
   * Update user roles (Subtask 1.1, AC 5, 6, 7)
   * - Assigns roles to user
   * - Logs action to AuditLog (AC 6)
   * - Prevents self-demotion from admin role (AC 7)
   */
  async updateRoles(
    adminId: string,
    targetUserId: string,
    newRoles: UserRole[],
  ) {
    // AC 7: Cannot demote own admin role
    if (adminId === targetUserId) {
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true },
      });

      if (admin?.role === UserRole.admin && !newRoles.includes(UserRole.admin)) {
        throw new ForbiddenException('Cannot remove your own admin role');
      }
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { role: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // For now, we use a single role (Prisma schema has role as single enum)
    // The API accepts array for future multi-role support
    const primaryRole = this.getPrimaryRole(newRoles);

    // Update user role
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: primaryRole },
    });

    // AC 6: Log role change to AuditLog (Subtask 1.5)
    await this.prisma.auditLog.create({
      data: {
        adminId,
        targetUserId,
        action: AdminAction.ROLE_CHANGE,
        details: {
          previousRole: targetUser.role,
          newRole: primaryRole,
          requestedRoles: newRoles,
        },
      },
    });

    return { success: true, role: primaryRole };
  }

  /**
   * Lock/unlock user account (Subtask 1.3, 1.4, AC 4)
   * - Sets isLocked flag (AC 4: cannot log in)
   * - Increments tokenVersion to invalidate existing tokens (Subtask 1.4)
   * - Logs action to AuditLog (AC 6)
   */
  async setAccountLock(
    adminId: string,
    targetUserId: string,
    locked: boolean,
  ) {
    // Prevent locking own account
    if (adminId === targetUserId) {
      throw new ForbiddenException('Cannot lock your own account');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isLocked: true, tokenVersion: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Update lock status and increment tokenVersion for immediate logout (Subtask 1.4)
    const updateData: { isLocked: boolean; tokenVersion?: number } = {
      isLocked: locked,
    };

    // Only increment tokenVersion when locking (to invalidate existing tokens)
    if (locked && !targetUser.isLocked) {
      updateData.tokenVersion = targetUser.tokenVersion + 1;
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    // Revoke all refresh tokens when locking
    if (locked) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: targetUserId },
        data: { revoked: true },
      });
    }

    // AC 6: Log action to AuditLog
    await this.prisma.auditLog.create({
      data: {
        adminId,
        targetUserId,
        action: locked ? AdminAction.ACCOUNT_LOCK : AdminAction.ACCOUNT_UNLOCK,
        details: {
          previousLocked: targetUser.isLocked,
          newLocked: locked,
        },
      },
    });

    return { success: true, isLocked: locked };
  }

  /**
   * Get audit log entries for a user
   */
  async getAuditLog(targetUserId?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const where = targetUserId ? { targetUserId } : {};

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Helper: Determine primary role from array (admin > moderator > user)
   */
  private getPrimaryRole(roles: UserRole[]): UserRole {
    if (roles.includes(UserRole.admin)) return UserRole.admin;
    if (roles.includes(UserRole.moderator)) return UserRole.moderator;
    return UserRole.user;
  }
}
