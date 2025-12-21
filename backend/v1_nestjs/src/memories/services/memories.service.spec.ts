import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MemoriesService } from './memories.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/services/media.service';
import { MemoryType, PrivacyLevel, Memory, User } from '@prisma/client';

describe('MemoriesService', () => {
  let service: MemoriesService;
  let prisma: {
    memory: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
  };
  let mediaService: {
    uploadFile: jest.Mock;
    deleteFile: jest.Mock;
  };

  const mockUser: Partial<User> = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    defaultPrivacy: PrivacyLevel.private,
  };

  const mockMemory: Partial<Memory> = {
    id: 'memory-uuid-123',
    userId: 'user-uuid-123',
    type: MemoryType.voice,
    mediaUrl: 'https://cloudinary.com/test-audio.m4a',
    duration: 3.5,
    latitude: 10.762622,
    longitude: 106.660172,
    privacy: PrivacyLevel.private,
    title: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'recording.m4a',
    encoding: '7bit',
    mimetype: 'audio/mp4',
    buffer: Buffer.from('test audio content'),
    size: 12345,
    stream: undefined as any,
    destination: '',
    filename: '',
    path: '',
  };

  beforeEach(async () => {
    prisma = {
      memory: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    mediaService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoriesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: MediaService,
          useValue: mediaService,
        },
      ],
    }).compile();

    service = module.get<MemoriesService>(MemoriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createVoiceMemory', () => {
    const validDto = {
      latitude: 10.762622,
      longitude: 106.660172,
      duration: 3.5,
    };

    it('should create a voice memory successfully', async () => {
      mediaService.uploadFile.mockResolvedValue('https://cloudinary.com/test-audio.m4a');
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.memory.create.mockResolvedValue(mockMemory);

      const result = await service.createVoiceMemory('user-uuid-123', mockFile, validDto);

      expect(mediaService.uploadFile).toHaveBeenCalledWith(mockFile, 'memories/voice');
      expect(prisma.memory.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-123',
          type: MemoryType.voice,
          mediaUrl: 'https://cloudinary.com/test-audio.m4a',
          duration: 3.5,
          latitude: 10.762622,
          longitude: 106.660172,
          privacy: PrivacyLevel.private,
          title: undefined,
        },
      });
      expect(result).toEqual(mockMemory);
    });

    it('should throw error if no file is provided', async () => {
      await expect(
        service.createVoiceMemory('user-uuid-123', undefined as any, validDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createVoiceMemory('user-uuid-123', undefined as any, validDto),
      ).rejects.toThrow('Audio file is required');
    });

    it('should throw error if file type is invalid', async () => {
      const invalidFile = { ...mockFile, mimetype: 'video/mp4' };

      await expect(
        service.createVoiceMemory('user-uuid-123', invalidFile as any, validDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if duration exceeds 5.5 seconds', async () => {
      const invalidDto = { ...validDto, duration: 6 };

      await expect(
        service.createVoiceMemory('user-uuid-123', mockFile, invalidDto),
      ).rejects.toThrow('Audio duration must be between 1 and 5.5 seconds');
    });

    it('should throw error if duration is less than 1 second', async () => {
      const invalidDto = { ...validDto, duration: 0.5 };

      await expect(
        service.createVoiceMemory('user-uuid-123', mockFile, invalidDto),
      ).rejects.toThrow('Audio duration must be between 1 and 5.5 seconds');
    });

    it('should use user default privacy when not specified', async () => {
      mediaService.uploadFile.mockResolvedValue('https://cloudinary.com/test-audio.m4a');
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, defaultPrivacy: PrivacyLevel.public });
      prisma.memory.create.mockResolvedValue({ ...mockMemory, privacy: PrivacyLevel.public });

      const dtoWithoutPrivacy = { ...validDto, privacy: undefined };
      await service.createVoiceMemory('user-uuid-123', mockFile, dtoWithoutPrivacy);

      expect(prisma.memory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            privacy: PrivacyLevel.public,
          }),
        }),
      );
    });
  });

  describe('getMemoriesByUser', () => {
    it('should return all non-deleted memories for user', async () => {
      const memories = [mockMemory, { ...mockMemory, id: 'memory-uuid-456' }];
      prisma.memory.findMany.mockResolvedValue(memories);

      const result = await service.getMemoriesByUser('user-uuid-123');

      expect(prisma.memory.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-uuid-123',
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual(memories);
    });
  });

  describe('getMemoryById', () => {
    it('should return memory if user is owner', async () => {
      prisma.memory.findFirst.mockResolvedValue(mockMemory);

      const result = await service.getMemoryById('memory-uuid-123', 'user-uuid-123');

      expect(result).toEqual(mockMemory);
    });

    it('should return null if memory not found', async () => {
      prisma.memory.findFirst.mockResolvedValue(null);

      const result = await service.getMemoryById('non-existent', 'user-uuid-123');

      expect(result).toBeNull();
    });
  });

  describe('deleteMemory', () => {
    it('should soft delete memory and remove from Cloudinary', async () => {
      prisma.memory.findFirst.mockResolvedValue(mockMemory);
      prisma.memory.update.mockResolvedValue({ ...mockMemory, deletedAt: new Date() });
      mediaService.deleteFile.mockResolvedValue(undefined);

      const result = await service.deleteMemory('memory-uuid-123', 'user-uuid-123');

      expect(prisma.memory.update).toHaveBeenCalledWith({
        where: { id: 'memory-uuid-123' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mediaService.deleteFile).toHaveBeenCalledWith('https://cloudinary.com/test-audio.m4a');
      expect(result).toEqual({ success: true });
    });

    it('should throw error if memory not found', async () => {
      prisma.memory.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteMemory('non-existent', 'user-uuid-123'),
      ).rejects.toThrow('Memory not found or already deleted');
    });

    it('should throw error if user is not owner', async () => {
      prisma.memory.findFirst.mockResolvedValue(null); // Not found because userId doesn't match

      await expect(
        service.deleteMemory('memory-uuid-123', 'different-user'),
      ).rejects.toThrow('Memory not found or already deleted');
    });
  });

  describe('createPhotoMemory', () => {
    const mockImageFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test image content'),
      size: 54321,
      stream: undefined as any,
      destination: '',
      filename: '',
      path: '',
    };

    const validPhotoDto = {
      latitude: 10.762622,
      longitude: 106.660172,
    };

    const mockPhotoMemory: Partial<Memory> = {
      id: 'photo-memory-uuid-123',
      userId: 'user-uuid-123',
      type: MemoryType.photo,
      mediaUrl: 'https://cloudinary.com/test-photo.jpg',
      duration: null,
      latitude: 10.762622,
      longitude: 106.660172,
      privacy: PrivacyLevel.private,
      title: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('should create a photo memory successfully', async () => {
      mediaService.uploadFile.mockResolvedValue('https://cloudinary.com/test-photo.jpg');
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.memory.create.mockResolvedValue(mockPhotoMemory);

      const result = await service.createPhotoMemory('user-uuid-123', mockImageFile, validPhotoDto);

      expect(mediaService.uploadFile).toHaveBeenCalledWith(mockImageFile, 'memories/photos');
      expect(prisma.memory.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-123',
          type: MemoryType.photo,
          mediaUrl: 'https://cloudinary.com/test-photo.jpg',
          latitude: 10.762622,
          longitude: 106.660172,
          privacy: PrivacyLevel.private,
          title: undefined,
        },
      });
      expect(result).toEqual(mockPhotoMemory);
    });

    it('should use EXIF timestamp as createdAt when provided', async () => {
      const exifTime = '2023:12:25 14:30:00';
      const expectedDate = new Date('2023-12-25T14:30:00');
      const dtoWithTime = { ...validPhotoDto, timestamp: exifTime };

      mediaService.uploadFile.mockResolvedValue('https://cloudinary.com/test-photo.jpg');
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.memory.create.mockResolvedValue({
        ...mockPhotoMemory,
        createdAt: expectedDate
      });

      await service.createPhotoMemory('user-uuid-123', mockImageFile, dtoWithTime);

      expect(prisma.memory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdAt: expectedDate,
          }),
        }),
      );
    });

    it('should ignore invalid EXIF timestamp', async () => {
      const invalidTime = 'invalid-date-string';
      const dtoWithInvalidTime = { ...validPhotoDto, timestamp: invalidTime };

      mediaService.uploadFile.mockResolvedValue('https://cloudinary.com/test-photo.jpg');
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.memory.create.mockResolvedValue(mockPhotoMemory);

      await service.createPhotoMemory('user-uuid-123', mockImageFile, dtoWithInvalidTime);

      // Should be called without createdAt (or undefined)
      expect(prisma.memory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdAt: undefined,
          }),
        }),
      );
    });

    it('should throw error if no image file is provided', async () => {
      await expect(
        service.createPhotoMemory('user-uuid-123', undefined as any, validPhotoDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createPhotoMemory('user-uuid-123', undefined as any, validPhotoDto),
      ).rejects.toThrow('Image file is required');
    });

    it('should throw error if file type is invalid', async () => {
      const invalidFile = { ...mockImageFile, mimetype: 'video/mp4' };

      await expect(
        service.createPhotoMemory('user-uuid-123', invalidFile as any, validPhotoDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept PNG images', async () => {
      const pngFile = { ...mockImageFile, mimetype: 'image/png' };
      mediaService.uploadFile.mockResolvedValue('https://cloudinary.com/test-photo.png');
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.memory.create.mockResolvedValue({ ...mockPhotoMemory, mediaUrl: 'https://cloudinary.com/test-photo.png' });

      await expect(
        service.createPhotoMemory('user-uuid-123', pngFile as any, validPhotoDto),
      ).resolves.toBeTruthy();
    });

    it('should accept WebP images', async () => {
      const webpFile = { ...mockImageFile, mimetype: 'image/webp' };
      mediaService.uploadFile.mockResolvedValue('https://cloudinary.com/test-photo.webp');
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.memory.create.mockResolvedValue({ ...mockPhotoMemory, mediaUrl: 'https://cloudinary.com/test-photo.webp' });

      await expect(
        service.createPhotoMemory('user-uuid-123', webpFile as any, validPhotoDto),
      ).resolves.toBeTruthy();
    });

    it('should use user default privacy when not specified', async () => {
      mediaService.uploadFile.mockResolvedValue('https://cloudinary.com/test-photo.jpg');
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, defaultPrivacy: PrivacyLevel.public });
      prisma.memory.create.mockResolvedValue({ ...mockPhotoMemory, privacy: PrivacyLevel.public });

      await service.createPhotoMemory('user-uuid-123', mockImageFile, validPhotoDto);

      expect(prisma.memory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            privacy: PrivacyLevel.public,
          }),
        }),
      );
    });
  });
});
