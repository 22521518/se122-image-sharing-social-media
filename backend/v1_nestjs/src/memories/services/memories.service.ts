import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/services/media.service';
import { CreateVoiceMemoryDto } from '../dto';
import { MemoryType, PrivacyLevel } from '@prisma/client';

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

  // Duration limits in seconds
  private readonly MIN_DURATION = 1;
  private readonly MAX_DURATION = 5.5; // 0.5s buffer for JS event loop jitter

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
    const mediaUrl = await this.mediaService.uploadFile(file, 'memories/voice');

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
}
