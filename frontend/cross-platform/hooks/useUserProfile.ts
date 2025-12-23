/**
 * useUserProfile Hook
 * 
 * Custom hook for managing the current user's profile.
 * Provides loading, updating, and error handling.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usersService, Profile, UpdateProfileDto } from '../services/users.service';

interface UseUserProfileResult {
  profile: Profile | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  success: string;
  refresh: () => Promise<void>;
  updateProfile: (dto: UpdateProfileDto) => Promise<boolean>;
  clearMessages: () => void;
}

export function useUserProfile(): UseUserProfileResult {
  const { accessToken, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  const loadProfile = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await usersService.getProfile(accessToken);
      setProfile(data);
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  // Load profile when auth is ready
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    loadProfile();
  }, [authLoading, accessToken, loadProfile]);

  const updateProfile = useCallback(async (dto: UpdateProfileDto): Promise<boolean> => {
    if (!accessToken) {
      setError('Not authenticated');
      return false;
    }

    // Validation
    if (dto.name && (dto.name.length < 2 || dto.name.length > 50)) {
      setError('Display name must be between 2 and 50 characters');
      return false;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await usersService.updateProfile(dto, accessToken);
      setProfile(updated);
      setSuccess('Profile updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
      return true;
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [accessToken]);

  return {
    profile,
    isLoading: isLoading || authLoading,
    isSaving,
    error,
    success,
    refresh: loadProfile,
    updateProfile,
    clearMessages,
  };
}
