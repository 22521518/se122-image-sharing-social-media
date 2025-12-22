/**
 * MapComponent - Web platform loader
 * Uses React.lazy to import Leaflet only on client-side to prevent SSR "window is not defined" error.
 */

import React, { Suspense, useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Memory } from '@/context/MemoriesContext';
import { MapRegion } from '@/hooks/useMapViewport';

// Lazy load the actual map implementation which imports leaflet
const LeafletMap = React.lazy(() => import('./LeafletMap.web'));

interface MapComponentProps {
  initialRegion: MapRegion;
  onRegionChangeComplete: (region: MapRegion) => void;
  onLongPress: (coordinate: { latitude: number; longitude: number }) => void;
  memories: Memory[];
  manualPinLocation: { latitude: number; longitude: number } | null;
  showTempPin: boolean;
  isLoading: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function MapComponent(props: MapComponentProps) {
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
    <Suspense fallback={
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5856D6" />
      </View>
    }>
      <LeafletMap {...props} />
    </Suspense>
  );
}

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
