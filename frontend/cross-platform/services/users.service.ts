/**
 * Users Service
 * 
 * Centralized service for user-related API calls.
 * Uses the ApiService for consistent request handling.
 */

import { ApiService } from './api.service';

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  defaultPrivacy?: string;
  hasOnboarded?: boolean;
  createdAt?: string;
}

export interface UpdateProfileDto {
  name?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UserSettings {
  defaultPrivacy: string;
  privacySettings: Record<string, unknown> | null;
}

export interface UpdateSettingsDto {
  defaultPrivacy?: string;
  privacySettings?: Record<string, unknown>;
}

export const usersService = {
  /**
   * Get current user's profile
   */
  async getProfile(token: string): Promise<Profile> {
    return ApiService.get<Profile>('/api/users/profile', token);
  },

  /**
   * Update current user's profile
   */
  async updateProfile(dto: UpdateProfileDto, token: string): Promise<Profile> {
    return ApiService.patch<UpdateProfileDto, Profile>('/api/users/profile', dto, token);
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
};
