/**
 * useTeleport Hook Tests
 * 
 * Story 4.1: Serendipitous Teleportation
 * Tests for the teleport hook logic including:
 * - Anti-repeat tracking (last 5 IDs)
 * - API integration with exclusion list
 * - Loading/error state management
 * - Empty state detection
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTeleport, TeleportedMemory } from './useTeleport';
import { ApiService } from '@/services/api.service';

// Mock ApiService
jest.mock('@/services/api.service');
const mockApiService = ApiService as jest.Mocked<typeof ApiService>;

describe('useTeleport', () => {
  const mockToken = 'test-auth-token';

  const mockMemory: TeleportedMemory = {
    id: 'memory-1',
    latitude: 37.7749,
    longitude: -122.4194,
    voiceUrl: 'https://example.com/voice.m4a',
    imageUrl: null,
    feeling: 'JOY',
    title: 'Test Memory',
    liked: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useTeleport({ token: mockToken }));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.targetMemory).toBeNull();
    });

    it('should accept custom maxHistory parameter', () => {
      const { result } = renderHook(() =>
        useTeleport({ token: mockToken, maxHistory: 3 })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('teleport', () => {
    it('should fetch a random memory successfully', async () => {
      mockApiService.get.mockResolvedValueOnce(mockMemory);

      const { result } = renderHook(() => useTeleport({ token: mockToken }));

      let memory: TeleportedMemory | null = null;

      await act(async () => {
        memory = await result.current.teleport();
      });

      expect(memory).toEqual(mockMemory);
      expect(result.current.targetMemory).toEqual(mockMemory);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/memories/random',
        mockToken
      );
    });

    it('should return null when no token provided', async () => {
      const { result } = renderHook(() => useTeleport({ token: null }));

      let memory: TeleportedMemory | null = null;

      await act(async () => {
        memory = await result.current.teleport();
      });

      expect(memory).toBeNull();
      expect(result.current.error).toBe('Authentication required');
      expect(mockApiService.get).not.toHaveBeenCalled();
    });

    it('should return null when user has no memories', async () => {
      mockApiService.get.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useTeleport({ token: mockToken }));

      let memory: TeleportedMemory | null = null;

      await act(async () => {
        memory = await result.current.teleport();
      });

      expect(memory).toBeNull();
      expect(result.current.targetMemory).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Network error';
      mockApiService.get.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useTeleport({ token: mockToken }));

      let memory: TeleportedMemory | null = null;

      await act(async () => {
        memory = await result.current.teleport();
      });

      expect(memory).toBeNull();
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during teleport', async () => {
      let resolvePromise: (value: TeleportedMemory) => void;
      const promise = new Promise<TeleportedMemory>((resolve) => {
        resolvePromise = resolve;
      });
      mockApiService.get.mockReturnValueOnce(promise as any);

      const { result } = renderHook(() => useTeleport({ token: mockToken }));

      act(() => {
        result.current.teleport();
      });

      // Check loading state immediately
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockMemory);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('anti-repeat tracking', () => {
    it('should track teleported memory ID in history', async () => {
      mockApiService.get.mockResolvedValueOnce(mockMemory);

      const { result } = renderHook(() => useTeleport({ token: mockToken }));

      await act(async () => {
        await result.current.teleport();
      });

      // Second teleport should exclude the first memory
      await act(async () => {
        await result.current.teleport();
      });

      expect(mockApiService.get).toHaveBeenLastCalledWith(
        '/api/memories/random?exclude=memory-1',
        mockToken
      );
    });

    it('should track up to maxHistory IDs (default 5)', async () => {
      const memories = Array.from({ length: 6 }, (_, i) => ({
        ...mockMemory,
        id: `memory-${i + 1}`,
      }));

      const { result } = renderHook(() => useTeleport({ token: mockToken }));

      for (let i = 0; i < 6; i++) {
        mockApiService.get.mockResolvedValueOnce(memories[i]);
        await act(async () => {
          await result.current.teleport();
        });
      }

      // Should only keep last 5 IDs (memory-2 to memory-6)
      // memory-1 should be dropped
      expect(mockApiService.get).toHaveBeenLastCalledWith(
        '/api/memories/random?exclude=memory-6,memory-5,memory-4,memory-3,memory-2',
        mockToken
      );
    });

    it('should respect custom maxHistory parameter', async () => {
      const memories = Array.from({ length: 4 }, (_, i) => ({
        ...mockMemory,
        id: `memory-${i + 1}`,
      }));

      const { result } = renderHook(() =>
        useTeleport({ token: mockToken, maxHistory: 3 })
      );

      for (let i = 0; i < 4; i++) {
        mockApiService.get.mockResolvedValueOnce(memories[i]);
        await act(async () => {
          await result.current.teleport();
        });
      }

      // Should only keep last 3 IDs
      expect(mockApiService.get).toHaveBeenLastCalledWith(
        '/api/memories/random?exclude=memory-4,memory-3,memory-2',
        mockToken
      );
    });

    it('should handle empty exclusion list initially', async () => {
      mockApiService.get.mockResolvedValueOnce(mockMemory);

      const { result } = renderHook(() => useTeleport({ token: mockToken }));

      await act(async () => {
        await result.current.teleport();
      });

      // First call should have no exclusions
      expect(mockApiService.get).toHaveBeenCalledWith(
        '/api/memories/random',
        mockToken
      );
    });
  });

  describe('state management', () => {
    it('should clear error state', async () => {
      mockApiService.get.mockRejectedValueOnce(new Error('Test error'));

      const { result } = renderHook(() => useTeleport({ token: mockToken }));

      await act(async () => {
        await result.current.teleport();
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear target memory', async () => {
      mockApiService.get.mockResolvedValueOnce(mockMemory);

      const { result } = renderHook(() => useTeleport({ token: mockToken }));

      await act(async () => {
        await result.current.teleport();
      });

      expect(result.current.targetMemory).toEqual(mockMemory);

      act(() => {
        result.current.clearTarget();
      });

      expect(result.current.targetMemory).toBeNull();
    });
  });
});
