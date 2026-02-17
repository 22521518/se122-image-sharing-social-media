/**
 * useTeleport Hook - Manages teleport state and API calls
 * 
 * Story 4.1: Serendipitous Teleportation
 * - Tracks last 5 teleported memory IDs to avoid immediate repeats
 * - Calls backend /memories/random with exclusion list
 * - Provides state for loading, error handling, and empty state detection
 */

import { useState, useCallback, useRef } from 'react';
import { ApiService } from '@/services/api.service';

export interface TeleportedMemory {
  id: string;
  latitude: number;
  longitude: number;
  voiceUrl: string | null;
  imageUrl: string | null;
  feeling: 'JOY' | 'MELANCHOLY' | 'ENERGETIC' | 'CALM' | 'INSPIRED' | null;
  title: string | null;
  liked: boolean;
}

interface UseTeleportOptions {
  /** Auth token for API calls */
  token: string | null;
  /** Max number of IDs to track for anti-repeat (default: 5) */
  maxHistory?: number;
}

interface UseTeleportReturn {
  /** Execute teleport to a random memory */
  teleport: () => Promise<TeleportedMemory | null>;
  /** Whether a teleport is in progress */
  isLoading: boolean;
  /** Last error message, if any */
  error: string | null;
  /** Clear error state */
  clearError: () => void;
  /** Last teleported memory (for camera animation target) */
  targetMemory: TeleportedMemory | null;
  /** Clear target after animation completes */
  clearTarget: () => void;
}

export function useTeleport({ token, maxHistory = 5 }: UseTeleportOptions): UseTeleportReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetMemory, setTargetMemory] = useState<TeleportedMemory | null>(null);

  // Track last N teleported memory IDs to avoid immediate repeats
  const historyRef = useRef<string[]>([]);

  const teleport = useCallback(async (): Promise<TeleportedMemory | null> => {
    if (!token) {
      setError('Authentication required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build exclusion list from history
      const excludeParam = historyRef.current.length > 0
        ? `?exclude=${historyRef.current.join(',')}`
        : '';

      const memory = await ApiService.get<TeleportedMemory | null>(
        `/api/memories/random${excludeParam}`,
        token,
      );

      if (!memory) {
        // No memories available - user needs to create first memory
        return null;
      }

      // Update history (keep only last maxHistory IDs)
      historyRef.current = [
        memory.id,
        ...historyRef.current,
      ].slice(0, maxHistory);

      setTargetMemory(memory);
      return memory;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to teleport';
      setError(message);
      console.error('Teleport error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [token, maxHistory]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearTarget = useCallback(() => {
    setTargetMemory(null);
  }, []);

  return {
    teleport,
    isLoading,
    error,
    clearError,
    targetMemory,
    clearTarget,
  };
}
