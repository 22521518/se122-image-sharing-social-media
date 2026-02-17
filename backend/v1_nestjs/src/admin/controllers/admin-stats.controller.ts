import {
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth-core/guards/roles.guard';
import { Roles } from '../../auth-core/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminStatsService, SystemStats } from '../services/admin-stats.service';

/**
 * Admin Stats Controller (Story 8.2 - AC 1, 2, 3)
 * Endpoints for system monitoring and statistics
 * Protected by JWT auth + ADMIN role guard
 */
@Controller('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) { }

  /**
   * Get system stats (Subtask 1.1, AC 3)
   * GET /admin/stats
   * Returns cached stats (5min TTL)
   */
  @Get()
  async getStats(): Promise<SystemStats> {
    return this.adminStatsService.getStats();
  }

  /**
   * Force refresh stats (bypass cache)
   * POST /admin/stats/refresh
   */
  @Post('refresh')
  async refreshStats(): Promise<SystemStats> {
    return this.adminStatsService.refreshStats();
  }
}
