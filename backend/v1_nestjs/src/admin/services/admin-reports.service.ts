import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ReportStatus,
  TargetType,
  AdminAction,
  ModerationAction,
  NotificationType,
} from '@prisma/client';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * Admin Report Details with full moderation history
 * AC 2: Full history including reporter, target, all moderator actions, timestamps
 */
export interface AdminReportDetails {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
  reporter: {
    id: string;
    name: string | null;
    email: string;
  };
  target?: {
    id: string;
    type: TargetType;
    content?: string;
    authorId?: string;
    authorName?: string | null;
    authorEmail?: string;
  };
  moderationHistory: {
    id: string;
    action: ModerationAction;
    notes: string | null;
    moderatorId: string;
    moderatorName: string | null;
    createdAt: Date;
  }[];
}

export interface BanUserDto {
  reason: string;
  duration?: number; // Duration in days, null = permanent
}

export interface WarnUserDto {
  reason: string;
}

/**
 * Admin Reports Service (Story 8.3)
 * Handles high-level report management, user banning, and warnings
 */
@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) { }

  /**
   * Get all reports with full moderation history (Subtask 1.1, 1.2)
   * AC 2: Full history including reporter, target, all moderator actions
   */
  async getReports(
    status?: ReportStatus | 'ALL',
    page = 1,
    limit = 20,
  ): Promise<{
    reports: AdminReportDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const where =
      status && status !== 'ALL'
        ? { status: status as ReportStatus }
        : {};

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.report.count({ where }),
    ]);

    // Enrich each report with full details
    const enrichedReports: AdminReportDetails[] = [];

    for (const report of reports) {
      // Get reporter info
      const reporter = await this.prisma.user.findUnique({
        where: { id: report.reporterId },
        select: { id: true, name: true, email: true },
      });

      // Get target content
      const target = await this.getTargetDetails(
        report.targetType,
        report.targetId,
      );

      // Get moderation history (AC 2)
      const moderationLogs = await this.prisma.moderationLog.findMany({
        where: {
          targetType: report.targetType,
          targetId: report.targetId,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Enrich moderation logs with moderator names
      const moderationHistory = await Promise.all(
        moderationLogs.map(async (log) => {
          const moderator = await this.prisma.user.findUnique({
            where: { id: log.moderatorId },
            select: { name: true },
          });
          return {
            id: log.id,
            action: log.action,
            notes: log.notes,
            moderatorId: log.moderatorId,
            moderatorName: moderator?.name || null,
            createdAt: log.createdAt,
          };
        }),
      );

      enrichedReports.push({
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
        reporter: reporter || {
          id: report.reporterId,
          name: null,
          email: 'unknown',
        },
        target,
        moderationHistory,
      });
    }

    return {
      reports: enrichedReports,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Ban a user (Subtask 1.3, 1.4)
   * AC 3: Override moderator decisions to ban
   * AC 5: Ban prevents user login and hides content
   * AC 6: Logged in AuditLog
   */
  async banUser(
    adminId: string,
    targetUserId: string,
    dto: BanUserDto,
  ): Promise<{ success: boolean; bannedUntil: Date | null }> {
    // Prevent self-ban
    if (adminId === targetUserId) {
      throw new ForbiddenException('Cannot ban your own account');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isBanned: true, tokenVersion: true, role: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Calculate bannedUntil date
    const bannedUntil = dto.duration
      ? new Date(Date.now() + dto.duration * 24 * 60 * 60 * 1000)
      : null; // null = permanent

    // Update user: set ban flags and increment tokenVersion for immediate logout
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        isBanned: true,
        bannedUntil,
        tokenVersion: targetUser.tokenVersion + 1,
      },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId: targetUserId },
      data: { revoked: true },
    });

    // Log admin action (AC 6)
    await this.prisma.auditLog.create({
      data: {
        adminId,
        targetUserId,
        action: AdminAction.USER_BAN,
        details: {
          reason: dto.reason,
          duration: dto.duration || 'permanent',
          bannedUntil: bannedUntil?.toISOString() || null,
        },
      },
    });

    // Story 9.2 AC 3-4: Send system notification to banned user
    const banDuration = dto.duration
      ? `for ${dto.duration} day(s)`
      : 'permanently';
    await this.notificationsService.create({
      userId: targetUserId,
      type: NotificationType.SYSTEM_WARN,
      title: 'Account Banned',
      message: `Your account has been banned ${banDuration}. Reason: ${dto.reason}`,
      data: { reason: dto.reason, duration: dto.duration || 'permanent', bannedUntil: bannedUntil?.toISOString() || null },
    });
    this.logger.debug(`Sent SYSTEM_WARN (ban) notification to ${targetUserId}`);

    return { success: true, bannedUntil };
  }

  /**
   * Warn a user (Subtask 1.5)
   * AC 4: System notification sent to user
   * AC 6: Logged in AuditLog
   */
  async warnUser(
    adminId: string,
    targetUserId: string,
    dto: WarnUserDto,
  ): Promise<{ success: boolean }> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Log admin action (AC 6)
    await this.prisma.auditLog.create({
      data: {
        adminId,
        targetUserId,
        action: AdminAction.USER_WARN,
        details: {
          reason: dto.reason,
        },
      },
    });

    // Story 9.2 AC 3-4: Send system notification to warned user
    await this.notificationsService.create({
      userId: targetUserId,
      type: NotificationType.SYSTEM_WARN,
      title: 'Account Warning ⚠️',
      message: `You have received a warning from the moderation team. Reason: ${dto.reason}`,
      data: { reason: dto.reason },
    });
    this.logger.debug(`Sent SYSTEM_WARN notification to ${targetUserId}`);

    return { success: true };
  }

  /**
   * Dismiss a report (final ruling)
   * AC 4: Final ruling dismisses report
   * AC 6: Logged in AuditLog
   */
  async dismissReport(
    adminId: string,
    reportId: string,
    notes?: string,
  ): Promise<{ success: boolean }> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Update report status to DISMISSED
    await this.prisma.report.update({
      where: { id: reportId },
      data: { status: ReportStatus.DISMISSED },
    });

    // Create moderation log
    await this.prisma.moderationLog.create({
      data: {
        moderatorId: adminId,
        reportId,
        targetType: report.targetType,
        targetId: report.targetId,
        action: ModerationAction.APPROVE,
        notes: notes || 'Dismissed by admin',
      },
    });

    // Log admin action if target is a user
    if (report.targetType === TargetType.USER) {
      await this.prisma.auditLog.create({
        data: {
          adminId,
          targetUserId: report.targetId,
          action: AdminAction.USER_DISMISS,
          details: {
            reportId,
            notes,
          },
        },
      });
    }

    return { success: true };
  }

  /**
   * Get details about the reported target
   */
  private async getTargetDetails(
    targetType: TargetType,
    targetId: string,
  ): Promise<AdminReportDetails['target'] | undefined> {
    switch (targetType) {
      case TargetType.POST:
        const post = await this.prisma.post.findUnique({
          where: { id: targetId },
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
        });
        if (!post) return undefined;
        return {
          id: post.id,
          type: TargetType.POST,
          content: post.content,
          authorId: post.author?.id,
          authorName: post.author?.name,
          authorEmail: post.author?.email,
        };

      case TargetType.COMMENT:
        const comment = await this.prisma.comment.findUnique({
          where: { id: targetId },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        });
        if (!comment) return undefined;
        return {
          id: comment.id,
          type: TargetType.COMMENT,
          content: comment.content,
          authorId: comment.user?.id,
          authorName: comment.user?.name,
          authorEmail: comment.user?.email,
        };

      case TargetType.USER:
        const user = await this.prisma.user.findUnique({
          where: { id: targetId },
          select: { id: true, name: true, email: true },
        });
        if (!user) return undefined;
        return {
          id: user.id,
          type: TargetType.USER,
          authorId: user.id,
          authorName: user.name,
          authorEmail: user.email,
        };

      case TargetType.MEMORY:
        const memory = await this.prisma.memory.findUnique({
          where: { id: targetId },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        });
        if (!memory) return undefined;
        return {
          id: memory.id,
          type: TargetType.MEMORY,
          content: memory.title || `[${memory.type}] ${memory.feeling || ''}`,
          authorId: memory.user?.id,
          authorName: memory.user?.name,
          authorEmail: memory.user?.email,
        };

      default:
        return undefined;
    }
  }
}
