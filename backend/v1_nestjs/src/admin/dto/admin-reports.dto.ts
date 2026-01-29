import { IsString, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for querying reports (Story 8.3)
 * Validates query parameters with proper type transformation
 */
export class ReportsQueryDto {
  @IsOptional()
  @IsIn(['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'])
  status?: 'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED' = 'ALL';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * DTO for banning a user (Story 8.3)
 * AC 3: Ban with optional duration for temporary bans
 */
export class BanUserDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365) // Max 1 year temporary ban
  duration?: number; // Duration in days, omit for permanent ban
}

/**
 * DTO for warning a user (Story 8.3)
 * AC 4: Send warning notification
 */
export class WarnUserDto {
  @IsString()
  reason: string;
}

/**
 * DTO for dismissing a report (Story 8.3)
 */
export class DismissReportDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

