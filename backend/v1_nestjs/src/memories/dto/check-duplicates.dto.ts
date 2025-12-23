import { IsArray, IsString, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckDuplicatesDto {
  @ApiProperty({
    description: 'Array of file hashes to check for duplicates',
    example: ['a1b2c3d4e5f6...', 'g7h8i9j0k1l2...'],
    maxItems: 100,
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  hashes: string[];
}

export class CheckDuplicatesResponseDto {
  @ApiProperty({
    description: 'Set of hashes that already exist in the database',
    example: ['a1b2c3d4e5f6...'],
  })
  duplicates: string[];

  @ApiProperty({
    description: 'Total number of duplicates found',
    example: 3,
  })
  count: number;
}
