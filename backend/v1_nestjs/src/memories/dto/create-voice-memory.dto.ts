import { IsNumber, IsOptional, IsString, Min, Max, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PrivacyLevel } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVoiceMemoryDto {
  @ApiProperty({
    description: 'GPS latitude coordinate (-90 to 90)',
    example: 10.762622,
    minimum: -90,
    maximum: 90,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'GPS longitude coordinate (-180 to 180)',
    example: 106.660172,
    minimum: -180,
    maximum: 180,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    description: 'Duration of the voice recording in seconds (1-6)',
    example: 3.5,
    minimum: 1,
    maximum: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(6)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Optional title or caption for the voice memory',
    example: 'Morning thoughts',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Privacy level for the memory',
    enum: PrivacyLevel,
    example: 'private',
    default: 'private',
  })
  @IsOptional()
  @IsEnum(PrivacyLevel)
  privacy?: PrivacyLevel;
}
