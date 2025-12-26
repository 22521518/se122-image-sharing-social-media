import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReportDto } from '../dto/create-report.dto';
import { TargetType, ReportStatus } from '@prisma/client';

export interface ReportResult {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  createdAt: Date;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) { }

  /**
   * Create a new report for a post, comment, or user
   * AC 3: Creates report with status PENDING
   * AC 6: Prevents duplicate reports via unique constraint
   */
  async createReport(
    reporterId: string,
    dto: CreateReportDto,
  ): Promise<ReportResult> {
    // Validate that target exists
    await this.validateTargetExists(dto.targetType, dto.targetId);

    // Prevent self-reporting
    if (dto.targetType === 'USER' && dto.targetId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }

    try {
      const report = await this.prisma.report.create({
        data: {
          reporterId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          reason: dto.reason,
          description: dto.description,
          status: 'PENDING',
        },
      });

      return {
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt,
      };
    } catch (error: any) {
      // Handle unique constraint violation (duplicate report)
      if (error.code === 'P2002') {
        throw new ConflictException(
          'You have already reported this content',
        );
      }
      throw error;
    }
  }

  /**
   * Validate that the target content exists
   */
  private async validateTargetExists(
    targetType: TargetType,
    targetId: string,
  ): Promise<void> {
    let exists = false;

    switch (targetType) {
      case 'POST':
        const post = await this.prisma.post.findUnique({
          where: { id: targetId },
          select: { id: true, deletedAt: true },
        });
        exists = post !== null && post.deletedAt === null;
        break;

      case 'COMMENT':
        const comment = await this.prisma.comment.findUnique({
          where: { id: targetId },
          select: { id: true, deletedAt: true },
        });
        exists = comment !== null && comment.deletedAt === null;
        break;

      case 'USER':
        const user = await this.prisma.user.findUnique({
          where: { id: targetId },
          select: { id: true, deletedAt: true },
        });
        exists = user !== null && user.deletedAt === null;
        break;
    }

    if (!exists) {
      throw new NotFoundException(
        `${targetType.toLowerCase()} not found or has been deleted`,
      );
    }
  }

  /**
   * Get the user ID who created the reported content
   * Used for the optional "block user" feature
   */
  async getContentAuthorId(
    targetType: TargetType,
    targetId: string,
  ): Promise<string | null> {
    switch (targetType) {
      case 'POST':
        const post = await this.prisma.post.findUnique({
          where: { id: targetId },
          select: { authorId: true },
        });
        return post?.authorId ?? null;

      case 'COMMENT':
        const comment = await this.prisma.comment.findUnique({
          where: { id: targetId },
          select: { userId: true },
        });
        return comment?.userId ?? null;

      case 'USER':
        return targetId; // The target is the user themselves

      default:
        return null;
    }
  }
}
