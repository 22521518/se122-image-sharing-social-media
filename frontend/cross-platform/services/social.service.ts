import type {
  Comment,
  CreateCommentResponse,
  DeleteCommentResponse,
  FeedResponse,
  GetCommentsResponse,
  LikeStatusResponse,
  MediaItem,
  PostDetail,
  SearchResponse,
  ToggleLikeResponse,
  UserSearchResult,
} from '@/types/api.types';
import { ApiService as api } from './api.service';

export interface TrendingResponse {
  posts: PostDetail[];
}

// Re-export types for backwards compatibility
export type {
  Comment, CreateCommentResponse,
  DeleteCommentResponse, FeedResponse, GetCommentsResponse, LikeStatusResponse, PostDetail, SearchResponse,
  ToggleLikeResponse, UserSearchResult
};

// Legacy type aliases (deprecated - use imports from api.types.ts)
export type CommentAuthor = Comment['author'];
export type PostAuthor = PostDetail['author'];
export type HashtagResult = SearchResponse['hashtags'][number];

export const socialService = {
  // Follow/Unfollow
  async followUser(userId: string, token: string) {
    return api.post(`/api/social/graph/follow/${userId}`, {}, token);
  },

  async unfollowUser(userId: string, token: string) {
    return api.delete(`/api/social/graph/unfollow/${userId}`, token);
  },

  async getFollowing(token: string): Promise<UserSearchResult[]> {
    return api.get('/api/social/graph/following', token);
  },

  // Posts
  async getPost(postId: string, token: string): Promise<PostDetail> {
    const post = await api.get<PostDetail>(`/api/social/posts/${postId}`, token);

    // If media is present, transform it to imageUrls
    if (post.media && post.media.length > 0) {
      return {
        ...post,
        imageUrls: post.media
          .filter(m => m.type === 'image')
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map(m => m.url),
      };
    }

    // Otherwise return post as is (using existing imageUrls if available)
    return post;
  },

  async getRecentPosts(token: string): Promise<PostDetail[]> {
    return api.get('/api/social/posts', token);
  },

  // Feed (Story 5.3 - Personalized following feed with cursor pagination)
  async getFeed(token: string, cursor?: string, limit: number = 20): Promise<FeedResponse> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());

    interface BackendPost extends Omit<PostDetail, 'imageUrls'> {
      media?: MediaItem[];
    }
    interface BackendFeedResponse {
      posts: BackendPost[];
      nextCursor: string | null;
      hasMore: boolean;
    }

    const response = await api.get<BackendFeedResponse>(`/api/social/feed?${params.toString()}`, token);

    // Transform media array to imageUrls for UI compatibility
    const posts: PostDetail[] = response.posts.map(post => ({
      ...post,
      imageUrls: post.media
        ?.filter(m => m.type === 'image')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(m => m.url) ?? [],
    }));

    return {
      ...response,
      posts,
    };
  },

  // Discovery (Story 5.4 - Explore and Search)
  async search(query: string, type: 'all' | 'users' | 'posts' | 'hashtags' = 'all'): Promise<SearchResponse> {
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('type', type);

    interface BackendPost extends Omit<PostDetail, 'imageUrls'> {
      media?: MediaItem[];
    }
    interface BackendSearchResponse {
      users: SearchResponse['users'];
      posts: BackendPost[];
      hashtags: SearchResponse['hashtags'];
    }

    const response = await api.get<BackendSearchResponse>(`/api/social/search?${params.toString()}`);

    // Transform media array to imageUrls for UI compatibility
    const posts: PostDetail[] = response.posts.map(post => ({
      ...post,
      imageUrls: post.media
        ?.filter(m => m.type === 'image')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(m => m.url) ?? [],
    }));

    return {
      ...response,
      posts,
    };
  },

  async getTrending(): Promise<TrendingResponse> {
    interface BackendPost extends Omit<PostDetail, 'imageUrls'> {
      media?: MediaItem[];
    }
    interface BackendTrendingResponse {
      posts: BackendPost[];
    }

    const response = await api.get<BackendTrendingResponse>('/api/social/explore/trending');

    // Transform media array to imageUrls for UI compatibility
    const posts: PostDetail[] = response.posts.map(post => ({
      ...post,
      imageUrls: post.media
        ?.filter(m => m.type === 'image')
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map(m => m.url) ?? [],
    }));

    return { posts };
  },

  // Likes
  async toggleLike(postId: string, token: string): Promise<ToggleLikeResponse> {
    return api.post(`/api/social/likes/toggle/${postId}`, {}, token);
  },

  /** @alias toggleLike - backwards compatibility */
  async likePost(postId: string, token: string): Promise<ToggleLikeResponse> {
    return api.post(`/api/social/likes/toggle/${postId}`, {}, token);
  },

  async getLikeStatus(postId: string, token: string): Promise<LikeStatusResponse> {
    return api.get(`/api/social/likes/status/${postId}`, token);
  },

  async toggleLikeMemory(memoryId: string, token: string): Promise<ToggleLikeResponse> {
    return api.post(`/api/social/likes/memory/toggle/${memoryId}`, {}, token);
  },

  async getLikeStatusMemory(memoryId: string, token: string): Promise<LikeStatusResponse> {
    return api.get(`/api/social/likes/memory/status/${memoryId}`, token);
  },

  // Comments
  async createComment(postId: string, content: string, token: string): Promise<CreateCommentResponse> {
    return api.post(`/api/social/comments/${postId}`, { content }, token);
  },

  async createCommentOnMemory(memoryId: string, content: string, token: string): Promise<CreateCommentResponse> {
    return api.post(`/api/social/comments/memory/${memoryId}`, { content }, token);
  },

  async deleteComment(commentId: string, token: string): Promise<DeleteCommentResponse> {
    return api.delete(`/api/social/comments/${commentId}`, token);
  },

  async getComments(postId: string, token: string): Promise<GetCommentsResponse> {
    return api.get(`/api/social/comments/post/${postId}`, token);
  },

  async getMemoryComments(memoryId: string, token: string): Promise<GetCommentsResponse> {
    return api.get(`/api/social/comments/memory/${memoryId}`, token);
  },

  async createPost(data: {
    content: string;
    privacy: string;
    mediaIds?: string[];
    mediaMetadata?: Array<{ mediaId: string; caption?: string; sortOrder: number }>;
  }, token: string): Promise<PostDetail> {
    return api.post('/api/social/posts', data, token);
  },

  async updatePost(postId: string, data: {
    content?: string;
    privacy?: string;
  }, token: string): Promise<PostDetail> {
    return api.patch(`/api/social/posts/${postId}`, data, token);
  },
};

