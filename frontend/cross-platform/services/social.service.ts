import { ApiService as api } from './api.service';

export interface ToggleLikeResponse {
  liked: boolean;
  likeCount: number;
}

export interface LikeStatusResponse {
  liked: boolean;
  likeCount: number;
}

export interface CommentAuthor {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: CommentAuthor;
  isOwner: boolean;
}

export interface CreateCommentResponse {
  comment: Comment;
  commentCount: number;
}

export interface DeleteCommentResponse {
  success: boolean;
  commentCount: number;
}

export interface GetCommentsResponse {
  comments: Comment[];
  count: number;
}

export interface PostAuthor {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface PostDetail {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  author: PostAuthor;
  liked: boolean;
}

export const socialService = {
  // Follow/Unfollow
  async followUser(userId: string, token: string) {
    return api.post(`/api/social/graph/follow/${userId}`, {}, token);
  },

  async unfollowUser(userId: string, token: string) {
    return api.delete(`/api/social/graph/unfollow/${userId}`, token);
  },

  // Posts
  async getPost(postId: string, token: string): Promise<PostDetail> {
    return api.get(`/api/social/posts/${postId}`, token);
  },

  async getRecentPosts(token: string): Promise<PostDetail[]> {
    return api.get('/api/social/posts', token);
  },

  // Likes
  async toggleLike(postId: string, token: string): Promise<ToggleLikeResponse> {
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
};

