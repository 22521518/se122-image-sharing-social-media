import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ApiService } from '../services/api.service';
import { useAuth } from './AuthContext';
import { Platform } from 'react-native';

// Types
import { Feeling } from '../components/FeelingSelector';

export interface PlaceholderMetadata {
  gradientId: string;
  feeling: Feeling;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  capturedAt?: string;
}

export interface Memory {
  id: string;
  userId: string;
  type: 'voice' | 'photo' | 'mixed' | 'text_only';
  mediaUrl: string | null;
  duration?: number;
  latitude: number;
  longitude: number;
  privacy: 'private' | 'friends' | 'public';
  title?: string;
  feeling?: Feeling;
  placeholderMetadata?: PlaceholderMetadata;
  createdAt: string;
  updatedAt: string;
}

export type MemoryUploadState = 'idle' | 'recording' | 'uploading' | 'success' | 'error';

interface MemoriesContextType {
  memories: Memory[];
  uploadState: MemoryUploadState;
  error: string | null;
  uploadVoiceMemory: (data: {
    uri: string;
    duration: number;
    latitude: number;
    longitude: number;
    title?: string;
  }) => Promise<Memory | null>;
  uploadPhotoMemory: (data: {
    uri: string;
    latitude: number;
    longitude: number;
    title?: string;
  }) => Promise<Memory | null>;
  uploadFeelingPin: (data: {
    latitude: number;
    longitude: number;
    feeling: Feeling;
    title?: string;
    voiceUri?: string;
  }) => Promise<Memory | null>;
  fetchMemories: () => Promise<void>;
  deleteMemory: (id: string) => Promise<boolean>;
  setUploadState: (state: MemoryUploadState) => void;
  clearError: () => void;
}

const MemoriesContext = createContext<MemoriesContextType | undefined>(undefined);

interface MemoriesProviderProps {
  children: ReactNode;
}

export function MemoriesProvider({ children }: MemoriesProviderProps) {
  const { accessToken } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [uploadState, setUploadState] = useState<MemoryUploadState>('idle');
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchMemories = useCallback(async () => {
    if (!accessToken) return;

    try {
      const data = await ApiService.get<Memory[]>('/api/memories', accessToken);
      setMemories(data);
    } catch (err: any) {
      console.error('Failed to fetch memories:', err);
      setError(err.message || 'Failed to load memories');
    }
  }, [accessToken]);

  const uploadVoiceMemory = useCallback(async (data: {
    uri: string;
    duration: number;
    latitude: number;
    longitude: number;
    title?: string;
  }): Promise<Memory | null> => {
    if (!accessToken) {
      setError('Not authenticated');
      return null;
    }

    setUploadState('uploading');
    setError(null);

    try {
      // Create FormData
      const formData = new FormData();
      
      // Handle file differently for web vs native
      if (Platform.OS === 'web') {
        // For web, fetch the blob from the URI
        const response = await fetch(data.uri);
        const blob = await response.blob();
        formData.append('file', blob, 'recording.m4a');
      } else {
        // For React Native, use the file URI directly
        formData.append('file', {
          uri: data.uri,
          type: 'audio/m4a',
          name: 'recording.m4a',
        } as any);
      }

      formData.append('latitude', data.latitude.toString());
      formData.append('longitude', data.longitude.toString());
      formData.append('duration', data.duration.toString());
      if (data.title) {
        formData.append('title', data.title);
      }

      const memory = await ApiService.uploadFormData<Memory>(
        '/api/memories/voice',
        formData,
        accessToken
      );

      // Add to local state
      setMemories(prev => [memory, ...prev]);
      setUploadState('success');

      // Reset to idle after a short delay
      setTimeout(() => setUploadState('idle'), 2000);

      return memory;
    } catch (err: any) {
      console.error('Failed to upload voice memory:', err);
      setError(err.message || 'Failed to upload recording');
      setUploadState('error');
      return null;
    }
  }, [accessToken]);

  const uploadPhotoMemory = useCallback(async (data: {
    uri: string;
    latitude: number;
    longitude: number;
    title?: string;
  }): Promise<Memory | null> => {
    if (!accessToken) {
      setError('Not authenticated');
      return null;
    }

    setUploadState('uploading');
    setError(null);

    try {
      // Create FormData
      const formData = new FormData();
      
      // Handle file differently for web vs native
      if (Platform.OS === 'web') {
        // For web, fetch the blob from the URI
        const response = await fetch(data.uri);
        const blob = await response.blob();
        formData.append('file', blob, 'photo.jpg');
      } else {
        // For React Native, use the file URI directly
        // Get file extension from URI
        const ext = data.uri.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        
        formData.append('file', {
          uri: data.uri,
          type: mimeType,
          name: `photo.${ext}`,
        } as any);
      }

      formData.append('latitude', data.latitude.toString());
      formData.append('longitude', data.longitude.toString());
      if (data.title) {
        formData.append('title', data.title);
      }

      const memory = await ApiService.uploadFormData<Memory>(
        '/api/memories/photo',
        formData,
        accessToken
      );

      // Add to local state
      setMemories(prev => [memory, ...prev]);
      setUploadState('success');

      // Reset to idle after a short delay
      setTimeout(() => setUploadState('idle'), 2000);

      return memory;
    } catch (err: any) {
      console.error('Failed to upload photo memory:', err);
      setError(err.message || 'Failed to upload photo');
      setUploadState('error');
      return null;
    }
  }, [accessToken]);

  const deleteMemory = useCallback(async (id: string): Promise<boolean> => {
    if (!accessToken) return false;

    try {
      await ApiService.delete<{ success: boolean }>(`/api/memories/${id}`, accessToken);
      setMemories(prev => prev.filter(m => m.id !== id));
      return true;
    } catch (err: any) {
      console.error('Failed to delete memory:', err);
      setError(err.message || 'Failed to delete memory');
      return false;
    }
  }, [accessToken]);

  const uploadFeelingPin = useCallback(async (data: {
    latitude: number;
    longitude: number;
    feeling: Feeling;
    title?: string;
    voiceUri?: string;
  }): Promise<Memory | null> => {
    if (!accessToken) {
      setError('Not authenticated');
      return null;
    }

    setUploadState('uploading');
    setError(null);

    try {
      const formData = new FormData();

      // Add optional voice file
      if (data.voiceUri) {
        if (Platform.OS === 'web') {
          const response = await fetch(data.voiceUri);
          const blob = await response.blob();
          formData.append('file', blob, 'recording.m4a');
        } else {
          formData.append('file', {
            uri: data.voiceUri,
            type: 'audio/m4a',
            name: 'recording.m4a',
          } as any);
        }
      }

      formData.append('latitude', data.latitude.toString());
      formData.append('longitude', data.longitude.toString());
      formData.append('feeling', data.feeling);
      if (data.title) {
        formData.append('title', data.title);
      }

      const memory = await ApiService.uploadFormData<Memory>(
        '/api/memories/feeling-pin',
        formData,
        accessToken
      );

      // Add to local state
      setMemories(prev => [memory, ...prev]);
      setUploadState('success');

      // Reset to idle after a short delay
      setTimeout(() => setUploadState('idle'), 2000);

      return memory;
    } catch (err: any) {
      console.error('Failed to upload feeling pin:', err);
      setError(err.message || 'Failed to create memory');
      setUploadState('error');
      return null;
    }
  }, [accessToken]);

  const value: MemoriesContextType = {
    memories,
    uploadState,
    error,
    uploadVoiceMemory,
    uploadPhotoMemory,
    uploadFeelingPin,
    fetchMemories,
    deleteMemory,
    setUploadState,
    clearError,
  };

  return (
    <MemoriesContext.Provider value={value}>
      {children}
    </MemoriesContext.Provider>
  );
}

export function useMemories() {
  const context = useContext(MemoriesContext);
  if (context === undefined) {
    throw new Error('useMemories must be used within a MemoriesProvider');
  }
  return context;
}

