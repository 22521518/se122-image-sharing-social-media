import { socialService } from './social.service';
import { ApiService } from './api.service';

jest.mock('./api.service');

describe('SocialService', () => {
  const mockToken = 'mock-token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    it('should call api.post with correct arguments', async () => {
      const mockData = {
        content: 'Test content',
        privacy: 'friends',
        mediaIds: ['1', '2']
      };

      const mockResponse = { id: 'post-1' };
      (ApiService.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await socialService.createPost(mockData, mockToken);

      expect(ApiService.post).toHaveBeenCalledWith(
        '/api/social/posts',
        mockData,
        mockToken
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
