import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth-core/guards/roles.guard';
import { Roles } from '../../auth-core/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminAuditLogsService, PaginatedAuditLogs } from '../services/admin-audit-logs.service';
import { AuditLogQueryDto } from '../dto';

/**
 * Admin Audit Logs Controller (Story 8.2 - AC 4)
 * Endpoints for viewing paginated audit logs with filters
 * Protected by JWT auth + ADMIN role guard
 */
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class AdminAuditLogsController {
  constructor(private readonly auditLogsService: AdminAuditLogsService) { }

  /**
   * Get paginated audit logs (Subtask 2.1, AC 4)
   * GET /admin/audit-logs?page=1&limit=50&startDate=...&endDate=...&actionType=...&targetUserId=...&adminId=...
   */
  @Get()
  async getAuditLogs(@Query() query: AuditLogQueryDto): Promise<PaginatedAuditLogs> {
    return this.auditLogsService.getAuditLogs({
      page: query.page,
      limit: query.limit,
      startDate: query.startDate,
      endDate: query.endDate,
      actionType: query.actionType,
      targetUserId: query.targetUserId,
      adminId: query.adminId,
    });
  }

  /**
   * Get available action types for filter dropdown
   * GET /admin/audit-logs/action-types
   */
  @Get('action-types')
  getActionTypes(): string[] {
    return this.auditLogsService.getActionTypes();
  }
}
