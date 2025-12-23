import { IsNumber, IsOptional, IsString, IsEnum, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PrivacyLevel } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePhotoMemoryDto {
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
    description: 'Optional title or caption for the photo memory',
    example: 'Sunset at the beach',
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
    description: 'EXIF DateTimeOriginal from the photo',
    example: '2025:12:21 14:30:00',
  })
  @IsOptional()
  @IsString()
  timestamp?: string;
}
