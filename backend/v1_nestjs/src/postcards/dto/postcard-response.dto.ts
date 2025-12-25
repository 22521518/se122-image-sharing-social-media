import { Exclude, Expose, Transform } from 'class-transformer';

export class PostcardResponseDto {
  @Expose()
  id: string;

  @Expose()
  senderId: string;

  @Expose()
  recipientId: string;

  @Expose()
  status: string;

  @Expose()
  unlockDate?: Date;

  @Expose()
  unlockLatitude?: number;

  @Expose()
  unlockLongitude?: number;

  @Expose()
  unlockRadius: number;

  @Expose()
  createdAt: Date;

  @Expose()
  viewedAt?: Date;

  // === SECURITY: Content fields hidden when LOCKED ===
  // These are excluded by default and only exposed via a custom transformer
  @Expose()
  @Transform(({ obj }) => (obj.status === 'UNLOCKED' ? obj.message : undefined))
  message?: string;

  @Expose()
  @Transform(({ obj }) => (obj.status === 'UNLOCKED' ? obj.mediaUrl : undefined))
  mediaUrl?: string;

  // Sender info (populated in service)
  @Expose()
  sender?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };

  constructor(partial: Partial<PostcardResponseDto>) {
    Object.assign(this, partial);
  }
}
