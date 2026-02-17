/**
 * Users Service
 * 
 * Centralized service for user-related API calls.
 * Uses the ApiService for consistent request handling.
 */

import type { PostDetail, Profile, UpdateProfileDto, UpdateSettingsDto, UserSettings } from '@/types/api.types';
import { Platform } from 'react-native';
import { ApiService } from './api.service';

// Re-export types for backwards compatibility
export type { Profile, UpdateProfileDto, UpdateSettingsDto, UserSettings };

export const usersService = {
  /**
   * Get current user's profile
   */
  async getProfile(token: string): Promise<Profile> {
    return ApiService.get<Profile>('/api/users/profile', token);
  },

  /**
   * Get current user's profile (alias for components that don't pass token)
   * @alias getProfile
   */
  async getCurrentUserProfile(token: string): Promise<Profile> {
    return ApiService.get<Profile>('/api/users/profile', token);
  },

  /**
   * Get another user's profile by ID (public profile)
   */
  async getUserProfile(userId: string, token?: string | null): Promise<Profile> {
    return ApiService.get<Profile>(`/api/users/${userId}/public-profile`, token);
  },

  /**
   * Get posts by user ID
   */
  async getUserPosts(userId: string, token?: string | null): Promise<PostDetail[]> {
    return ApiService.get<PostDetail[]>(`/api/social/posts/user/${userId}`, token);
  },

  /**
   * Update current user's profile
   */
  async updateProfile(dto: UpdateProfileDto, token: string): Promise<Profile> {
    return ApiService.patch<UpdateProfileDto, Profile>('/api/users/profile', dto, token);
  },

  /**
   * Update current user's profile with avatar image
   * @param dto Profile data to update
   * @param avatarUri Local URI of the avatar image (optional)
   * @param token Auth token
   */
  async updateProfileWithAvatar(
    dto: UpdateProfileDto,
    avatarUri: string | null,
    token: string,
  ): Promise<Profile> {
    const formData = new FormData();

    // Add profile fields
    if (dto.name !== undefined) {
      formData.append('name', dto.name);
    }
    if (dto.bio !== undefined) {
      formData.append('bio', dto.bio);
    }

    // Add avatar file if provided
    if (avatarUri) {
      const filename = avatarUri.split('/').pop() || 'avatar.jpg';
      const match = /\.([\w]+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        // For web, fetch the blob and append
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        formData.append('file', blob, filename);
      } else {
        // For native, use the uri object format
        // @ts-ignore: FormData expects Blob/File, but React Native expects object with uri/name/type
        formData.append('file', {
          uri: avatarUri,
          name: filename,
          type,
        });
      }
    }

    return ApiService.patchFormData<Profile>('/api/users/profile', formData, token);
  },

  /**
   * Remove user's avatar
   */
  async removeAvatar(token: string): Promise<{ message: string; avatarUrl: string | null }> {
    return ApiService.delete<{ message: string; avatarUrl: string | null }>('/api/users/profile/avatar', token);
  },

  /**
   * Get user settings
   */
  async getSettings(token: string): Promise<UserSettings> {
    return ApiService.get<UserSettings>('/api/users/settings', token);
  },

  /**
   * Update user settings
   */
  async updateSettings(dto: UpdateSettingsDto, token: string): Promise<UserSettings> {
    return ApiService.patch<UpdateSettingsDto, UserSettings>('/api/users/settings', dto, token);
  },

  /**
   * Complete onboarding
   */
  async completeOnboarding(token: string): Promise<{ hasOnboarded: boolean }> {
    return ApiService.patch<object, { hasOnboarded: boolean }>('/api/users/me/onboarding', {}, token);
  },

  /**
   * Delete user account (soft delete)
   */
  async deleteAccount(token: string): Promise<{ message: string }> {
    return ApiService.delete<{ message: string }>('/api/users/account', token);
  },

  /**
   * Get user followers
   */
  async getFollowers(userId: string, token?: string | null): Promise<Profile[]> {
    return ApiService.get<Profile[]>(`/api/users/${userId}/followers`, token);
  },

  /**
   * Get user following
   */
  async getFollowing(userId: string, token?: string | null): Promise<Profile[]> {
    return ApiService.get<Profile[]>(`/api/users/${userId}/following`, token);
  },

  /**
   * Get user friends
   */
  async getFriends(userId: string, token?: string | null): Promise<Profile[]> {
    return ApiService.get<Profile[]>(`/api/users/${userId}/friends`, token);
  },

  /**
   * Get memories by user ID (respects privacy settings)
   */
  async getUserMemories(userId: string, token: string): Promise<any[]> {
    return ApiService.get<any[]>(`/api/memories/user/${userId}`, token);
  },
};
