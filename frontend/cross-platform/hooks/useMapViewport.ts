/**
 * useMapViewport Hook
 * 
 * Manages map viewport state and debounced bounding box queries.
 * Story 2.4a: Map Viewport Logic
 * 
 * Features:
 * - Debounces region changes to avoid API spam (default 500ms)
 * - Converts map regions to bounding boxes
 * - Triggers memory fetches when viewport changes significantly
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useMemories } from '../context/MemoriesContext';
import { MapRegion, BoundingBox, regionToBoundingBox, boundingBoxesDiffer } from '../utils/geo';

interface UseMapViewportOptions {
  /** Debounce delay in milliseconds (default: 500ms per story spec) */
  debounceMs?: number;
  /** Maximum pins to fetch (default: 50) */
  limit?: number;
  /** Threshold for significant viewport change in degrees (default: 0.01 ≈ 1.1km) */
  changeThreshold?: number;
}

interface UseMapViewportResult {
  /** Current region state */
  region: MapRegion | null;
  /** Current bounding box (derived from region) */
  boundingBox: BoundingBox | null;
  /** Whether map memories are loading */
  isLoading: boolean;
  /** Handle region change - call from onRegionChangeComplete */
  onRegionChange: (region: MapRegion) => void;
  /** Manually trigger a fetch for current viewport */
  refreshViewport: () => void;
}

export function useMapViewport(options: UseMapViewportOptions = {}): UseMapViewportResult {
  const {
    debounceMs = 500, // AC: 500ms debounce to avoid request spam
    limit = 50,
    changeThreshold = 0.01,
  } = options;

  const { fetchMemoriesByBoundingBox, isLoadingMapMemories } = useMemories();

  const [region, setRegion] = useState<MapRegion | null>(null);
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedBboxRef = useRef<BoundingBox | null>(null);

  /**
   * Handle region change from map.
   * Implements debounce logic per AC: "When the map movement stops (debounce)"
   */
  const onRegionChange = useCallback((newRegion: MapRegion) => {
    setRegion(newRegion);

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Calculate new bounding box
    const newBbox = regionToBoundingBox(newRegion);
    setBoundingBox(newBbox);

    // Set debounce timer - only fetch when movement truly stops
    debounceTimerRef.current = setTimeout(() => {
      // Only fetch if bbox changed significantly
      if (boundingBoxesDiffer(lastFetchedBboxRef.current, newBbox, changeThreshold)) {
        lastFetchedBboxRef.current = newBbox;
        fetchMemoriesByBoundingBox(newBbox, limit);
      }
    }, debounceMs);
  }, [debounceMs, limit, changeThreshold, fetchMemoriesByBoundingBox]);

  /**
   * Manually refresh the current viewport.
   * Useful for pull-to-refresh or after creating new memories.
   */
  const refreshViewport = useCallback(() => {
    if (boundingBox) {
      // Force refresh by clearing last fetched bbox
      lastFetchedBboxRef.current = null;
      fetchMemoriesByBoundingBox(boundingBox, limit);
    }
  }, [boundingBox, limit, fetchMemoriesByBoundingBox]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    region,
    boundingBox,
    isLoading: isLoadingMapMemories,
    onRegionChange,
    refreshViewport,
  };
}

export type { MapRegion, BoundingBox };
