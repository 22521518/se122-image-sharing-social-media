import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

describe('PostsController', () => {
  let controller: PostsController;
  let postsService: PostsService;

  const mockPostsService = {
    getPostById: jest.fn(),
    getRecentPosts: jest.fn(),
    createPost: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        {
          provide: PostsService,
          useValue: mockPostsService,
        },
      ],
    }).compile();

    controller = module.get<PostsController>(PostsController);
    postsService = module.get<PostsService>(PostsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPostById', () => {
    const mockReq = { user: { id: 'user-123' } };
    const postId = 'post-456';

    it('should call service with correct parameters', async () => {
      const mockPost = {
        id: postId,
        content: 'Test post',
        likeCount: 5,
        commentCount: 3,
        liked: true,
        author: { id: 'author-1', name: 'Author', avatarUrl: null },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPostsService.getPostById.mockResolvedValue(mockPost);

      const result = await controller.getPostById(postId, mockReq);

      expect(postsService.getPostById).toHaveBeenCalledWith(postId, 'user-123');
      expect(result).toEqual(mockPost);
    });

    it('should return post details with liked status', async () => {
      const mockPost = {
        id: postId,
        content: 'Test post',
        likeCount: 10,
        commentCount: 2,
        liked: false,
        author: { id: 'author-1', name: 'John', avatarUrl: 'http://avatar.jpg' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPostsService.getPostById.mockResolvedValue(mockPost);

      const result = await controller.getPostById(postId, mockReq);

      expect(result.liked).toBe(false);
      expect(result.likeCount).toBe(10);
    });
  });

  describe('getRecentPosts', () => {
    const mockReq = { user: { id: 'user-123' } };

    it('should call service with user id', async () => {
      const mockPosts = [
        { id: 'post-1', content: 'Post 1', likeCount: 5, commentCount: 2 },
        { id: 'post-2', content: 'Post 2', likeCount: 3, commentCount: 1 },
      ];
      mockPostsService.getRecentPosts.mockResolvedValue(mockPosts);

      const result = await controller.getRecentPosts(mockReq);

      expect(postsService.getRecentPosts).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockPosts);
    });

    it('should return empty array when no posts', async () => {
      mockPostsService.getRecentPosts.mockResolvedValue([]);

      const result = await controller.getRecentPosts(mockReq);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const mockReq = { user: { id: 'user-123' } };

    it('should call service with correct parameters including authorId', async () => {
      const createPostDto = {
        content: 'Hello world #nestjs #coding',
        privacy: 'public' as any,
        mediaIds: ['media-1', 'media-2'],
      };

      const mockCreatedPost = {
        id: 'post-new',
        authorId: 'user-123',
        content: createPostDto.content,
        privacy: createPostDto.privacy,
        createdAt: new Date(),
        updatedAt: new Date(),
        likeCount: 0,
        commentCount: 0,
      };

      mockPostsService.createPost.mockResolvedValue(mockCreatedPost);

      const result = await controller.create(createPostDto, mockReq);

      expect(mockPostsService.createPost).toHaveBeenCalledWith({
        ...createPostDto,
        authorId: 'user-123',
      });
      expect(result).toEqual(mockCreatedPost);
    });

    it('should create post without media', async () => {
      const createPostDto = {
        content: 'Just text, no media',
        privacy: 'friends' as any,
      };

      const mockCreatedPost = {
        id: 'post-text-only',
        authorId: 'user-123',
        content: createPostDto.content,
        privacy: createPostDto.privacy,
        createdAt: new Date(),
        updatedAt: new Date(),
        likeCount: 0,
        commentCount: 0,
      };

      mockPostsService.createPost.mockResolvedValue(mockCreatedPost);

      const result = await controller.create(createPostDto, mockReq);

      expect(mockPostsService.createPost).toHaveBeenCalledWith({
        content: 'Just text, no media',
        privacy: 'friends',
        authorId: 'user-123',
      });
      expect(result.id).toBe('post-text-only');
    });

    it('should extract user id from request correctly', async () => {
      const differentUserReq = { user: { id: 'different-user-456' } };
      const createPostDto = { content: 'Test', privacy: 'public' as any };

      mockPostsService.createPost.mockResolvedValue({ id: 'post-1' });

      await controller.create(createPostDto, differentUserReq);

      expect(mockPostsService.createPost).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: 'different-user-456' })
      );
    });
  });
});
