import { IsNumber, IsOptional, IsString, Min, Max, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PrivacyLevel } from '@prisma/client';

export class CreateVoiceMemoryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  duration?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(PrivacyLevel)
  privacy?: PrivacyLevel;
}

