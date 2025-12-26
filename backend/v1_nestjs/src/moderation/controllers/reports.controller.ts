import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { ReportsService } from '../services/reports.service';
import { CreateReportDto } from '../dto/create-report.dto';

@ApiTags('moderation')
@ApiBearerAuth()
@Controller('moderation/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) { }

  /**
   * Create a new report for content violation
   * AC 3: Creates report with status PENDING
   * AC 6: Idempotent - returns 409 if already reported
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Report content for violation',
    description:
      'Submit a report for a post, comment, or user that violates community standards',
  })
  @ApiBody({ type: CreateReportDto })
  @ApiResponse({
    status: 201,
    description: 'Report created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        targetType: { type: 'string', enum: ['POST', 'COMMENT', 'USER'] },
        targetId: { type: 'string', format: 'uuid' },
        reason: {
          type: 'string',
          enum: ['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'OTHER'],
        },
        description: { type: 'string', nullable: true },
        status: { type: 'string', enum: ['PENDING'] },
        createdAt: { type: 'string', format: 'date-time' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User has already reported this content',
  })
  @ApiResponse({
    status: 404,
    description: 'Target content not found',
  })
  async createReport(@Body() dto: CreateReportDto, @Req() req: any) {
    const userId = req.user.id;
    const report = await this.reportsService.createReport(userId, dto);

    // AC 5: Handle optional user blocking
    // Note: Block functionality will be implemented via the social graph module
    // For now, we just acknowledge the request
    if (dto.blockUser) {
      // TODO: Integrate with social graph block functionality when available
      // This would be: await this.graphService.blockUser(userId, targetUserId);
    }

    return {
      ...report,
      message: 'Thank you for reporting. Our moderators will review this content.',
    };
  }
}
