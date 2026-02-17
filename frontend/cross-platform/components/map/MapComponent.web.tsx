/**
 * MapComponent - Web platform loader
 * Uses React.lazy to import Leaflet only on client-side to prevent SSR "window is not defined" error.
 */

import { Memory } from '@/context/MemoriesContext';
import { MapRegion } from '@/hooks/useMapViewport';
import React, { forwardRef, Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

// Lazy load the actual map implementation which imports leaflet
const LeafletMap = React.lazy(() => import('./LeafletMap.web'));

export interface MapComponentRef {
  flyTo(region: MapRegion, duration?: number): void;
}

interface MapComponentProps {
  initialRegion: MapRegion;
  onRegionChangeComplete: (region: MapRegion) => void;
  onLongPress: (coordinate: { latitude: number; longitude: number }) => void;
  memories: Memory[];
  onMemoryPress?: (memory: Memory) => void;
  manualPinLocation: { latitude: number; longitude: number } | null;
  showTempPin: boolean;
  isLoading: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  currentUserId?: string;
}

export const MapComponent = forwardRef<MapComponentRef, MapComponentProps>((props, ref) => {
  // Ensure we only render on client
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5856D6" />
        <Text style={styles.loadingText}>Loading Map...</Text>
      </View>
    );
  }

  return (
    <Suspense
      fallback={
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5856D6" />
        </View>
      }
    >
      <LeafletMap ref={ref} {...props} />
    </Suspense>
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    height: 280,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#5856D6',
    fontWeight: '500',
  },
});
