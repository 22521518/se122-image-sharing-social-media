import { IsBoolean } from 'class-validator';

/**
 * DTO for locking/unlocking user accounts (Subtask 1.3)
 * AC 4: When clicked, user is immediately logged out and cannot log in
 */
export class LockAccountDto {
  @IsBoolean()
  locked: boolean;
}
