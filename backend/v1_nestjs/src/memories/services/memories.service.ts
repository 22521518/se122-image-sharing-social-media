import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/services/media.service';
import { CreateVoiceMemoryDto, CreatePhotoMemoryDto, CreateFeelingPinDto, CheckDuplicatesDto } from '../dto';
import { MemoryType, PrivacyLevel, Feeling } from '@prisma/client';

// Gradient ID mappings for feeling + time of day combinations
const GRADIENT_MAPPINGS: Record<Feeling, Record<'morning' | 'afternoon' | 'evening' | 'night', string>> = {
  JOY: {
    morning: 'SUNRISE_GOLD',
    afternoon: 'SUNNY_YELLOW',
    evening: 'WARM_SUNSET',
    night: 'STARLIGHT_GOLD',
  },
  MELANCHOLY: {
    morning: 'MISTY_BLUE',
    afternoon: 'RAINY_GRAY',
    evening: 'TWILIGHT_PURPLE',
    night: 'MIDNIGHT_BLUE',
  },
  ENERGETIC: {
    morning: 'DAWN_ORANGE',
    afternoon: 'VIBRANT_RED',
    evening: 'ELECTRIC_PINK',
    night: 'NEON_PURPLE',
  },
  CALM: {
    morning: 'SOFT_MINT',
    afternoon: 'OCEAN_BLUE',
    evening: 'LAVENDER_SKY',
    night: 'DEEP_TEAL',
  },
  INSPIRED: {
    morning: 'AURORA_GREEN',
    afternoon: 'COSMIC_PURPLE',
    evening: 'SUNSET_ORANGE',
    night: 'GALAXY_VIOLET',
  },
};

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

@Injectable()
export class MemoriesService {
  private readonly logger = new Logger(MemoriesService.name);

  // Allowed audio formats (MIME types base)
  private readonly ALLOWED_AUDIO_TYPES = [
    'audio/aac',
    'audio/aacp',
    'audio/mp4',
    'audio/x-m4a',
    'audio/m4a',
    'audio/mpeg',
    'audio/mp3',
    'audio/ogg',
    'audio/webm',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/opus',
    'application/octet-stream', // Fallback for unknown types
  ];

  // Allowed image formats
  private readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ];

  // Duration limits in seconds (for voice)
  private readonly MIN_DURATION = 1;
  private readonly MAX_DURATION = 6.5; // 0.5s buffer for JS event loop jitter

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) { }

  private isValidAudioType(mimetype: string): boolean {
    // Check exact match first
    if (this.ALLOWED_AUDIO_TYPES.includes(mimetype)) {
      return true;
    }
    // Check if starts with any allowed type (handles audio/webm;codecs=opus, etc.)
    return this.ALLOWED_AUDIO_TYPES.some(type =>
      mimetype.startsWith(type) || mimetype.startsWith('audio/')
    );
  }

  private isValidImageType(mimetype: string): boolean {
    if (this.ALLOWED_IMAGE_TYPES.includes(mimetype.toLowerCase())) {
      return true;
    }
    // Accept any image/* type for flexibility
    return mimetype.startsWith('image/');
  }

  async createVoiceMemory(
    userId: string,
    file: Express.Multer.File,
    dto: CreateVoiceMemoryDto,
  ) {
    // Validate file is provided
    if (!file) {
      throw new BadRequestException('Audio file is required');
    }

    // Validate file type (more lenient check)
    this.logger.debug(`Received file with mimetype: ${file.mimetype}`);
    if (!this.isValidAudioType(file.mimetype)) {
      throw new BadRequestException(
        `Invalid audio format (${file.mimetype}). Allowed formats: AAC, MP3, OGG, WebM, WAV`,
      );
    }

    // Validate duration if provided
    if (dto.duration !== undefined) {
      if (dto.duration < this.MIN_DURATION || dto.duration > this.MAX_DURATION) {
        throw new BadRequestException(
          `Audio duration must be between ${this.MIN_DURATION} and ${this.MAX_DURATION} seconds`,
        );
      }
    }

    // Upload to Cloudinary
    this.logger.log(`Uploading voice memory for user ${userId}`);
    const media = await this.mediaService.uploadFile(file, userId, 'memories/voice');
    const mediaUrl = media.url;

    // Get user's default privacy setting if not specified
    let privacy = dto.privacy;
    if (!privacy) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { defaultPrivacy: true },
      });
      privacy = user?.defaultPrivacy || PrivacyLevel.private;
    }

    // Create memory record
    const memory = await this.prisma.memory.create({
      data: {
        userId,
        type: MemoryType.voice,
        mediaUrl,
        duration: dto.duration,
        latitude: dto.latitude,
        longitude: dto.longitude,
        privacy,
        title: dto.title,
      },
    });

    this.logger.log(`Created voice memory ${memory.id} for user ${userId}`);

    return memory;
  }

  async createPhotoMemory(
    userId: string,
    file: Express.Multer.File,
    dto: CreatePhotoMemoryDto,
  ) {
    // Validate file is provided
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    // Validate file type
    this.logger.debug(`Received image with mimetype: ${file.mimetype}`);
    if (!this.isValidImageType(file.mimetype)) {
      throw new BadRequestException(
        `Invalid image format (${file.mimetype}). Allowed formats: JPEG, PNG, WebP, GIF, HEIC`,
      );
    }

    // Upload to Cloudinary (photos folder)
    this.logger.log(`Uploading photo memory for user ${userId}`);
    const media = await this.mediaService.uploadFile(file, userId, 'memories/photos');
    const mediaUrl = media.url;

    // Get user's default privacy setting if not specified
    let privacy = dto.privacy;
    if (!privacy) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { defaultPrivacy: true },
      });
      privacy = user?.defaultPrivacy || PrivacyLevel.private;
    }

    // Parse timestamp if provided
    let createdAt: Date | undefined;
    if (dto.timestamp) {
      // EXIF format is usually "YYYY:MM:DD HH:MM:SS"
      // Convert to ISO format "YYYY-MM-DDTHH:MM:SS" for parsing
      const isoString = dto.timestamp.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T');
      const parsedDate = new Date(isoString);

      if (!isNaN(parsedDate.getTime())) {
        createdAt = parsedDate;
      } else {
        this.logger.warn(`Invalid EXIF timestamp format: ${dto.timestamp}`);
      }
    }

    // Create memory record
    const memory = await this.prisma.memory.create({
      data: {
        userId,
        type: MemoryType.photo,
        mediaUrl,
        latitude: dto.latitude,
        longitude: dto.longitude,
        privacy,
        title: dto.title,
        createdAt, // Use parsed timestamp or default to now()
      },
    });

    this.logger.log(`Created photo memory ${memory.id} for user ${userId}`);

    return memory;
  }

  async getMemoriesByUser(userId: string) {
    return this.prisma.memory.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMemoryById(id: string, userId: string) {
    const memory = await this.prisma.memory.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { userId }, // Owner can always see
          { privacy: PrivacyLevel.public }, // Public memories
          // TODO: Add friends logic when social features are implemented
        ],
      },
    });

    return memory;
  }

  async deleteMemory(id: string, userId: string) {
    const memory = await this.prisma.memory.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!memory) {
      throw new BadRequestException('Memory not found or already deleted');
    }

    // Soft delete
    await this.prisma.memory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Delete from Cloudinary
    if (memory.mediaUrl) {
      await this.mediaService.deleteFile(memory.mediaUrl);
    }

    this.logger.log(`Deleted memory ${id} for user ${userId}`);

    return { success: true };
  }

  /**
   * Create a feeling-first pin (text_only or voice_only with no photo).
   * Generates placeholderMetadata for client-side rendering of beautiful abstract visuals.
   * NO server-side image generation - purely metadata-driven approach.
   */
  async createFeelingPin(
    userId: string,
    dto: CreateFeelingPinDto,
    file?: Express.Multer.File,
  ) {
    // Determine memory type based on file presence
    let type: MemoryType = MemoryType.text_only;
    let mediaUrl: string | null = null;
    let duration: number | undefined;

    // If audio file is provided, upload it
    if (file) {
      this.logger.debug(`Received file with mimetype: ${file.mimetype}`);
      if (this.isValidAudioType(file.mimetype)) {
        type = MemoryType.voice;
        const voiceMedia = await this.mediaService.uploadFile(file, userId, 'memories/voice');
        mediaUrl = voiceMedia.url;
        // Duration validation (if duration is provided in future)
        // Note: Duration extraction from file metadata could be added here
      }
    }

    // Get user's default privacy setting if not specified
    let privacy = dto.privacy;
    if (!privacy) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { defaultPrivacy: true },
      });
      privacy = user?.defaultPrivacy || PrivacyLevel.private;
    }

    // Generate placeholder metadata for client-side rendering
    const timeOfDay = getTimeOfDay();
    const gradientId = GRADIENT_MAPPINGS[dto.feeling][timeOfDay];

    const placeholderMetadata = {
      gradientId,
      feeling: dto.feeling,
      timeOfDay,
      capturedAt: new Date().toISOString(),
    };

    // Create memory record
    const memory = await this.prisma.memory.create({
      data: {
        userId,
        type,
        mediaUrl,
        duration,
        latitude: dto.latitude,
        longitude: dto.longitude,
        privacy,
        title: dto.title,
        feeling: dto.feeling,
        placeholderMetadata,
      },
    });

    this.logger.log(`Created feeling pin ${memory.id} (${dto.feeling}) for user ${userId}`);

    return memory;
  }

  /**
   * Get memories within a bounding box for map viewport rendering.
   * Returns optimized data for pin rendering: id, lat, lng, type, audioUrl, feeling, placeholderMetadata.
   * 
   * Story 2.4a: Map Viewport Logic
   * - Filters by userId for "My Memories" context
   * - Limits result set to prevent performance degradation
   * - Returns fields needed for immediate playback without N+1 fetches (NFR2: <200ms)
   */
  async getMemoriesByBoundingBox(
    userId: string,
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
    limit: number = 50,
  ) {
    this.logger.debug(
      `Fetching memories in bbox: [${minLat}, ${minLng}] -> [${maxLat}, ${maxLng}] for user ${userId}`,
    );

    // Use the requested bounding box directly or default logic
    const isCrossMeridian = minLng > maxLng;
    const whereClause: any = {
      userId,
      deletedAt: null,
      latitude: {
        gte: minLat,
        lte: maxLat,
      },
    };

    // Handle International Date Line crossing (e.g. minLng=179, maxLng=-179)
    if (isCrossMeridian) {
      whereClause.OR = [
        { longitude: { gte: minLng, lte: 180 } },
        { longitude: { gte: -180, lte: maxLng } },
      ];
    } else {
      whereClause.longitude = {
        gte: minLng,
        lte: maxLng,
      };
    }

    const memories = await this.prisma.memory.findMany({
      where: whereClause,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        type: true,
        mediaUrl: true, // audioUrl for voice memories, photoUrl for photo memories
        feeling: true,
        placeholderMetadata: true,
        title: true,
        createdAt: true,
        likeCount: true,
        commentCount: true,
        likes: {
          where: { userId },
          select: { id: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    this.logger.log(
      `Found ${memories.length} memories in bounding box for user ${userId}`,
    );

    return memories;
  }

  /**
   * Check for duplicate memories by content hash.
   * Used during bulk import to detect files already uploaded.
   * 
   * Story 3.2: Bulk-Drop Wall for Historical Import
   * - Accepts array of hashes (SHA-256 of first 4KB + file size)
   * - Returns set of hashes that already exist in user's memories
   * - Enables client to mark duplicates before upload
   */
  async checkDuplicates(
    userId: string,
    hashes: string[],
  ): Promise<{ duplicates: string[]; count: number }> {
    if (!hashes || hashes.length === 0) {
      return { duplicates: [], count: 0 };
    }

    this.logger.debug(
      `Checking ${hashes.length} hashes for duplicates for user ${userId}`,
    );

    // Find memories with matching hashes for this user
    const existingMemories = await this.prisma.memory.findMany({
      where: {
        userId,
        contentHash: {
          in: hashes,
        },
        deletedAt: null,
      },
      select: {
        contentHash: true,
      },
    });

    const duplicates = existingMemories
      .map(m => m.contentHash)
      .filter((hash): hash is string => hash !== null);

    this.logger.log(
      `Found ${duplicates.length} duplicates out of ${hashes.length} hashes for user ${userId}`,
    );

    return {
      duplicates,
      count: duplicates.length,
    };
  }

  /**
   * Get a random memory for the Teleport feature.
   * Excludes recently teleported memories to avoid immediate repeats.
   * 
   * Story 4.1: Serendipitous Teleportation
   * - Excludes IDs in the exclusion list (last 5 teleported)
   * - If user has ≤5 memories, allow repeats but still randomize
   * - Returns full memory object for camera animation and audio playback
   */
  async getRandomMemory(
    userId: string,
    excludeIds: string[] = [],
  ): Promise<{
    id: string;
    latitude: number;
    longitude: number;
    voiceUrl: string | null;
    imageUrl: string | null;
    feeling: Feeling | null;
    title: string | null;
    liked: boolean;
  } | null> {
    // First, count user's total memories
    const totalCount = await this.prisma.memory.count({
      where: {
        userId,
        deletedAt: null,
      },
    });

    if (totalCount === 0) {
      return null;
    }

    // If user has ≤5 memories or exclusion list would exclude all, allow repeats
    let whereClause: any = {
      userId,
      deletedAt: null,
    };

    // Only apply exclusions if we have enough memories
    if (excludeIds.length > 0 && totalCount > excludeIds.length) {
      whereClause.id = {
        notIn: excludeIds,
      };
    }

    // Get count of available memories
    const availableCount = await this.prisma.memory.count({
      where: whereClause,
    });

    if (availableCount === 0) {
      // All memories are excluded but user has memories - allow repeats
      whereClause = {
        userId,
        deletedAt: null,
      };
    }

    // Select a random offset
    const finalCount = await this.prisma.memory.count({ where: whereClause });
    const randomOffset = Math.floor(Math.random() * finalCount);

    // Fetch the random memory
    const memory = await this.prisma.memory.findFirst({
      where: whereClause,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        mediaUrl: true,
        type: true,
        feeling: true,
        title: true,
        likes: {
          where: { userId },
          select: { id: true },
        },
      },
      skip: randomOffset,
      take: 1,
    });

    if (!memory) {
      return null;
    }

    // Map mediaUrl to voiceUrl/imageUrl based on type
    return {
      id: memory.id,
      latitude: memory.latitude,
      longitude: memory.longitude,
      voiceUrl: memory.type === MemoryType.voice || memory.type === MemoryType.mixed
        ? memory.mediaUrl
        : null,
      imageUrl: memory.type === MemoryType.photo || memory.type === MemoryType.mixed
        ? memory.mediaUrl
        : null,
      feeling: memory.feeling,
      title: memory.title,
      liked: memory.likes.length > 0,
    };
  }

  /**
   * Get the total count of user's memories.
   * Used for empty state check before teleport.
   * 
   * Story 4.1: Serendipitous Teleportation (AC 6)
   */
  async getMemoryCount(userId: string): Promise<number> {
    return this.prisma.memory.count({
      where: {
        userId,
        deletedAt: null,
      },
    });
  }
}


