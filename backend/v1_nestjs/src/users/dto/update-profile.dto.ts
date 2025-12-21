import { IsString, IsOptional, Length, IsUrl, IsEnum } from 'class-validator';
import { PrivacyLevel } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 50, { message: 'Display name must be between 2 and 50 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(PrivacyLevel)
  defaultPrivacy?: PrivacyLevel;
}
