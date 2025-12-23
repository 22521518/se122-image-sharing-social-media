import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'Comment content',
    maxLength: 500,
    minLength: 1,
    example: 'Great post! Thanks for sharing.',
  })
  @IsString()
  @MinLength(1, { message: 'Comment cannot be empty' })
  @MaxLength(500, { message: 'Comment cannot exceed 500 characters' })
  content: string;
}
