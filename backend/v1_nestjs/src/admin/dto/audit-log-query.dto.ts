import { IsOptional, IsDateString, IsEnum, IsUUID, IsInt, IsPositive } from 'class-validator';
import { AdminAction } from '@prisma/client';
import { Type } from 'class-transformer';

/**
 * Query DTO for audit logs filtering (Story 8.2 - AC 4)
 * Supports filters: date range, action type, user
 */
export class AuditLogQueryDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(AdminAction)
  actionType?: AdminAction;

  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @IsOptional()
  @IsUUID()
  adminId?: string;
}
