import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, MaxLength, IsArray, ArrayMaxSize } from 'class-validator';
import { PrivacyLevel } from '@prisma/client';

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
    type: [Object],
    example: [{ mediaId: 'uuid', caption: 'My caption', sortOrder: 0 }]
  })
  @IsArray()
  @IsOptional()
  mediaMetadata?: Array<{
    mediaId: string;
    caption?: string;
    sortOrder: number;
  }>;
}
