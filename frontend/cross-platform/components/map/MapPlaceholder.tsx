import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface MapPlaceholderProps {
  onCapturePress?: () => void;
  onTeleportPress?: () => void;
}

export function MapPlaceholder({ onCapturePress, onTeleportPress }: MapPlaceholderProps) {
  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient colors={['#dbeafe', '#bfdbfe']} style={StyleSheet.absoluteFillObject} />

      {/* Grid pattern simulation */}
      <View style={styles.gridOverlay} />

      {/* Decorative blobs */}
      <View style={[styles.blob, styles.blob1]} />
      <View style={[styles.blob, styles.blob2]} />
      <View style={[styles.blob, styles.blob3]} />

      {/* Sample memory markers */}
      <MemoryMarker top="20%" left="30%" feeling="JOY" />
      <MemoryMarker top="35%" left="55%" feeling="CALM" />
      <MemoryMarker top="50%" left="25%" feeling="INSPIRED" />
      <MemoryMarker top="45%" left="70%" feeling="ENERGETIC" />
      <MemoryMarker top="65%" left="45%" feeling="MELANCHOLY" />

      {/* Map controls */}
      <View style={styles.controlsContainer}>
        <Pressable style={styles.controlButton}>
          <Ionicons name="add" size={20} color="#171717" />
        </Pressable>
        <Pressable style={styles.controlButton}>
          <Ionicons name="remove" size={20} color="#171717" />
        </Pressable>
        <Pressable style={styles.controlButton}>
          <Ionicons name="layers-outline" size={20} color="#171717" />
        </Pressable>
      </View>

      {/* Current location / Teleport button */}
      <Pressable style={styles.locationButton} onPress={onTeleportPress}>
        <Ionicons name="navigate" size={20} color="#171717" />
      </Pressable>

      {/* Capture button */}
      <Pressable style={styles.captureButton} onPress={onCapturePress}>
        <Ionicons name="add" size={24} color="#fff" />
      </Pressable>

      {/* Center message */}
      <View style={styles.centerMessage}>
        <Ionicons name="location" size={40} color={Colors.light.primary} />
        <Text style={styles.messageTitle}>Map View</Text>
        <Text style={styles.messageDescription}>
          Your memories will appear on the map. Integrate with Mapbox for the full experience.
        </Text>
      </View>
    </View>
  );
}

// Memory marker component
interface MemoryMarkerProps {
  top: string;
  left: string;
  feeling: string;
}

function MemoryMarker({ top, left, feeling }: MemoryMarkerProps) {
  const feelingColors: Record<string, string> = {
    JOY: '#fcd34d',
    MELANCHOLY: '#818cf8',
    ENERGETIC: '#f87171',
    CALM: '#34d399',
    INSPIRED: '#a78bfa',
  };

  const color = feelingColors[feeling] || Colors.light.primary;

  // Convert percentage strings to actual values
  const topValue = parseFloat(top);
  const leftValue = parseFloat(left);

  return (
    <View
      style={[
        styles.marker,
        {
          top: `${topValue}%`,
          left: `${leftValue}%`,
        },
      ]}
    >
      <View style={[styles.markerDot, { backgroundColor: color }]} />
      <View style={[styles.markerPulse, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dbeafe',
    position: 'relative',
    overflow: 'hidden',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    // Grid pattern would be achieved differently in RN
    // Consider using a pattern image or custom drawing
  },
  blob: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.3,
  },
  blob1: {
    top: '15%',
    left: '20%',
    width: 128,
    height: 96,
    backgroundColor: '#86efac',
  },
  blob2: {
    top: '40%',
    right: '25%',
    width: 192,
    height: 128,
    backgroundColor: '#93c5fd',
  },
  blob3: {
    bottom: '25%',
    left: '35%',
    width: 160,
    height: 112,
    backgroundColor: '#bbf7d0',
  },
  controlsContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  locationButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  captureButton: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    backgroundColor: Colors.light.primary,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  centerMessage: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -140 }, { translateY: -80 }],
    width: 280,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
    marginTop: 12,
    marginBottom: 8,
  },
  messageDescription: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    lineHeight: 20,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 1,
  },
  markerPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    opacity: 0.4,
  },
});
