import { Test, TestingModule } from '@nestjs/testing';
import { MemoriesController } from './memories.controller';
import { MemoriesService } from '../services/memories.service';
import { JwtAuthGuard } from '../../auth-core/guards/jwt-auth.guard';
import { MemoryType, PrivacyLevel, Feeling } from '@prisma/client';

describe('MemoriesController', () => {
  let controller: MemoriesController;
  let memoriesService: {
    createVoiceMemory: jest.Mock;
    createPhotoMemory: jest.Mock;
    createFeelingPin: jest.Mock;
    getMemoriesByBoundingBox: jest.Mock;
    getMemoriesByUser: jest.Mock;
    getMemoryById: jest.Mock;
    deleteMemory: jest.Mock;
    checkDuplicates: jest.Mock;
    getRandomMemory: jest.Mock;
  };

  const mockUser = { id: 'user-uuid-123', email: 'test@example.com' };
  const mockRequest = { user: mockUser };

  const mockMemory = {
    id: 'memory-uuid-123',
    userId: 'user-uuid-123',
    type: MemoryType.voice,
    mediaUrl: 'https://cloudinary.com/test-audio.m4a',
    latitude: 10.762622,
    longitude: 106.660172,
    privacy: PrivacyLevel.private,
    createdAt: new Date(),
    updatedAt: new Date(),
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
    memoriesService = {
      createVoiceMemory: jest.fn(),
      createPhotoMemory: jest.fn(),
      createFeelingPin: jest.fn(),
      getMemoriesByBoundingBox: jest.fn(),
      getMemoriesByUser: jest.fn(),
      getMemoryById: jest.fn(),
      deleteMemory: jest.fn(),
      checkDuplicates: jest.fn(),
      getRandomMemory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemoriesController],
      providers: [
        {
          provide: MemoriesService,
          useValue: memoriesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MemoriesController>(MemoriesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createVoiceMemory', () => {
    it('should create a voice memory', async () => {
      const dto = { latitude: 10.762622, longitude: 106.660172, duration: 3.5 };
      memoriesService.createVoiceMemory.mockResolvedValue(mockMemory);

      const result = await controller.createVoiceMemory(mockRequest, mockFile, dto);

      expect(memoriesService.createVoiceMemory).toHaveBeenCalledWith(
        mockUser.id,
        mockFile,
        dto,
      );
      expect(result).toEqual(mockMemory);
    });
  });

  describe('createPhotoMemory', () => {
    it('should create a photo memory', async () => {
      const dto = { latitude: 10.762622, longitude: 106.660172 };
      const photoMemory = { ...mockMemory, type: MemoryType.photo };
      memoriesService.createPhotoMemory.mockResolvedValue(photoMemory);

      const result = await controller.createPhotoMemory(mockRequest, mockFile, dto);

      expect(memoriesService.createPhotoMemory).toHaveBeenCalledWith(
        mockUser.id,
        mockFile,
        dto,
      );
      expect(result).toEqual(photoMemory);
    });
  });

  describe('createFeelingPin', () => {
    it('should create a feeling pin without file', async () => {
      const dto = { latitude: 10.762622, longitude: 106.660172, feeling: Feeling.JOY };
      const feelingMemory = { ...mockMemory, type: MemoryType.text_only, feeling: Feeling.JOY };
      memoriesService.createFeelingPin.mockResolvedValue(feelingMemory);

      const result = await controller.createFeelingPin(mockRequest, undefined, dto);

      expect(memoriesService.createFeelingPin).toHaveBeenCalledWith(
        mockUser.id,
        dto,
        undefined,
      );
      expect(result).toEqual(feelingMemory);
    });

    it('should create a feeling pin with voice file', async () => {
      const dto = { latitude: 10.762622, longitude: 106.660172, feeling: Feeling.CALM };
      const feelingMemory = { ...mockMemory, type: MemoryType.voice, feeling: Feeling.CALM };
      memoriesService.createFeelingPin.mockResolvedValue(feelingMemory);

      const result = await controller.createFeelingPin(mockRequest, mockFile, dto);

      expect(memoriesService.createFeelingPin).toHaveBeenCalledWith(
        mockUser.id,
        dto,
        mockFile,
      );
      expect(result).toEqual(feelingMemory);
    });
  });

  describe('getMapMemories', () => {
    it('should return memories with liked status mapped', async () => {
      const mapMemories = [
        { ...mockMemory, likes: [{ id: 'like-1' }], likeCount: 1 },
        { ...mockMemory, id: 'memory-2', likes: [], likeCount: 0 },
      ];
      memoriesService.getMemoriesByBoundingBox.mockResolvedValue(mapMemories);

      const query = { minLat: 10, minLng: 106, maxLat: 11, maxLng: 107 };
      const result = await controller.getMapMemories(mockRequest, query);

      expect(memoriesService.getMemoriesByBoundingBox).toHaveBeenCalledWith(
        mockUser.id,
        10, 106, 11, 107, 50,
      );
      expect(result[0].liked).toBe(true);
      expect(result[1].liked).toBe(false);
      expect(result[0].likes).toBeUndefined();
    });
  });

  describe('getMyMemories', () => {
    it('should return user memories', async () => {
      const memories = [mockMemory];
      memoriesService.getMemoriesByUser.mockResolvedValue(memories);

      const result = await controller.getMyMemories(mockRequest);

      expect(memoriesService.getMemoriesByUser).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(memories);
    });
  });

  describe('getRandomMemory', () => {
    it('should return a random memory for teleport', async () => {
      const randomMemory = {
        id: 'random-123',
        latitude: 10.5,
        longitude: 106.5,
        voiceUrl: 'https://cloudinary.com/audio.m4a',
        imageUrl: null,
        feeling: Feeling.JOY,
        title: 'Random memory',
        liked: false,
      };
      memoriesService.getRandomMemory.mockResolvedValue(randomMemory);

      const query = { exclude: ['id1', 'id2'] };
      const result = await controller.getRandomMemory(mockRequest, query);

      expect(memoriesService.getRandomMemory).toHaveBeenCalledWith(mockUser.id, ['id1', 'id2']);
      expect(result).toEqual(randomMemory);
    });

    it('should return null when no memories exist', async () => {
      memoriesService.getRandomMemory.mockResolvedValue(null);

      const query = { exclude: [] };
      const result = await controller.getRandomMemory(mockRequest, query);

      expect(result).toBeNull();
    });
  });

  describe('getMemory', () => {
    it('should return a specific memory', async () => {
      memoriesService.getMemoryById.mockResolvedValue(mockMemory);

      const result = await controller.getMemory(mockRequest, 'memory-uuid-123');

      expect(memoriesService.getMemoryById).toHaveBeenCalledWith('memory-uuid-123', mockUser.id);
      expect(result).toEqual(mockMemory);
    });
  });

  describe('deleteMemory', () => {
    it('should delete a memory', async () => {
      memoriesService.deleteMemory.mockResolvedValue({ success: true });

      const result = await controller.deleteMemory(mockRequest, 'memory-uuid-123');

      expect(memoriesService.deleteMemory).toHaveBeenCalledWith('memory-uuid-123', mockUser.id);
      expect(result).toEqual({ success: true });
    });
  });

  describe('checkDuplicates', () => {
    it('should check for duplicate hashes', async () => {
      const dto = { hashes: ['hash1', 'hash2', 'hash3'] };
      const duplicateResult = { duplicates: ['hash1'], count: 1 };
      memoriesService.checkDuplicates.mockResolvedValue(duplicateResult);

      const result = await controller.checkDuplicates(mockRequest, dto);

      expect(memoriesService.checkDuplicates).toHaveBeenCalledWith(mockUser.id, dto.hashes);
      expect(result).toEqual(duplicateResult);
    });
  });
});
