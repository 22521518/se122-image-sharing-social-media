/**
 * MapComponent - Native platform implementation using MapLibre
 *
 * Uses @maplibre/maplibre-react-native with OpenStreetMap tiles.
 * No API key required for basic OSM raster tiles.
 */

import type { Feeling } from '@/components/FeelingSelector';
import { Memory } from '@/context/MemoriesContext';
import { MapRegion } from '@/hooks/useMapViewport';
import { Ionicons } from '@expo/vector-icons';
import type { CameraRef, MapViewRef } from '@maplibre/maplibre-react-native';
import * as MapLibreGL from '@maplibre/maplibre-react-native';
import { Image } from 'expo-image';
import React, { useRef } from 'react';
import {
    ActivityIndicator,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle
} from 'react-native';

const FEELING_EMOJIS: Record<Feeling, string> = {
  JOY: '😊',
  CALM: '😌',
  ENERGETIC: '⚡',
  INSPIRED: '✨',
  MELANCHOLY: '😢',
};

// Initialize MapLibre (required before using any components)
MapLibreGL.setAccessToken(null);

export interface MapComponentProps {
  initialRegion: MapRegion;
  onRegionChangeComplete: (region: MapRegion) => void;
  onLongPress: (coordinate: { latitude: number; longitude: number }) => void;
  memories: Memory[];
  onMemoryPress: (memory: Memory) => void;
  manualPinLocation: { latitude: number; longitude: number } | null;
  showTempPin: boolean;
  isLoading: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  currentUserId?: string;
}

// Free OSM Raster Tile Style URL
const OSM_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export interface MapComponentRef {
  flyTo(region: MapRegion, duration?: number): void;
}

export const MapComponent = React.forwardRef<MapComponentRef, MapComponentProps>(({
  initialRegion,
  onRegionChangeComplete,
  onLongPress,
  memories,
  onMemoryPress,
  manualPinLocation,
  showTempPin,
  isLoading,
  containerStyle,
  currentUserId,
}, ref) => {
  const mapRef = useRef<MapViewRef>(null);
  const cameraRef = useRef<CameraRef>(null);

  React.useImperativeHandle(ref, () => ({
    flyTo: (region: MapRegion, duration = 2000) => {
      cameraRef.current?.setCamera({
        centerCoordinate: [region.longitude, region.latitude],
        zoomLevel: Math.log2(360 / region.latitudeDelta) - 1,
        animationDuration: duration,
        animationMode: 'flyTo',
      });
    },
  }));

  const handleRegionChange = async () => {
    if (!mapRef.current) return;
    
    try {
      const center = await mapRef.current.getCenter();
      const zoom = await mapRef.current.getZoom();
      
      // Convert zoom to lat/long deltas (approximate)
      const latDelta = 360 / Math.pow(2, zoom + 1);
      const lonDelta = 360 / Math.pow(2, zoom + 1);
      
      onRegionChangeComplete({
        latitude: center[1],
        longitude: center[0],
        latitudeDelta: latDelta,
        longitudeDelta: lonDelta,
      });
    } catch (e) {
      console.warn('Failed to get map region:', e);
    }
  };

  const handleLongPress = (feature: GeoJSON.Feature) => {
    if (feature.geometry.type === 'Point') {
      const coords = feature.geometry.coordinates;
      onLongPress({
        latitude: coords[1],
        longitude: coords[0],
      });
    }
  };

  // Calculate initial zoom from latitudeDelta
  const initialZoom = Math.log2(360 / initialRegion.latitudeDelta) - 1;

  return (
    <View style={StyleSheet.flatten([styles.mapContainer, containerStyle])}>
      <MapLibreGL.MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={OSM_STYLE_URL}
        onRegionDidChange={handleRegionChange}
        onLongPress={handleLongPress}
        attributionEnabled={true}
        logoEnabled={false}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [initialRegion.longitude, initialRegion.latitude],
            zoomLevel: initialZoom,
          }}
        />
        
        <MapLibreGL.UserLocation visible={true} />

        {/* Memory markers - Using PointAnnotation for reliable positioning on Android */}
        {memories.map((memory) => (
          <MapLibreGL.PointAnnotation
            key={memory.id}
            id={`memory-${memory.id}`}
            coordinate={[memory.longitude, memory.latitude]}
            anchor={{ x: 0.5, y: 0.5 }}
            onSelected={() => onMemoryPress(memory)}
          >
             <View style={styles.markerEmojiContainer}>
              {(memory.userId !== currentUserId) ? (
                 <View style={styles.avatarMarkerContainer}>
                    {memory.user?.avatarUrl ? (
                      <Image source={{ uri: memory.user.avatarUrl }} style={styles.avatarMarker} />
                    ) : (
                      <View style={[styles.avatarMarker, styles.avatarPlaceholder]}>
                        <Ionicons name="person" size={16} color="#999" />
                      </View>
                    )}
                    {memory.feeling && (
                      <View style={styles.feelingBadgeOverlay}>
                        <Text style={styles.feelingBadgeEmoji}>{FEELING_EMOJIS[memory.feeling]}</Text>
                      </View>
                    )}
                 </View>
              ) : (
                <Text style={styles.markerEmoji}>{memory.feeling ? FEELING_EMOJIS[memory.feeling] : '📍'}</Text>
              )}
            </View>
          </MapLibreGL.PointAnnotation>
        ))}

        {/* Temporary pin for feeling placement */}
        {showTempPin && manualPinLocation && (
          <MapLibreGL.PointAnnotation
            id="temp-pin"
            coordinate={[manualPinLocation.longitude, manualPinLocation.latitude]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.tempMarker}>
              <Ionicons name="location" size={32} color="#FF3B30" />
              <Text style={styles.tempMarkerLabel}>New Pin</Text>
            </View>
          </MapLibreGL.PointAnnotation>
        )}
      </MapLibreGL.MapView>

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#5856D6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tempMarker: {
    alignItems: 'center',
  },
  tempMarkerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF3B30',
    backgroundColor: '#FFF',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: -4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  loadingText: {
    fontSize: 12,
    color: '#5856D6',
    fontWeight: '600',
  },
  markerEmojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  markerEmoji: {
    fontSize: 32,
    lineHeight: 34,
  },
  avatarMarkerContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feelingBadgeOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  feelingBadgeEmoji: {
    fontSize: 12,
  },
});

