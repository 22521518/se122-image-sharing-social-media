/**
 * MapComponent - Native platform implementation
 *
 * NOTE: react-native-maps requires native build configuration.
 * For Expo Go, we show a placeholder. For dev builds, we show actual maps.
 *
 * To enable real maps:
 * 1. Run: npx expo prebuild
 * 2. Build: npx expo run:android or npx expo run:ios
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Memory } from '@/context/MemoriesContext';
import { Feeling } from './FeelingSelector';
import { MapRegion } from '@/hooks/useMapViewport';

// Try to import react-native-maps, but gracefully handle if unavailable
let MapView: any = null;
let Marker: any = null;
let hasNativeMaps = false;

try {
  const RNMaps = require('react-native-maps');
  MapView = RNMaps.default;
  Marker = RNMaps.Marker;
  hasNativeMaps = true;
} catch {
  // react-native-maps not available (e.g., running in Expo Go)
  hasNativeMaps = false;
}

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

// Placeholder component for when native maps aren't available
function MapPlaceholder({
  memories,
  manualPinLocation,
  showTempPin,
  isLoading,
  onLongPress,
  onRegionChangeComplete,
  initialRegion,
  containerStyle,
}: MapComponentProps) {
  // Trigger initial fetch
  useEffect(() => {
    onRegionChangeComplete(initialRegion);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Simulate dropping a pin at current location
  const handleDropPin = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please enable location permissions');
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      onLongPress({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch {
      Alert.alert('Error', 'Could not get current location');
    }
  };

  return (
    <View style={[styles.mapContainer, containerStyle]} pointerEvents="box-none">
      <Pressable style={styles.mapPlaceholder} onLongPress={handleDropPin}>
        <Ionicons name="map" size={48} color="#5856D6" />
        <Text style={styles.mapTitle}>Map View</Text>
        <Text style={styles.mapSubtitle}>{memories.length} memories nearby</Text>

        {/* Memory dots preview */}
        {memories.length > 0 && (
          <View style={styles.dotsContainer}>
            {memories.slice(0, 8).map((memory) => (
              <View
                key={memory.id}
                style={[styles.dot, { backgroundColor: getMemoryColor(memory) }]}
              />
            ))}
            {memories.length > 8 && <Text style={styles.moreText}>+{memories.length - 8}</Text>}
          </View>
        )}

        <TouchableOpacity style={styles.dropPinButton} onPress={handleDropPin}>
          <Ionicons name="location" size={20} color="#FFF" />
          <Text style={styles.dropPinText}>Drop Pin Here</Text>
        </TouchableOpacity>

        <Text style={styles.infoText}>Running in Expo Go - maps require a development build</Text>

        {/* Show temp pin indicator */}
        {showTempPin && manualPinLocation && (
          <View style={styles.tempPinInfo}>
            <Ionicons name="location" size={16} color="#FF3B30" />
            <Text style={styles.tempPinText}>
              Pin at {manualPinLocation.latitude.toFixed(4)},{' '}
              {manualPinLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </Pressable>

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

// Native Maps component (when available)
function NativeMapComponent({
  initialRegion,
  onRegionChangeComplete,
  onLongPress,
  memories,
  manualPinLocation,
  showTempPin,
  isLoading,
  containerStyle,
}: MapComponentProps) {
  const handleRegionChangeComplete = (region: any) => {
    onRegionChangeComplete({
      latitude: region.latitude,
      longitude: region.longitude,
      latitudeDelta: region.latitudeDelta,
      longitudeDelta: region.longitudeDelta,
    });
  };

  const handleLongPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onLongPress({ latitude, longitude });
  };

  return (
    <View style={[styles.mapContainer, containerStyle]} pointerEvents="box-none">
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: initialRegion.latitude,
          longitude: initialRegion.longitude,
          latitudeDelta: initialRegion.latitudeDelta,
          longitudeDelta: initialRegion.longitudeDelta,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
        onLongPress={handleLongPress}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Memory markers */}
        {memories.map((memory) => (
          <Marker
            key={memory.id}
            coordinate={{
              latitude: memory.latitude,
              longitude: memory.longitude,
            }}
            pinColor={getMemoryColor(memory)}
            title={memory.title || `${memory.type} memory`}
          >
            <View style={[styles.markerContainer, { backgroundColor: getMemoryColor(memory) }]}>
              <Ionicons name={getMemoryIcon(memory)} size={16} color="#FFF" />
            </View>
          </Marker>
        ))}

        {/* Temporary pin for feeling placement */}
        {showTempPin && manualPinLocation && (
          <Marker
            coordinate={{
              latitude: manualPinLocation.latitude,
              longitude: manualPinLocation.longitude,
            }}
            pinColor="#FF3B30"
          >
            <View style={styles.tempMarker}>
              <Ionicons name="location" size={32} color="#FF3B30" />
              <Text style={styles.tempMarkerLabel}>New Pin</Text>
            </View>
          </Marker>
        )}
      </MapView>

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

// Main export - chooses between native maps and placeholder
export function MapComponent(props: MapComponentProps) {
  if (hasNativeMaps) {
    return <NativeMapComponent {...props} />;
  }
  return <MapPlaceholder {...props} />;
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
  mapPlaceholder: {
    // Only take up to 50% of the screen so BottomSheet can be interacted with
    maxHeight: '50%',
    minHeight: 200,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  mapSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  moreText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  dropPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5856D6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
    gap: 8,
  },
  dropPinText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: '#888',
    marginTop: 12,
    textAlign: 'center',
  },
  tempPinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  tempPinText: {
    fontSize: 11,
    color: '#FF3B30',
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
