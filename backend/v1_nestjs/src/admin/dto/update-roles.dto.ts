import { IsArray, IsEnum, ArrayMinSize, IsNotEmpty } from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * DTO for updating user roles (Subtask 1.1)
 * AC 5: Assign MODERATOR role to give moderation dashboard access
 */
export class UpdateRolesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one role is required' })
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
