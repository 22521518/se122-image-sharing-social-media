import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, MaxLength, IsArray, ArrayMaxSize, ValidateNested, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { PrivacyLevel } from '@prisma/client';

// Nested DTO for proper validation of media metadata items (Issue #1 Fix)
export class MediaMetadataDto {
  @ApiProperty({ description: 'Media ID (UUID)' })
  @IsString()
  @IsUUID()
  mediaId: string;

  @ApiProperty({ description: 'Caption for this media item', maxLength: 200, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;

  @ApiProperty({ description: 'Sort order (0-based index)', minimum: 0, maximum: 9 })
  @IsInt()
  @Min(0)
  @Max(9)
  sortOrder: number;
}

export class CreatePostDto {
  @ApiProperty({ description: 'Content of the post', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  content: string;

  @ApiProperty({ enum: PrivacyLevel, default: PrivacyLevel.friends })
  @IsEnum(PrivacyLevel)
  @IsOptional()
  privacy?: PrivacyLevel;

  @ApiProperty({ description: 'Array of media IDs uploaded previously', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(10)
  mediaIds?: string[];

  @ApiProperty({
    description: 'Metadata for each media item (caption, sortOrder)',
    required: false,
    type: [MediaMetadataDto],
    example: [{ mediaId: 'uuid', caption: 'My caption', sortOrder: 0 }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaMetadataDto)
  @IsOptional()
  @ArrayMaxSize(10)
  mediaMetadata?: MediaMetadataDto[];
}
