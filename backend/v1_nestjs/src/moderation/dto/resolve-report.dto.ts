import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModerationAction } from '@prisma/client';

export class ResolveReportDto {
  @ApiProperty({
    description: 'Action to take on the reported content',
    enum: ['APPROVE', 'HIDE', 'DELETE'],
    example: 'HIDE',
  })
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @ApiPropertyOptional({
    description: 'Optional notes about the moderation action',
    maxLength: 500,
    example: 'Content clearly violates spam policy',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
