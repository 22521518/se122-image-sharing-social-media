import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth-core/guards/roles.guard';
import { Roles } from '../../auth-core/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminReportsService } from '../services/admin-reports.service';
import {
  BanUserDto,
  WarnUserDto,
  DismissReportDto,
  ReportsQueryDto,
} from '../dto/admin-reports.dto';

/**
 * Admin Reports Controller (Story 8.3)
 * Handles admin-level report management: view reports, ban/warn/dismiss users
 */
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) { }

  /**
   * GET /admin/reports?status=ALL
   * Subtask 1.1: Get all reports (PENDING and RESOLVED)
   * Subtask 1.2: Includes full moderation history
   * AC 2: Full history visible
   */
  @Get()
  async getReports(@Query() query: ReportsQueryDto) {
    return this.adminReportsService.getReports(
      query.status || 'ALL',
      query.page || 1,
      query.limit || 20,
    );
  }

  /**
   * POST /admin/reports/users/:userId/ban
   * Subtask 1.3: Ban user with reason and optional duration
   * Subtask 1.4: Sets isBanned flag and bannedUntil date
   * AC 3: Override moderator decisions to ban
   * AC 5: Bans prevent login and hide content
   * AC 6: Logged in AuditLog
   */
  @Post('users/:userId/ban')
  async banUser(
    @Request() req: any,
    @Param('userId') targetUserId: string,
    @Body() dto: BanUserDto,
  ) {
    return this.adminReportsService.banUser(req.user.id, targetUserId, dto);
  }

  /**
   * POST /admin/reports/users/:userId/warn
   * Subtask 1.5: Send warning notification to user
   * AC 4: User receives system notification
   * AC 6: Logged in AuditLog
   */
  @Post('users/:userId/warn')
  async warnUser(
    @Request() req: any,
    @Param('userId') targetUserId: string,
    @Body() dto: WarnUserDto,
  ) {
    return this.adminReportsService.warnUser(req.user.id, targetUserId, dto);
  }

  /**
   * POST /admin/reports/:reportId/dismiss
   * Dismiss a report (final ruling)
   * AC 4: Final ruling - Dismiss
   * AC 6: Logged in AuditLog
   */
  @Post(':reportId/dismiss')
  async dismissReport(
    @Request() req: any,
    @Param('reportId') reportId: string,
    @Body() dto: DismissReportDto,
  ) {
    return this.adminReportsService.dismissReport(req.user.id, reportId, dto.notes);
  }
}

