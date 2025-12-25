import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostcardDto } from './dto/create-postcard.dto';
import { PostcardStatus } from '@prisma/client';

@Injectable()
export class PostcardsService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Validate XOR constraint: exactly ONE of unlockDate OR (unlockLatitude + unlockLongitude) must be set
   */
  private validateUnlockCondition(dto: CreatePostcardDto): void {
    const hasDateLock = !!dto.unlockDate;
    const hasGeoLock = dto.unlockLatitude !== undefined && dto.unlockLongitude !== undefined;

    if (!hasDateLock && !hasGeoLock) {
      throw new BadRequestException(
        'Must specify either an unlock date OR an unlock location (latitude + longitude)'
      );
    }

    if (hasDateLock && hasGeoLock) {
      throw new BadRequestException(
        'Cannot specify both unlock date AND unlock location. Choose one unlock condition.'
      );
    }

    // Validate date is in the future (min: tomorrow, max: 1 year from now)
    if (hasDateLock) {
      const unlockDate = new Date(dto.unlockDate!);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);

      if (unlockDate < tomorrow) {
        throw new BadRequestException('Unlock date must be at least tomorrow');
      }
      if (unlockDate > maxDate) {
        throw new BadRequestException('Unlock date cannot be more than 1 year in the future');
      }
    }
  }

  /**
   * Validate recipient is a valid friend (using Follow relationship)
   * Note: "Self" is allowed (senderId === recipientId)
   */
  private async validateRecipient(senderId: string, recipientId: string): Promise<void> {
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

    // Check if sender follows recipient (friendship check via Follow table)
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: senderId,
          followingId: recipientId,
        },
      },
    });

    if (!follow) {
      throw new ForbiddenException('You can only send postcards to users you follow');
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
        notificationSent: true, // TODO: Integrate with notification service
      },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
        recipient: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // TODO: Send push notification to recipient
    // "You have a locked postcard from {senderName}!"

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
          select: { id: true, name: true, avatarUrl: true },
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
          select: { id: true, name: true, avatarUrl: true },
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
          select: { id: true, name: true, avatarUrl: true },
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
   */
  async getPostcardById(postcardId: string, userId: string) {
    const postcard = await this.prisma.postcard.findUnique({
      where: { id: postcardId },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true },
        },
        recipient: {
          select: { id: true, name: true, avatarUrl: true },
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
   * Transform postcard to response DTO with content security
   * Content (message, mediaUrl) is hidden if status === LOCKED and viewer is recipient
   */
  private toResponseDto(postcard: any, viewerId: string) {
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
