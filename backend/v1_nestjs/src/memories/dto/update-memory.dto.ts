import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { Feeling, PrivacyLevel } from '@prisma/client';

export class UpdateMemoryDto {
  @ApiPropertyOptional({ description: 'Title/Caption' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: PrivacyLevel })
  @IsOptional()
  @IsEnum(PrivacyLevel)
  privacy?: PrivacyLevel;

  @ApiPropertyOptional({ enum: Feeling })
  @IsOptional()
  @IsEnum(Feeling)
  feeling?: Feeling;
}
