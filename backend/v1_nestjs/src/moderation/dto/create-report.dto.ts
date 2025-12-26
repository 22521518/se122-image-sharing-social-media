import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason, TargetType } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({
    description: 'Type of content being reported',
    enum: ['POST', 'COMMENT', 'USER'],
    example: 'POST',
  })
  @IsEnum(TargetType)
  targetType: TargetType;

  @ApiProperty({
    description: 'ID of the content being reported',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  targetId: string;

  @ApiProperty({
    description: 'Reason for the report',
    enum: ['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'OTHER'],
    example: 'SPAM',
  })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({
    description: 'Additional description for the report',
    maxLength: 500,
    example: 'This post contains spam links',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether to also block the user who created the reported content',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  blockUser?: boolean;
}
