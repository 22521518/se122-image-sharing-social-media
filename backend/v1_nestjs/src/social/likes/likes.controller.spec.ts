import { Test, TestingModule } from '@nestjs/testing';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';

describe('LikesController', () => {
  let controller: LikesController;
  let likesService: LikesService;

  const mockLikesService = {
    toggleLike: jest.fn(),
    hasLiked: jest.fn(),
    getLikeCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LikesController],
      providers: [
        {
          provide: LikesService,
          useValue: mockLikesService,
        },
      ],
    }).compile();

    controller = module.get<LikesController>(LikesController);
    likesService = module.get<LikesService>(LikesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('toggleLike', () => {
    it('should call toggleLike with correct user and post IDs', async () => {
      const postId = 'post-123';
      const userId = 'user-456';
      const mockResult = { liked: true, likeCount: 5 };
      const mockReq = { user: { id: userId } };

      mockLikesService.toggleLike.mockResolvedValue(mockResult);

      const result = await controller.toggleLike(postId, mockReq);

      expect(mockLikesService.toggleLike).toHaveBeenCalledWith(userId, postId);
      expect(result).toEqual(mockResult);
    });
  });

  describe('hasLiked', () => {
    it('should return like status and count', async () => {
      const postId = 'post-123';
      const userId = 'user-456';
      const mockReq = { user: { id: userId } };

      mockLikesService.hasLiked.mockResolvedValue(true);
      mockLikesService.getLikeCount.mockResolvedValue(10);

      const result = await controller.hasLiked(postId, mockReq);

      expect(mockLikesService.hasLiked).toHaveBeenCalledWith(userId, postId);
      expect(mockLikesService.getLikeCount).toHaveBeenCalledWith(postId);
      expect(result).toEqual({ liked: true, likeCount: 10 });
    });
  });
});
