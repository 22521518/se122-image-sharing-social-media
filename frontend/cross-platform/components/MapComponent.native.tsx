/**
 * MapComponent - Native platform implementation using MapLibre
 *
 * Uses @maplibre/maplibre-react-native with OpenStreetMap tiles.
 * No API key required for basic OSM raster tiles.
 */

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapLibreGL, { MapViewRef, CameraRef } from '@maplibre/maplibre-react-native';
import { Memory } from '@/context/MemoriesContext';
import { Feeling } from './FeelingSelector';
import { MapRegion } from '@/hooks/useMapViewport';

// Initialize MapLibre (required before using any components)
MapLibreGL.setAccessToken(null);

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

// Get marker color based on memory type and feeling
function getMemoryColor(memory: Memory): string {
  if (memory.feeling) {
    const colors: Record<Feeling, string> = {
      JOY: '#FFD93D',
      MELANCHOLY: '#667BC6',
      ENERGETIC: '#FF6B35',
      CALM: '#5CBDB9',
      INSPIRED: '#A855F7',
    };
    return colors[memory.feeling] || '#5856D6';
  }
  switch (memory.type) {
    case 'voice':
      return '#FF6B6B';
    case 'photo':
      return '#5856D6';
    case 'text_only':
      return '#A855F7';
    default:
      return '#5856D6';
  }
}

// Get marker icon based on memory type
function getMemoryIcon(memory: Memory): keyof typeof Ionicons.glyphMap {
  if (memory.type === 'voice') return 'mic';
  if (memory.type === 'photo') return 'image';
  if (memory.feeling) return 'heart';
  return 'location';
}

// Free OSM Raster Tile Style URL
const OSM_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export function MapComponent({
  initialRegion,
  onRegionChangeComplete,
  onLongPress,
  memories,
  manualPinLocation,
  showTempPin,
  isLoading,
  containerStyle,
}: MapComponentProps) {
  const mapRef = useRef<MapViewRef>(null);
  const cameraRef = useRef<CameraRef>(null);

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
    <View style={[styles.mapContainer, containerStyle]}>
      <MapLibreGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={OSM_STYLE_URL}
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

        {/* Memory markers */}
        {memories.map((memory) => (
          <MapLibreGL.MarkerView
            key={memory.id}
            coordinate={[memory.longitude, memory.latitude]}
          >
            <View style={[styles.markerContainer, { backgroundColor: getMemoryColor(memory) }]}>
              <Ionicons name={getMemoryIcon(memory)} size={16} color="#FFF" />
            </View>
          </MapLibreGL.MarkerView>
        ))}

        {/* Temporary pin for feeling placement */}
        {showTempPin && manualPinLocation && (
          <MapLibreGL.MarkerView
            coordinate={[manualPinLocation.longitude, manualPinLocation.latitude]}
          >
            <View style={styles.tempMarker}>
              <Ionicons name="location" size={32} color="#FF3B30" />
              <Text style={styles.tempMarkerLabel}>New Pin</Text>
            </View>
          </MapLibreGL.MarkerView>
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
}

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
});
