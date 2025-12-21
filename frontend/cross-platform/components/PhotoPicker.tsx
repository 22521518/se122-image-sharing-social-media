import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useMemories } from '../context/MemoriesContext';

interface ExifData {
  latitude?: number;
  longitude?: number;
  timestamp?: string;
}

interface PhotoPickerProps {
  onPhotoSelected: (data: {
    uri: string;
    exif: ExifData | null;
    hasLocation: boolean;
  }) => void;
  onError?: (error: string) => void;
}

export function PhotoPicker({ onPhotoSelected, onError }: PhotoPickerProps) {
  const { uploadState } = useMemories();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [photoExif, setPhotoExif] = useState<ExifData | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError('Gallery access permission is required to upload photos');
        setHasPermission(false);
        return false;
      }
      setHasPermission(true);
      setPermissionError(null);
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      setPermissionError('Failed to request permissions');
      setHasPermission(false);
      return false;
    }
  }, []);

  const extractExifData = useCallback((exifData: any): ExifData | null => {
    if (!exifData) return null;

    try {
      // Try to extract GPS coordinates
      let latitude: number | undefined;
      let longitude: number | undefined;
      let timestamp: string | undefined;

      // expo-image-picker returns EXIF data in different formats depending on platform
      if (exifData.GPSLatitude && exifData.GPSLongitude) {
        // Direct coordinates (degrees)
        latitude = Number(exifData.GPSLatitude);
        longitude = Number(exifData.GPSLongitude);

        // Apply reference (N/S for lat, E/W for long)
        if (exifData.GPSLatitudeRef === 'S' && latitude !== undefined && latitude > 0) {
          latitude = -latitude;
        }
        if (exifData.GPSLongitudeRef === 'W' && longitude !== undefined && longitude > 0) {
          longitude = -longitude;
        }
      }

      // Extract timestamp
      if (exifData.DateTimeOriginal) {
        timestamp = exifData.DateTimeOriginal;
      } else if (exifData.DateTime) {
        timestamp = exifData.DateTime;
      }

      if (latitude !== undefined && longitude !== undefined) {
        return { latitude, longitude, timestamp };
      }

      // No valid GPS data found
      return timestamp ? { timestamp } : null;
    } catch (error) {
      console.error('Error extracting EXIF:', error);
      return null;
    }
  }, []);

  const pickImage = useCallback(async () => {
    // Prevent picking while uploading
    if (uploadState === 'uploading') {
      onError?.('Please wait for the current upload to finish');
      return;
    }

    // Check permission
    if (hasPermission === null || hasPermission === false) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', permissionError || 'Gallery access is required');
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 1,
        exif: true, // Request EXIF data
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset || !asset.uri) {
        onError?.('Failed to get image');
        return;
      }

      // Extract EXIF data
      const exifData = extractExifData(asset.exif);
      const hasLocation = !!(exifData?.latitude && exifData?.longitude);

      setSelectedPhoto(asset.uri);
      setPhotoExif(exifData);

      onPhotoSelected({
        uri: asset.uri,
        exif: exifData,
        hasLocation,
      });

      if (!hasLocation) {
        Alert.alert(
          'No Location Found',
          'This photo does not have GPS data. You can manually place it on the map.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Image picker error:', error);
      onError?.('Failed to pick image');
    }
  }, [uploadState, hasPermission, permissionError, requestPermission, extractExifData, onPhotoSelected, onError]);

  const clearSelection = useCallback(() => {
    setSelectedPhoto(null);
    setPhotoExif(null);
  }, []);

  return (
    <View style={styles.container}>
      {/* Photo Preview */}
      {selectedPhoto ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedPhoto }} style={styles.preview} />
          <TouchableOpacity style={styles.clearButton} onPress={clearSelection}>
            <Ionicons name="close-circle" size={28} color="#FF3B30" />
          </TouchableOpacity>
          <View style={styles.exifBadge}>
            {photoExif?.latitude ? (
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={14} color="#34C759" />
                <Text style={styles.badgeText}>Location found</Text>
              </View>
            ) : (
              <View style={[styles.locationBadge, styles.noLocationBadge]}>
                <Ionicons name="location-outline" size={14} color="#FF9500" />
                <Text style={[styles.badgeText, { color: '#FF9500' }]}>No location</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.pickButton}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          <View style={styles.pickButtonInner}>
            <Ionicons name="image-outline" size={32} color="#FFFFFF" />
            <Text style={styles.pickButtonText}>Choose Photo</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Permission error */}
      {permissionError && (
        <TouchableOpacity onPress={requestPermission} style={styles.errorContainer}>
          <Text style={styles.errorText}>{permissionError}</Text>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      )}

      {/* Instructions */}
      {!selectedPhoto && !permissionError && (
        <Text style={styles.instructionText}>
          Photos with EXIF GPS data will be auto-placed on the map
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  pickButton: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: '#5856D6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  pickButtonInner: {
    alignItems: 'center',
  },
  pickButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  previewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  preview: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  clearButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
  },
  exifBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  noLocationBadge: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  badgeText: {
    fontSize: 12,
    color: '#34C759',
    marginLeft: 4,
    fontWeight: '500',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  instructionText: {
    marginTop: 12,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    maxWidth: 200,
  },
});
