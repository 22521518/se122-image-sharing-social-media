import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PostcardStatus } from '@prisma/client';

@Injectable()
export class PostcardsScheduler {
  private readonly logger = new Logger(PostcardsScheduler.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Cron job: Run every 15 minutes to check for time-locked postcards that should unlock
   * AC: Time-Lock unlock - current date >= unlock date
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleTimeLockUnlock() {
    this.logger.log('Checking for time-locked postcards to unlock...');

    const now = new Date();

    // Find all LOCKED postcards where unlockDate has passed
    const postcardsToUnlock = await this.prisma.postcard.findMany({
      where: {
        status: PostcardStatus.LOCKED,
        unlockDate: {
          not: null,
          lte: now,
        },
      },
      include: {
        sender: {
          select: { id: true, name: true },
        },
        recipient: {
          select: { id: true, name: true },
        },
      },
    });

    if (postcardsToUnlock.length === 0) {
      this.logger.log('No time-locked postcards ready to unlock');
      return;
    }

    this.logger.log(`Found ${postcardsToUnlock.length} postcards to unlock`);

    // Unlock each postcard
    for (const postcard of postcardsToUnlock) {
      try {
        await this.prisma.postcard.update({
          where: { id: postcard.id },
          data: {
            status: PostcardStatus.UNLOCKED,
            unlockNotificationSent: true, // TODO: Integrate with push notification
          },
        });

        this.logger.log(
          `Unlocked postcard ${postcard.id} for recipient ${postcard.recipient.name}`
        );

        // TODO: Send push notification to recipient
        // "Your postcard from {senderName} has been unlocked!"
      } catch (error) {
        this.logger.error(`Failed to unlock postcard ${postcard.id}:`, error);
      }
    }

    this.logger.log(`Unlocked ${postcardsToUnlock.length} time-locked postcards`);
  }

  /**
   * Check if a location is within the unlock radius (Haversine formula)
   * Used for geo-lock postcards
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Check if user is near a geo-locked postcard and unlock if within radius
   * Called from controller when user checks in with their location
   */
  async checkGeoLockUnlock(
    userId: string,
    userLatitude: number,
    userLongitude: number
  ) {
    // Find all LOCKED postcards for this user with geo-lock conditions
    const geoLockedPostcards = await this.prisma.postcard.findMany({
      where: {
        recipientId: userId,
        status: PostcardStatus.LOCKED,
        unlockLatitude: { not: null },
        unlockLongitude: { not: null },
      },
      include: {
        sender: {
          select: { id: true, name: true },
        },
      },
    });

    const unlockedPostcards: { id: string; senderName: string | null; distance: number }[] = [];

    for (const postcard of geoLockedPostcards) {
      const distance = this.calculateDistance(
        userLatitude,
        userLongitude,
        postcard.unlockLatitude!,
        postcard.unlockLongitude!
      );

      if (distance <= postcard.unlockRadius) {
        // User is within unlock radius - unlock the postcard
        await this.prisma.postcard.update({
          where: { id: postcard.id },
          data: {
            status: PostcardStatus.UNLOCKED,
            unlockNotificationSent: true,
          },
        });

        unlockedPostcards.push({
          id: postcard.id,
          senderName: postcard.sender.name,
          distance: Math.round(distance),
        });

        this.logger.log(
          `Geo-unlocked postcard ${postcard.id} for user ${userId} (distance: ${distance.toFixed(1)}m)`
        );
      }
    }

    return unlockedPostcards;
  }
}
