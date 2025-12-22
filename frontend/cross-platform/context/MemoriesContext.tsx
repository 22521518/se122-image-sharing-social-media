import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { ApiService } from '../services/api.service';
import { useAuth } from './AuthContext';
import { Platform } from 'react-native';
import { BoundingBox, boundingBoxToQueryParams, boundingBoxesDiffer } from '../utils/geo';

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
  mapMemories: Memory[];
  uploadState: MemoryUploadState;
  error: string | null;
  isLoadingMapMemories: boolean;
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
  fetchMemoriesByBoundingBox: (bbox: BoundingBox, limit?: number) => Promise<void>;
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
  const [mapMemories, setMapMemories] = useState<Memory[]>([]);
  const [uploadState, setUploadState] = useState<MemoryUploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMapMemories, setIsLoadingMapMemories] = useState(false);
  
  // Track last fetched bbox to avoid redundant API calls
  const lastBboxRef = useRef<BoundingBox | null>(null);

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

  /**
   * Fetches memories within a bounding box for map viewport rendering.
   * Story 2.4a: Map Viewport Logic
   * 
   * - Debounces duplicate calls for the same viewport
   * - Returns optimized data for pin rendering (includes audioUrl, feeling, placeholderMetadata)
   */
  const fetchMemoriesByBoundingBox = useCallback(async (
    bbox: BoundingBox,
    limit: number = 50
  ) => {
    if (!accessToken) return;

    // Skip if bbox hasn't changed significantly (debounce optimization)
    if (!boundingBoxesDiffer(lastBboxRef.current, bbox)) {
      return;
    }
    lastBboxRef.current = bbox;

    setIsLoadingMapMemories(true);
    try {
      const queryParams = boundingBoxToQueryParams(bbox);
      const data = await ApiService.get<Memory[]>(
        `/api/memories/map?${queryParams}&limit=${limit}`,
        accessToken
      );
      setMapMemories(data);
    } catch (err: any) {
      console.error('Failed to fetch map memories:', err);
      // Don't set error for map fetch failures - non-blocking
    } finally {
      setIsLoadingMapMemories(false);
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
    mapMemories,
    uploadState,
    error,
    isLoadingMapMemories,
    uploadVoiceMemory,
    uploadPhotoMemory,
    uploadFeelingPin,
    fetchMemories,
    fetchMemoriesByBoundingBox,
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

