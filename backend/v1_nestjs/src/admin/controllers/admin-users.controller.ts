import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth-core/guards/roles.guard';
import { Roles } from '../../auth-core/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminUsersService } from '../services/admin-users.service';
import { UpdateRolesDto, LockAccountDto } from '../dto';

/**
 * Admin Users Controller (Story 8.1)
 * Endpoints for user management in admin console
 * Protected by JWT auth + ADMIN role guard
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) { }

  /**
   * Search/list users (AC 2, 3)
   * GET /admin/users?q=searchterm&page=1&limit=20
   */
  @Get()
  async searchUsers(
    @Query('q') query?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminUsersService.searchUsers(
      query || '',
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
  }

  /**
   * Get audit log (AC 6)
   * GET /admin/users/audit-log?targetUserId=xxx&page=1&limit=50
   * NOTE: Must be BEFORE :userId route to avoid being captured by param
   */
  @Get('audit-log')
  async getAuditLog(
    @Query('targetUserId') targetUserId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminUsersService.getAuditLog(
      targetUserId,
      parseInt(page || '1', 10),
      parseInt(limit || '50', 10),
    );
  }

  /**
   * Get user details (AC 3)
   * GET /admin/users/:userId
   */
  @Get(':userId')
  async getUserDetails(@Param('userId') userId: string) {
    return this.adminUsersService.getUserDetails(userId);
  }

  /**
   * Update user roles (Subtask 1.1, AC 5, 6, 7)
   * PUT /admin/users/:userId/roles
   */
  @Put(':userId/roles')
  async updateRoles(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() dto: UpdateRolesDto,
  ) {
    return this.adminUsersService.updateRoles(req.user.id, userId, dto.roles);
  }

  /**
   * Lock/unlock user account (Subtask 1.3, AC 4)
   * PUT /admin/users/:userId/lock
   */
  @Put(':userId/lock')
  async setAccountLock(
    @Request() req: any,
    @Param('userId') userId: string,
    @Body() dto: LockAccountDto,
  ) {
    return this.adminUsersService.setAccountLock(req.user.id, userId, dto.locked);
  }
}
