/**
 * Friendship Service
 * 
 * API client for friendship-related endpoints
 */

import { ApiService } from './api.service';

export type FriendshipStatusType = 'none' | 'pending_sent' | 'pending_received' | 'friends' | 'blocked';

export interface FriendInfo {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface FriendRequest {
  id: string;
  requester: FriendInfo;
  addressee: FriendInfo;
  status: string;
  createdAt: string;
}

export interface FriendshipStatusResult {
  status: FriendshipStatusType;
  friendshipId?: string;
}

export const friendshipService = {
  /**
   * Send a friend request to a user
   */
  async sendFriendRequest(userId: string, token: string): Promise<FriendRequest> {
    return ApiService.post<unknown, FriendRequest>(
      `/api/social/friends/request/${userId}`,
      {},
      token,
    );
  },

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(requestId: string, token: string): Promise<FriendRequest> {
    return ApiService.post<unknown, FriendRequest>(
      `/api/social/friends/accept/${requestId}`,
      {},
      token,
    );
  },

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(requestId: string, token: string): Promise<{ success: boolean }> {
    return ApiService.post<unknown, { success: boolean }>(
      `/api/social/friends/reject/${requestId}`,
      {},
      token,
    );
  },

  /**
   * Cancel a sent friend request
   */
  async cancelFriendRequest(requestId: string, token: string): Promise<{ success: boolean }> {
    return ApiService.post<unknown, { success: boolean }>(
      `/api/social/friends/cancel/${requestId}`,
      {},
      token,
    );
  },

  /**
   * Remove a friend (unfriend)
   */
  async removeFriend(friendId: string, token: string): Promise<{ success: boolean }> {
    return ApiService.delete<{ success: boolean }>(
      `/api/social/friends/${friendId}`,
      token,
    );
  },

  /**
   * Get list of friends
   */
  async getFriends(token: string): Promise<FriendInfo[]> {
    return ApiService.get<FriendInfo[]>('/api/social/friends', token);
  },

  /**
   * Get pending friend requests received
   */
  async getPendingRequests(token: string): Promise<FriendRequest[]> {
    return ApiService.get<FriendRequest[]>('/api/social/friends/requests/pending', token);
  },

  /**
   * Get friend requests sent by me
   */
  async getSentRequests(token: string): Promise<FriendRequest[]> {
    return ApiService.get<FriendRequest[]>('/api/social/friends/requests/sent', token);
  },

  /**
   * Get friendship status with a user
   */
  async getFriendshipStatus(userId: string, token: string): Promise<FriendshipStatusResult> {
    return ApiService.get<FriendshipStatusResult>(
      `/api/social/friends/status/${userId}`,
      token,
    );
  },
};
