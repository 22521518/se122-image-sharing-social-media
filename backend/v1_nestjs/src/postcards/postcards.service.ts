import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostcardDto } from './dto/create-postcard.dto';
import { PostcardStatus, NotificationType, Postcard } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

// Type for postcard with sender/recipient relations
type PostcardWithRelations = Postcard & {
  sender: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  recipient?: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
};

// Helper to get display name from user
function getDisplayName(user: { name: string | null; email: string }): string {
  if (user.name) return user.name;
  // Use part before @ from email as fallback
  return user.email.split('@')[0];
}

@Injectable()
export class PostcardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) { }

  /**
   * Validate XOR constraint: exactly ONE of unlockDate OR (unlockLatitude + unlockLongitude) must be set
   */
  private validateUnlockCondition(dto: CreatePostcardDto): void {
    const hasDateLock = !!dto.unlockDate;
    const hasGeoLock =
      dto.unlockLatitude !== undefined && dto.unlockLongitude !== undefined;

    if (!hasDateLock && !hasGeoLock) {
      throw new BadRequestException(
        'Must specify either an unlock date OR an unlock location (latitude + longitude)',
      );
    }

    if (hasDateLock && hasGeoLock) {
      throw new BadRequestException(
        'Cannot specify both unlock date AND unlock location. Choose one unlock condition.',
      );
    }

    // Validate date is in the future (min: tomorrow, max: 1 year from now)
    if (hasDateLock) {
      const unlockDate = new Date(dto.unlockDate!);
      const tomorrow = new Date();
      const now = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      now.setDate(now.getDate());
      now.setHours(0, 0, 0, 0);

      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);

      if (unlockDate < now) {
        throw new BadRequestException('Unlock date must be at least by now');
      }
      if (unlockDate > maxDate) {
        throw new BadRequestException(
          'Unlock date cannot be more than 1 year in the future',
        );
      }
    }
  }

  /**
   * Validate recipient is a valid friend (using Friendship relationship)
   * Note: "Self" is allowed (senderId === recipientId)
   */
  private async validateRecipient(
    senderId: string,
    recipientId: string,
  ): Promise<void> {
    // Self-postcards are always allowed
    if (senderId === recipientId) {
      return;
    }

    // Check if recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
    });
    if (!recipient) {
      throw new NotFoundException('Recipient user not found');
    }

    // Check if sender and recipient are friends (mutual friendship with ACCEPTED status)
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: senderId, addresseeId: recipientId },
          { requesterId: recipientId, addresseeId: senderId },
        ],
        status: 'ACCEPTED',
      },
    });

    if (!friendship) {
      throw new ForbiddenException(
        'You can only send postcards to your friends',
      );
    }
  }

  /**
   * Create a new postcard (status: LOCKED)
   */
  async create(senderId: string, dto: CreatePostcardDto) {
    // Validate XOR unlock condition
    this.validateUnlockCondition(dto);

    // Default recipientId to self if not provided
    const recipientId = dto.recipientId || senderId;

    // Validate recipient
    await this.validateRecipient(senderId, recipientId);

    // Create postcard with LOCKED status
    const postcard = await this.prisma.postcard.create({
      data: {
        senderId,
        recipientId,
        message: dto.message,
        mediaUrl: dto.mediaUrl,
        unlockDate: dto.unlockDate ? new Date(dto.unlockDate) : null,
        unlockLatitude: dto.unlockLatitude ?? null,
        unlockLongitude: dto.unlockLongitude ?? null,
        unlockRadius: dto.unlockRadius ?? 50,
        status: PostcardStatus.LOCKED,
        notificationSent: true,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        recipient: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Send push notification to recipient
    if (senderId !== recipientId) {
      const senderName = getDisplayName(postcard.sender);
      await this.notificationsService.create({
        userId: recipientId,
        type: NotificationType.POSTCARD_RECEIVED,
        title: 'New Postcard',
        message: `You received a locked postcard from ${senderName}!`,
        data: { postcardId: postcard.id, senderId, senderName },
      });
    }

    return this.toResponseDto(postcard, recipientId);
  }

  /**
   * Save a draft postcard
   */
  async saveDraft(senderId: string, dto: CreatePostcardDto) {
    // Drafts don't require XOR validation yet
    const postcard = await this.prisma.postcard.create({
      data: {
        senderId,
        recipientId: dto.recipientId || senderId, // Default to self
        message: dto.message,
        mediaUrl: dto.mediaUrl,
        unlockDate: dto.unlockDate ? new Date(dto.unlockDate) : null,
        unlockLatitude: dto.unlockLatitude ?? null,
        unlockLongitude: dto.unlockLongitude ?? null,
        unlockRadius: dto.unlockRadius ?? 50,
        status: PostcardStatus.DRAFT,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return this.toResponseDto(postcard, senderId);
  }

  /**
   * Get postcards received by the user
   */
  async getReceivedPostcards(userId: string) {
    const postcards = await this.prisma.postcard.findMany({
      where: {
        recipientId: userId,
        status: { not: PostcardStatus.DRAFT },
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return postcards.map((p) => this.toResponseDto(p, userId));
  }

  /**
   * Get postcards sent by the user
   */
  async getSentPostcards(userId: string) {
    const postcards = await this.prisma.postcard.findMany({
      where: { senderId: userId },
      include: {
        recipient: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Sender can see all their own postcards including content
    return postcards.map((p) => ({
      ...p,
      sender: undefined,
    }));
  }

  /**
   * Get a single postcard by ID
   * Also checks and unlocks if unlock conditions are met (on-demand unlock)
   */
  async getPostcardById(postcardId: string, userId: string) {
    let postcard: PostcardWithRelations | null =
      await this.prisma.postcard.findUnique({
        where: { id: postcardId },
        include: {
          sender: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          recipient: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

    if (!postcard) {
      throw new NotFoundException('Postcard not found');
    }

    // Only sender or recipient can view
    if (postcard.senderId !== userId && postcard.recipientId !== userId) {
      throw new ForbiddenException('You do not have access to this postcard');
    }

    // On-demand unlock check: if postcard is LOCKED and unlock conditions are met
    if (postcard.status === PostcardStatus.LOCKED) {
      const shouldUnlock = this.checkUnlockConditions(postcard);
      if (shouldUnlock) {
        postcard = await this.unlockPostcard(postcard);
      }
    }

    // If recipient is viewing and postcard is unlocked, mark as viewed
    if (
      postcard.recipientId === userId &&
      postcard.status === PostcardStatus.UNLOCKED &&
      !postcard.viewedAt
    ) {
      await this.prisma.postcard.update({
        where: { id: postcardId },
        data: { viewedAt: new Date() },
      });
    }

    return this.toResponseDto(postcard, userId);
  }

  /**
   * Check if unlock conditions are met for a postcard
   */
  private checkUnlockConditions(postcard: PostcardWithRelations): boolean {
    const now = new Date();

    // Time-based unlock: check if unlockDate has passed
    if (postcard.unlockDate && new Date(postcard.unlockDate) <= now) {
      return true;
    }

    // Geo-based unlock is handled separately via tryUnlockByLocation
    return false;
  }

  /**
   * Unlock a postcard and send notification
   */
  private async unlockPostcard(
    postcard: PostcardWithRelations,
  ): Promise<PostcardWithRelations> {
    const updatedPostcard = await this.prisma.postcard.update({
      where: { id: postcard.id },
      data: {
        status: PostcardStatus.UNLOCKED,
        unlockNotificationSent: true,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        recipient: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Send notification to recipient - use updatedPostcard to get sender name
    const senderName = getDisplayName(updatedPostcard.sender);
    await this.notificationsService.create({
      userId: updatedPostcard.recipientId,
      type: NotificationType.POSTCARD_UNLOCKED,
      title: 'Postcard Unlocked! 💌',
      message: `Your postcard from ${senderName} has been unlocked!`,
      data: {
        postcardId: updatedPostcard.id,
        senderId: updatedPostcard.senderId,
        senderName,
      },
    });

    return updatedPostcard;
  }

  /**
   * Transform postcard to response DTO with content security
   * Content (message, mediaUrl) is hidden if status === LOCKED and viewer is recipient
   */
  private toResponseDto(postcard: PostcardWithRelations, viewerId: string) {
    const isRecipient = postcard.recipientId === viewerId;
    const isSender = postcard.senderId === viewerId;
    const isLocked = postcard.status === PostcardStatus.LOCKED;

    // Recipients cannot see content of locked postcards
    // Senders can ALWAYS see their own content (including self-postcards)
    const hideContent = isRecipient && isLocked && !isSender;

    return {
      id: postcard.id,
      senderId: postcard.senderId,
      recipientId: postcard.recipientId,
      status: postcard.status,
      unlockDate: postcard.unlockDate,
      unlockLatitude: postcard.unlockLatitude,
      unlockLongitude: postcard.unlockLongitude,
      unlockRadius: postcard.unlockRadius,
      createdAt: postcard.createdAt,
      viewedAt: postcard.viewedAt,
      // SECURITY: Hide content for locked postcards when viewed by recipient
      message: hideContent ? undefined : postcard.message,
      mediaUrl: hideContent ? undefined : postcard.mediaUrl,
      sender: postcard.sender,
      recipient: postcard.recipient,
    };
  }
}
