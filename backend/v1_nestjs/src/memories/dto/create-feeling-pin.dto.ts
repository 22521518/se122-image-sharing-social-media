import { IsNumber, IsOptional, IsString, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PrivacyLevel, Feeling } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a feeling-first memory pin (voice or text-only with no photo).
 * These pins get beautiful abstract placeholder visuals rendered client-side.
 */
export class CreateFeelingPinDto {
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

  @ApiProperty({
    description: 'Emotional feeling associated with this memory',
    enum: Feeling,
    example: 'JOY',
  })
  @IsEnum(Feeling)
  feeling: Feeling;

  @ApiPropertyOptional({
    description: 'Optional title or caption for the memory',
    example: 'A moment of peace at the park',
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

  @ApiPropertyOptional({
    description: 'Duration in seconds (for optional voice attachment, 1-6s)',
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
}
