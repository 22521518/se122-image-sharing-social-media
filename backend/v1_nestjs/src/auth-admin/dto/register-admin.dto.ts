import { IsEmail, IsNotEmpty, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AdminRole {
  moderator = 'moderator',
  admin = 'admin',
}

export class RegisterAdminDto {
  @ApiProperty({
    example: 'moderator@example.com',
    description: 'The email of the admin/moderator',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'The password (min 8 characters)',
    minLength: 8,
  })
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'moderator',
    description: 'The role for the new account (moderator or admin)',
    enum: AdminRole,
  })
  @IsEnum(AdminRole)
  role: AdminRole;
}
