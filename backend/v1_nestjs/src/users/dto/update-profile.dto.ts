import { IsString, IsOptional, Length, IsUrl, IsEnum } from 'class-validator';
import { PrivacyLevel } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'The display name of the user',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(2, 50, { message: 'Display name must be between 2 and 50 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 'I love photography',
    description: 'A short bio of the user',
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'URL to the user avatar (optional, used if not uploading file)',
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Avatar image file',
  })
  @IsOptional()
  file?: any;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    enum: PrivacyLevel,
    example: 'public',
    description: 'Default privacy level for posts',
  })
  @IsOptional()
  @IsEnum(PrivacyLevel)
  defaultPrivacy?: PrivacyLevel;
}
