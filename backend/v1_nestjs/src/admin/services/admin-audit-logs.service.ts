import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAction } from '@prisma/client';

/**
 * Audit Logs Service (Story 8.2 - AC 4)
 * Provides paginated audit logs with filters: date range, action type, user
 */
@Injectable()
export class AdminAuditLogsService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Get paginated audit logs with filters (Subtask 2.1, 2.2)
   * 
   * @param params Query parameters for filtering
   * @returns Paginated audit log entries
   */
  async getAuditLogs(params: AuditLogQueryParams): Promise<PaginatedAuditLogs> {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      actionType,
      targetUserId,
      adminId,
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause with filters
    const where: AuditLogWhereClause = {};

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Action type filter
    if (actionType) {
      where.action = actionType;
    }

    // Target user filter
    if (targetUserId) {
      where.targetUserId = targetUserId;
    }

    // Admin (who performed action) filter
    if (adminId) {
      where.adminId = adminId;
    }

    // Execute queries in parallel
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          adminId: true,
          targetUserId: true,
          action: true,
          details: true,
          createdAt: true,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map(log => ({
        id: log.id,
        adminId: log.adminId,
        targetUserId: log.targetUserId,
        action: log.action,
        details: log.details as Record<string, unknown> | null,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get available action types for filter dropdown
   */
  getActionTypes(): AdminAction[] {
    return Object.values(AdminAction);
  }
}

/**
 * Query parameters for audit logs
 */
export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  actionType?: AdminAction;
  targetUserId?: string;
  adminId?: string;
}

/**
 * Paginated audit logs response
 */
export interface PaginatedAuditLogs {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Single audit log entry
 */
export interface AuditLogEntry {
  id: string;
  adminId: string;
  targetUserId: string;
  action: AdminAction;
  details: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Prisma where clause type for audit logs
 */
interface AuditLogWhereClause {
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  action?: AdminAction;
  targetUserId?: string;
  adminId?: string;
}
