import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Alert, Platform, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { PhotoPicker } from '@/components/PhotoPicker';
import { useMemories, Memory, MemoryUploadState } from '@/context/MemoriesContext';
import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

type CaptureMode = 'voice' | 'photo';

interface PendingUpload {
  uri: string;
  latitude: number;
  longitude: number;
  locationSource: 'exif' | 'device';
}

// Placeholder for a simple map representation
function MapPlaceholder({ memories }: { memories: Memory[] }) {
  return (
    <View style={styles.mapPlaceholder}>
      <ThemedText style={styles.mapPlaceholderText}>
        🗺️ Map View Coming Soon
      </ThemedText>
      <ThemedText style={styles.mapPinCount}>
        {memories.length} memor{memories.length !== 1 ? 'ies' : 'y'} placed
      </ThemedText>
      {/* Show pins as a simple list for now */}
      {memories.length > 0 && (
        <ScrollView style={styles.pinList} horizontal showsHorizontalScrollIndicator={false}>
          {memories.map((memory) => (
            <View key={memory.id} style={styles.pinItem}>
              <Ionicons 
                name={memory.type === 'voice' ? 'mic' : 'image'} 
                size={16} 
                color={memory.type === 'voice' ? '#FF6B6B' : '#5856D6'} 
              />
              <Text style={styles.pinCoords}>
                {memory.latitude.toFixed(4)}, {memory.longitude.toFixed(4)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// Upload status indicator
function UploadStatus({ state }: { state: MemoryUploadState }) {
  if (state === 'idle') return null;

  const statusConfig = {
    recording: { icon: 'mic' as const, text: 'Recording...', color: '#FF6B6B' },
    uploading: { icon: 'cloud-upload' as const, text: 'Uploading...', color: '#007AFF' },
    success: { icon: 'checkmark-circle' as const, text: 'Saved!', color: '#34C759' },
    error: { icon: 'alert-circle' as const, text: 'Failed', color: '#FF3B30' },
  };

  const config = statusConfig[state];

  return (
    <View style={[styles.uploadStatus, { backgroundColor: config.color }]}>
      <Ionicons name={config.icon} size={16} color="#FFFFFF" />
      <Text style={styles.uploadStatusText}>{config.text}</Text>
    </View>
  );
}

// Capture mode toggle
function CaptureModeToggle({ mode, onModeChange }: { mode: CaptureMode; onModeChange: (mode: CaptureMode) => void }) {
  return (
    <View style={styles.modeToggle}>
      <TouchableOpacity 
        style={[styles.modeButton, mode === 'voice' && styles.modeButtonActive]}
        onPress={() => onModeChange('voice')}
      >
        <Ionicons name="mic" size={20} color={mode === 'voice' ? '#FFFFFF' : '#666'} />
        <Text style={[styles.modeButtonText, mode === 'voice' && styles.modeButtonTextActive]}>Voice</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.modeButton, mode === 'photo' && styles.modeButtonActive]}
        onPress={() => onModeChange('photo')}
      >
        <Ionicons name="image" size={20} color={mode === 'photo' ? '#FFFFFF' : '#666'} />
        <Text style={[styles.modeButtonText, mode === 'photo' && styles.modeButtonTextActive]}>Photo</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MapScreen() {
  const { accessToken, user } = useAuth();
  const isAuthenticated = !!accessToken;
  const { memories, uploadState, error, uploadVoiceMemory, uploadPhotoMemory, setUploadState, clearError } = useMemories();
  const [lastRecordingLocation, setLastRecordingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('voice');
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const handleRecordingComplete = useCallback(async (data: {
    uri: string;
    duration: number;
    latitude: number;
    longitude: number;
  }) => {
    setLastRecordingLocation({ lat: data.latitude, lng: data.longitude });
    
    const memory = await uploadVoiceMemory({
      uri: data.uri,
      duration: data.duration,
      latitude: data.latitude,
      longitude: data.longitude,
    });

    if (memory) {
      console.log('Voice sticker saved:', memory.id);
    }
  }, [uploadVoiceMemory]);

  const handlePhotoSelected = useCallback(async (data: {
    uri: string;
    exif: { latitude?: number; longitude?: number; timestamp?: string } | null;
    hasLocation: boolean;
  }) => {
    let latitude: number;
    let longitude: number;
    let locationSource: 'exif' | 'device';

    if (data.hasLocation && data.exif?.latitude && data.exif?.longitude) {
      latitude = data.exif.latitude;
      longitude = data.exif.longitude;
      locationSource = 'exif';
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Location permission is needed to place photos on the map.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
        locationSource = 'device';
      } catch (err) {
        console.error('Failed to get device location:', err);
        Alert.alert('Location Error', 'Could not get your current location. Please try again.');
        return;
      }
    }

    // Set pending upload to show confirmation modal
    setPendingUpload({
      uri: data.uri,
      latitude,
      longitude,
      locationSource,
    });
  }, []);

  const handleConfirmUpload = useCallback(async () => {
    if (!pendingUpload) return;

    const { uri, latitude, longitude } = pendingUpload;
    setPendingUpload(null);
    
    setLastRecordingLocation({ lat: latitude, lng: longitude });
    
    const memory = await uploadPhotoMemory({
      uri,
      latitude,
      longitude,
    });

    if (memory) {
      console.log('Photo memory saved:', memory.id);
    }
  }, [pendingUpload, uploadPhotoMemory]);

  const handleCancelUpload = useCallback(() => {
    setPendingUpload(null);
  }, []);

  const handleRecordingError = useCallback((errorMessage: string) => {
    Alert.alert('Error', errorMessage);
  }, []);

  const handleRecordingStart = useCallback(() => {
    setUploadState('recording');
    clearError();
  }, [setUploadState, clearError]);

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.centeredContent}>
          <Ionicons name="map-outline" size={64} color="#666" />
          <ThemedText style={styles.loginPrompt}>
            Log in to start capturing memories
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>My Living Map</ThemedText>
        <UploadStatus state={uploadState} />
      </View>

      {/* Map area */}
      <View style={styles.mapContainer}>
        <MapPlaceholder memories={memories} />
      </View>

      {/* Error display */}
      {error && (
        <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
          <Text style={styles.errorText}>{error}</Text>
          <Ionicons name="close" size={16} color="#FF3B30" />
        </TouchableOpacity>
      )}

      {/* Capture mode toggle */}
      <CaptureModeToggle mode={captureMode} onModeChange={setCaptureMode} />

      {/* Capture UI based on mode */}
      <View style={styles.captureContainer}>
        {captureMode === 'voice' ? (
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            onError={handleRecordingError}
          />
        ) : (
          <PhotoPicker
            onPhotoSelected={handlePhotoSelected}
            onError={handleRecordingError}
          />
        )}
      </View>

      {/* Last recorded location indicator */}
      {lastRecordingLocation && (
        <View style={styles.lastLocation}>
          <Ionicons name="location" size={12} color="#007AFF" />
          <Text style={styles.lastLocationText}>
            Last: {lastRecordingLocation.lat.toFixed(4)}, {lastRecordingLocation.lng.toFixed(4)}
          </Text>
        </View>
      )}

      {/* Upload Confirmation Modal */}
      <Modal
        visible={!!pendingUpload}
        transparent
        animationType="fade"
        onRequestClose={handleCancelUpload}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Upload</Text>
            
            {pendingUpload && (
              <>
                <Image 
                  source={{ uri: pendingUpload.uri }} 
                  style={styles.modalPreview}
                  resizeMode="cover"
                />
                
                <View style={styles.modalLocationInfo}>
                  <Ionicons 
                    name={pendingUpload.locationSource === 'exif' ? 'image' : 'navigate'} 
                    size={20} 
                    color="#5856D6" 
                  />
                  <Text style={styles.modalLocationText}>
                    {pendingUpload.locationSource === 'exif' 
                      ? 'Location from photo EXIF' 
                      : 'Using device location'}
                  </Text>
                </View>
                
                <Text style={styles.modalCoords}>
                  📍 {pendingUpload.latitude.toFixed(4)}, {pendingUpload.longitude.toFixed(4)}
                </Text>
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCancelUpload}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmUpload}
              >
                <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
                <Text style={styles.modalButtonConfirmText}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 24,
    color: '#666',
  },
  mapPinCount: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
  pinList: {
    maxHeight: 50,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  pinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pinCoords: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  modeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#5856D6',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  captureContainer: {
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    minHeight: 180,
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  uploadStatusText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFD0D0',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loginPrompt: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  lastLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  lastLocationText: {
    marginLeft: 4,
    fontSize: 11,
    color: '#666',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalPreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalLocationText: {
    fontSize: 14,
    color: '#5856D6',
    fontWeight: '500',
  },
  modalCoords: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonCancel: {
    backgroundColor: '#F0F0F0',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonConfirm: {
    backgroundColor: '#5856D6',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
