import { IsOptional, IsString, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * DTO for querying a random memory with optional exclusion list.
 * Used for the "Teleport" feature to jump to a random past memory.
 * 
 * Story: 4.1 Serendipitous Teleportation
 * - Excludes recently shown memories to avoid immediate repeats
 * - Client tracks last 5 teleported IDs and sends as exclusion list
 */
export class RandomMemoryQueryDto {
  @ApiPropertyOptional({
    description: 'Comma-separated list of memory IDs to exclude (last 5 teleported)',
    example: 'id1,id2,id3',
  })
  @IsOptional()
  @Transform(({ value }) => value?.split(',').filter((id: string) => id.trim()) || [])
  @IsArray()
  @IsString({ each: true })
  exclude?: string[];
}
