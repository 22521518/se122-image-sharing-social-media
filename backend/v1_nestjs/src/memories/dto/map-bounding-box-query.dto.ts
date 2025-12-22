import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * DTO for querying memories within a map viewport's bounding box.
 * GPS coordinates use WGS84 format (standard for mapping).
 * 
 * Story: 2.4a Map Viewport Logic
 * - Validates bbox parameters (minLat, minLng, maxLat, maxLng)
 * - Supports optional limit for result set control
 */
export class MapBoundingBoxQueryDto {
  @ApiProperty({
    description: 'Minimum latitude of bounding box (southern boundary)',
    minimum: -90,
    maximum: 90,
    example: 10.5,
  })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  minLat: number;

  @ApiProperty({
    description: 'Minimum longitude of bounding box (western boundary)',
    minimum: -180,
    maximum: 180,
    example: 106.0,
  })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  minLng: number;

  @ApiProperty({
    description: 'Maximum latitude of bounding box (northern boundary)',
    minimum: -90,
    maximum: 90,
    example: 11.0,
  })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(-90)
  @Max(90)
  maxLat: number;

  @ApiProperty({
    description: 'Maximum longitude of bounding box (eastern boundary)',
    minimum: -180,
    maximum: 180,
    example: 107.0,
  })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(-180)
  @Max(180)
  maxLng: number;

  @ApiPropertyOptional({
    description: 'Maximum number of memories to return (prevents performance degradation on large areas)',
    minimum: 1,
    maximum: 100,
    default: 50,
    example: 50,
  })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
