import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth-core/guards/roles.guard';
import { Roles } from '../../auth-core/decorators/roles.decorator';
import { ModerationService } from '../services/moderation.service';
import { ResolveReportDto } from '../dto/resolve-report.dto';
import { ReportStatus } from '@prisma/client';

@ApiTags('moderation')
@ApiBearerAuth()
@Controller('moderation')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) { }

  /**
   * Get queue of pending post reports
   * AC 3: Sorted by report count (most reported first)
   */
  @Get('queue/posts')
  @Roles('moderator', 'admin')
  @ApiOperation({
    summary: 'Get post moderation queue',
    description: 'Get queue of pending post reports, sorted by report count',
  })
  @ApiQuery({
    name: 'status',
    enum: ['PENDING', 'RESOLVED', 'DISMISSED'],
    required: false,
    description: 'Filter by report status (default: PENDING)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns list of queued reports',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - requires MODERATOR or ADMIN role',
  })
  async getPostQueue(@Query('status') status?: ReportStatus) {
    return this.moderationService.getPostQueue(status || 'PENDING');
  }

  /**
   * Get queue of pending comment reports
   */
  @Get('queue/comments')
  @Roles('moderator', 'admin')
  @ApiOperation({
    summary: 'Get comment moderation queue',
    description: 'Get queue of pending comment reports, sorted by report count',
  })
  @ApiQuery({
    name: 'status',
    enum: ['PENDING', 'RESOLVED', 'DISMISSED'],
    required: false,
  })
  async getCommentQueue(@Query('status') status?: ReportStatus) {
    return this.moderationService.getCommentQueue(status || 'PENDING');
  }

  /**
   * Resolve a report with a moderation action
   * AC 5, 6, 7: Take action, log it, update status
   */
  @Post('resolve/:reportId')
  @Roles('moderator', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resolve a report',
    description: 'Take moderation action on reported content and log the action',
  })
  @ApiParam({
    name: 'reportId',
    description: 'ID of the report to resolve',
  })
  @ApiBody({ type: ResolveReportDto })
  @ApiResponse({
    status: 200,
    description: 'Report resolved successfully',
    schema: {
      type: 'object',
      properties: {
        reportId: { type: 'string', format: 'uuid' },
        action: { type: 'string', enum: ['APPROVE', 'HIDE', 'DELETE'] },
        status: { type: 'string', enum: ['RESOLVED', 'DISMISSED'] },
        logId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - requires MODERATOR or ADMIN role',
  })
  @ApiResponse({
    status: 404,
    description: 'Report not found',
  })
  async resolveReport(
    @Param('reportId') reportId: string,
    @Body() dto: ResolveReportDto,
    @Req() req: any,
  ) {
    const moderatorId = req.user.id;
    return this.moderationService.resolveReport(reportId, moderatorId, dto);
  }

  /**
   * Lock comments on a post (Story 7.3)
   */
  @Post('posts/:postId/lock-comments')
  @Roles('moderator', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lock comments on a post',
    description: 'Prevent new comments on a post for moderation purposes',
  })
  @ApiParam({
    name: 'postId',
    description: 'ID of the post to lock comments on',
  })
  @ApiResponse({
    status: 200,
    description: 'Comments locked successfully',
  })
  async lockPostComments(
    @Param('postId') postId: string,
    @Req() req: any,
  ) {
    const moderatorId = req.user.id;
    await this.moderationService.lockPostComments(postId, moderatorId);
    return { success: true, message: 'Comments have been locked on this post' };
  }
}
