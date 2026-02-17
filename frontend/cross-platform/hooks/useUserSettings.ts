/**
 * useUserSettings Hook
 * 
 * Custom hook for managing user settings (privacy, etc.)
 * Provides loading, updating, and account deletion.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { usersService, UserSettings, UpdateSettingsDto } from '../services/users.service';

type PrivacyLevel = 'private' | 'friends' | 'public';

interface UseUserSettingsResult {
  settings: UserSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  error: string;
  success: string;
  updatePrivacy: (level: PrivacyLevel) => Promise<boolean>;
  confirmDeleteAccount: () => void;
  clearMessages: () => void;
}

export function useUserSettings(): UseUserSettingsResult {
  const { accessToken, logout, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  const loadSettings = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await usersService.getSettings(accessToken);
      setSettings(data);
    } catch (err) {
      console.error('Settings fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  // Load settings when auth is ready
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    loadSettings();
  }, [authLoading, accessToken, loadSettings]);

  const updatePrivacy = useCallback(async (level: PrivacyLevel): Promise<boolean> => {
    if (!accessToken) {
      setError('Not authenticated');
      return false;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await usersService.updateSettings({ defaultPrivacy: level }, accessToken);
      setSettings(updated);
      setSuccess('Privacy settings updated!');
      return true;
    } catch (err) {
      console.error('Update settings error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [accessToken]);

  const deleteAccount = useCallback(async () => {
    if (!accessToken) {
      setError('Not authenticated');
      return;
    }

    setIsDeleting(true);

    try {
      await usersService.deleteAccount(accessToken);
      await logout();
      router.replace('/(auth)/login');
    } catch (err) {
      console.error('Delete account error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  }, [accessToken, logout]);

  const confirmDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? Your account will be scheduled for permanent deletion in 30 days. You can reactivate by logging in within this period.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAccount },
      ],
    );
  }, [deleteAccount]);

  return {
    settings,
    isLoading: isLoading || authLoading,
    isSaving,
    isDeleting,
    error,
    success,
    updatePrivacy,
    confirmDeleteAccount,
    clearMessages,
  };
}
