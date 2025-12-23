import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

describe('CommentsController', () => {
  let controller: CommentsController;
  let commentsService: CommentsService;

  const mockCommentsService = {
    createComment: jest.fn(),
    deleteComment: jest.fn(),
    getComments: jest.fn(),
    getCommentCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    commentsService = module.get<CommentsService>(CommentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createComment', () => {
    it('should call createComment with correct parameters', async () => {
      const postId = 'post-123';
      const userId = 'user-456';
      const content = 'Test comment';
      const mockResult = {
        comment: { id: 'comment-1', content, isOwner: true },
        commentCount: 5,
      };
      const mockReq = { user: { id: userId } };

      mockCommentsService.createComment.mockResolvedValue(mockResult);

      const result = await controller.createComment(postId, { content }, mockReq);

      expect(mockCommentsService.createComment).toHaveBeenCalledWith(
        userId,
        postId,
        { content },
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('deleteComment', () => {
    it('should call deleteComment with correct parameters', async () => {
      const commentId = 'comment-123';
      const userId = 'user-456';
      const mockResult = { success: true, commentCount: 4 };
      const mockReq = { user: { id: userId } };

      mockCommentsService.deleteComment.mockResolvedValue(mockResult);

      const result = await controller.deleteComment(commentId, mockReq);

      expect(mockCommentsService.deleteComment).toHaveBeenCalledWith(
        userId,
        commentId,
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe('getComments', () => {
    it('should return comments and count', async () => {
      const postId = 'post-123';
      const userId = 'user-456';
      const mockComments = [{ id: 'comment-1', content: 'Hello' }];
      const mockReq = { user: { id: userId } };

      mockCommentsService.getComments.mockResolvedValue(mockComments);
      mockCommentsService.getCommentCount.mockResolvedValue(1);

      const result = await controller.getComments(postId, mockReq);

      expect(mockCommentsService.getComments).toHaveBeenCalledWith(userId, postId);
      expect(result).toEqual({ comments: mockComments, count: 1 });
    });
  });
});
