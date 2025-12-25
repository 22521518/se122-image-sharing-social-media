import { ApiService } from './api.service';

export interface Postcard {
  id: string;
  senderId: string;
  recipientId: string;
  status: 'DRAFT' | 'LOCKED' | 'UNLOCKED';
  message?: string;
  mediaUrl?: string;
  unlockDate?: string;
  unlockLatitude?: number;
  unlockLongitude?: number;
  unlockRadius?: number;
  viewedAt?: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  recipient?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface CreatePostcardData {
  message?: string;
  mediaUrl?: string;
  recipientId?: string; // Defaults to self
  unlockDate?: string; // ISO date string
  unlockLatitude?: number;
  unlockLongitude?: number;
  unlockRadius?: number;
}

export const postcardsService = {
  /**
   * Create and send a new postcard
   */
  async createPostcard(data: CreatePostcardData, token?: string | null): Promise<Postcard> {
    return ApiService.post<CreatePostcardData, Postcard>('/api/postcards', data, token);
  },

  /**
   * Save a draft postcard
   */
  async saveDraft(data: CreatePostcardData, token?: string | null): Promise<Postcard> {
    return ApiService.post<CreatePostcardData, Postcard>('/api/postcards/draft', data, token);
  },

  /**
   * Get all postcards received by the current user
   */
  async getReceivedPostcards(token?: string | null): Promise<Postcard[]> {
    return ApiService.get<Postcard[]>('/api/postcards/received', token);
  },

  /**
   * Get all postcards sent by the current user
   */
  async getSentPostcards(token?: string | null): Promise<Postcard[]> {
    return ApiService.get<Postcard[]>('/api/postcards/sent', token);
  },

  /**
   * Get a specific postcard by ID
   */
  async getPostcard(id: string, token?: string | null): Promise<Postcard> {
    return ApiService.get<Postcard>(`/api/postcards/${id}`, token);
  },

  /**
   * Check and unlock geo-locked postcards near user location
   */
  async checkGeoLock(latitude: number, longitude: number, token?: string | null): Promise<{
    unlockedCount: number;
    unlocked: { id: string; senderName: string | null; distance: number }[];
  }> {
    return ApiService.post<
      { latitude: number; longitude: number },
      { unlockedCount: number; unlocked: { id: string; senderName: string | null; distance: number }[] }
    >('/api/postcards/check-geo', { latitude, longitude }, token);
  },
};

export default postcardsService;

