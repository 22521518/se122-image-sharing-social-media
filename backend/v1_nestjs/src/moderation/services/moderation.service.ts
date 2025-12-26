import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ResolveReportDto } from '../dto/resolve-report.dto';
import { TargetType, ReportStatus, ModerationAction } from '@prisma/client';

export interface QueuedReport {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  reportCount: number;
  createdAt: Date;
  reporter: {
    id: string;
    name: string | null;
    email: string;
  };
  content?: {
    id: string;
    text?: string;
    authorId?: string;
    authorName?: string | null;
  };
}

export interface ResolveResult {
  reportId: string;
  action: ModerationAction;
  status: ReportStatus;
  logId: string;
}

@Injectable()
export class ModerationService {
  constructor(private prisma: PrismaService) { }

  /**
   * Get pending reports queue for posts, sorted by report count (most reported first)
   * AC 3: Queue sorted by report count
   */
  async getPostQueue(status: ReportStatus = 'PENDING'): Promise<QueuedReport[]> {
    // Get all reports for posts with the specified status
    const reports = await this.prisma.report.findMany({
      where: {
        targetType: 'POST',
        status,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group reports by targetId and count
    const reportsByTarget = new Map<string, {
      reports: typeof reports;
      count: number;
    }>();

    for (const report of reports) {
      const existing = reportsByTarget.get(report.targetId);
      if (existing) {
        existing.reports.push(report);
        existing.count++;
      } else {
        reportsByTarget.set(report.targetId, {
          reports: [report],
          count: 1,
        });
      }
    }

    // Sort by count (most reported first)
    const sortedTargets = Array.from(reportsByTarget.entries())
      .sort((a, b) => b[1].count - a[1].count);

    // Fetch post details and build queue items
    const queueItems: QueuedReport[] = [];

    for (const [targetId, { reports: targetReports, count }] of sortedTargets) {
      const firstReport = targetReports[0];

      // Get reporter info
      const reporter = await this.prisma.user.findUnique({
        where: { id: firstReport.reporterId },
        select: { id: true, name: true, email: true },
      });

      // Get post content
      const post = await this.prisma.post.findUnique({
        where: { id: targetId },
        include: {
          author: {
            select: { id: true, name: true },
          },
        },
      });

      queueItems.push({
        id: firstReport.id,
        targetType: firstReport.targetType,
        targetId: firstReport.targetId,
        reason: firstReport.reason,
        description: firstReport.description,
        status: firstReport.status,
        reportCount: count,
        createdAt: firstReport.createdAt,
        reporter: reporter || { id: firstReport.reporterId, name: null, email: 'unknown' },
        content: post ? {
          id: post.id,
          text: post.content,
          authorId: post.author?.id,
          authorName: post.author?.name,
        } : undefined,
      });
    }

    return queueItems;
  }

  /**
   * Get pending reports queue for comments
   */
  async getCommentQueue(status: ReportStatus = 'PENDING'): Promise<QueuedReport[]> {
    const reports = await this.prisma.report.findMany({
      where: {
        targetType: 'COMMENT',
        status,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group by targetId
    const reportsByTarget = new Map<string, {
      reports: typeof reports;
      count: number;
    }>();

    for (const report of reports) {
      const existing = reportsByTarget.get(report.targetId);
      if (existing) {
        existing.reports.push(report);
        existing.count++;
      } else {
        reportsByTarget.set(report.targetId, {
          reports: [report],
          count: 1,
        });
      }
    }

    const sortedTargets = Array.from(reportsByTarget.entries())
      .sort((a, b) => b[1].count - a[1].count);

    const queueItems: QueuedReport[] = [];

    for (const [targetId, { reports: targetReports, count }] of sortedTargets) {
      const firstReport = targetReports[0];

      const reporter = await this.prisma.user.findUnique({
        where: { id: firstReport.reporterId },
        select: { id: true, name: true, email: true },
      });

      // Get comment with parent post context
      const comment = await this.prisma.comment.findUnique({
        where: { id: targetId },
        include: {
          user: { select: { id: true, name: true } },
          post: { select: { id: true, content: true } },
        },
      });

      queueItems.push({
        id: firstReport.id,
        targetType: firstReport.targetType,
        targetId: firstReport.targetId,
        reason: firstReport.reason,
        description: firstReport.description,
        status: firstReport.status,
        reportCount: count,
        createdAt: firstReport.createdAt,
        reporter: reporter || { id: firstReport.reporterId, name: null, email: 'unknown' },
        content: comment ? {
          id: comment.id,
          text: comment.content,
          authorId: comment.user?.id,
          authorName: comment.user?.name,
        } : undefined,
      });
    }

    return queueItems;
  }

  /**
   * Resolve a report with a moderation action
   * AC 5, 6, 7: Take action, log it, update status
   */
  async resolveReport(
    reportId: string,
    moderatorId: string,
    dto: ResolveReportDto,
  ): Promise<ResolveResult> {
    // Find the report
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestException('Report has already been resolved');
    }

    // Execute action based on type
    await this.executeAction(report.targetType, report.targetId, dto.action);

    // Update report status
    const updatedReport = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: dto.action === 'APPROVE' ? 'DISMISSED' : 'RESOLVED',
      },
    });

    // Also update all other pending reports for the same content
    await this.prisma.report.updateMany({
      where: {
        targetType: report.targetType,
        targetId: report.targetId,
        status: 'PENDING',
        id: { not: reportId },
      },
      data: {
        status: dto.action === 'APPROVE' ? 'DISMISSED' : 'RESOLVED',
      },
    });

    // Create moderation log (AC 6)
    const log = await this.prisma.moderationLog.create({
      data: {
        moderatorId,
        reportId,
        targetType: report.targetType,
        targetId: report.targetId,
        action: dto.action,
        notes: dto.notes,
      },
    });

    return {
      reportId: updatedReport.id,
      action: dto.action,
      status: updatedReport.status,
      logId: log.id,
    };
  }

  /**
   * Execute the moderation action on the content
   */
  private async executeAction(
    targetType: TargetType,
    targetId: string,
    action: ModerationAction,
  ): Promise<void> {
    switch (targetType) {
      case 'POST':
        await this.executePostAction(targetId, action);
        break;
      case 'COMMENT':
        await this.executeCommentAction(targetId, action);
        break;
      case 'USER':
        // User actions would be implemented in Story 8
        break;
    }
  }

  private async executePostAction(
    postId: string,
    action: ModerationAction,
  ): Promise<void> {
    switch (action) {
      case 'APPROVE':
        // No action needed - content is OK
        break;
      case 'HIDE':
        // Soft delete
        await this.prisma.post.update({
          where: { id: postId },
          data: { deletedAt: new Date() },
        });
        break;
      case 'DELETE':
        // Hard delete (using soft delete for safety)
        await this.prisma.post.update({
          where: { id: postId },
          data: { deletedAt: new Date() },
        });
        break;
    }
  }

  private async executeCommentAction(
    commentId: string,
    action: ModerationAction,
  ): Promise<void> {
    switch (action) {
      case 'APPROVE':
        break;
      case 'HIDE':
      case 'DELETE':
        await this.prisma.comment.update({
          where: { id: commentId },
          data: { deletedAt: new Date() },
        });
        break;
    }
  }

  /**
   * Lock comments on a post
   * AC 3 (Story 7.3): Lock thread
   */
  async lockPostComments(postId: string, moderatorId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Note: We'd need to add a 'commentsLocked' field to the Post model
    // For now, log the action
    await this.prisma.moderationLog.create({
      data: {
        moderatorId,
        targetType: 'POST',
        targetId: postId,
        action: 'LOCK',
        notes: 'Comments locked on this post',
      },
    });
  }
}
