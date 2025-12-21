import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Alert, Image, TextInput, Pressable, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { PhotoPicker } from '@/components/PhotoPicker';
import { FeelingSelector, Feeling } from '@/components/FeelingSelector';
import { useMemories, Memory, MemoryUploadState } from '@/context/MemoriesContext';
import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

type CaptureMode = 'voice' | 'photo' | 'feeling';
type ActivePanel = 'none' | 'photo-confirm' | 'feeling-pin';

interface PendingUpload {
  uri: string;
  latitude: number;
  longitude: number;
  locationSource: 'exif' | 'device';
}

interface ManualPinLocation {
  latitude: number;
  longitude: number;
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
function CaptureModeToggle({ mode, onModeChange, disabled }: { 
  mode: CaptureMode; 
  onModeChange: (mode: CaptureMode) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.modeToggle, disabled && styles.modeToggleDisabled]}>
      <TouchableOpacity 
        style={[styles.modeButton, mode === 'voice' && styles.modeButtonActive]}
        onPress={() => onModeChange('voice')}
        disabled={disabled}
      >
        <Ionicons name="mic" size={20} color={mode === 'voice' ? '#FFFFFF' : '#666'} />
        <Text style={[styles.modeButtonText, mode === 'voice' && styles.modeButtonTextActive]}>Voice</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.modeButton, mode === 'photo' && styles.modeButtonActive]}
        onPress={() => onModeChange('photo')}
        disabled={disabled}
      >
        <Ionicons name="image" size={20} color={mode === 'photo' ? '#FFFFFF' : '#666'} />
        <Text style={[styles.modeButtonText, mode === 'photo' && styles.modeButtonTextActive]}>Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.modeButton, mode === 'feeling' && styles.modeButtonActive]}
        onPress={() => onModeChange('feeling')}
        disabled={disabled}
      >
        <Ionicons name="heart" size={20} color={mode === 'feeling' ? '#FFFFFF' : '#666'} />
        <Text style={[styles.modeButtonText, mode === 'feeling' && styles.modeButtonTextActive]}>Feeling</Text>
      </TouchableOpacity>
    </View>
  );
}

// Memory list item
function MemoryListItem({ memory }: { memory: Memory }) {
  const getIcon = () => {
    if (memory.type === 'text_only') return 'heart';
    if (memory.type === 'voice') return 'mic';
    return 'image';
  };
  
  const getColor = () => {
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
    return memory.type === 'voice' ? '#FF6B6B' : '#5856D6';
  };

  return (
    <View style={[styles.memoryItem, { borderLeftColor: getColor() }]}>
      <Ionicons name={getIcon()} size={18} color={getColor()} />
      <View style={styles.memoryItemInfo}>
        {memory.title && <Text style={styles.memoryItemTitle}>{memory.title}</Text>}
        <Text style={styles.memoryItemCoords}>
          {memory.latitude.toFixed(4)}, {memory.longitude.toFixed(4)}
        </Text>
      </View>
      {memory.feeling && (
        <View style={[styles.feelingBadge, { backgroundColor: getColor() + '20' }]}>
          <Text style={[styles.feelingBadgeText, { color: getColor() }]}>{memory.feeling}</Text>
        </View>
      )}
    </View>
  );
}

export default function MapScreen() {
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 768;
  
  const { accessToken } = useAuth();
  const isAuthenticated = !!accessToken;
  const { memories, uploadState, error, uploadVoiceMemory, uploadPhotoMemory, uploadFeelingPin, setUploadState, clearError } = useMemories();
  
  const [captureMode, setCaptureMode] = useState<CaptureMode>('voice');
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [isLoading, setIsLoading] = useState(false);
  
  // Photo upload state
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  
  // Feeling pin state
  const [manualPinLocation, setManualPinLocation] = useState<ManualPinLocation | null>(null);
  const [selectedFeeling, setSelectedFeeling] = useState<Feeling | null>(null);
  const [pinTitle, setPinTitle] = useState('');

  // Get current location for feeling pin
  const handleDropFeelingPin = useCallback(async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to place pins.');
        setIsLoading(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setManualPinLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setSelectedFeeling(null);
      setPinTitle('');
      setActivePanel('feeling-pin');
    } catch (err) {
      console.error('Failed to get location:', err);
      Alert.alert('Error', 'Could not get your current location.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRecordingComplete = useCallback(async (data: {
    uri: string;
    duration: number;
    latitude: number;
    longitude: number;
  }) => {
    await uploadVoiceMemory({
      uri: data.uri,
      duration: data.duration,
      latitude: data.latitude,
      longitude: data.longitude,
    });
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
      setIsLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location Required', 'Please enable location services.');
          setIsLoading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
        locationSource = 'device';
      } catch (err) {
        Alert.alert('Error', 'Failed to get location for this photo.');
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }

    setPendingUpload({ uri: data.uri, latitude, longitude, locationSource });
    setActivePanel('photo-confirm');
  }, []);

  const handleConfirmPhotoUpload = useCallback(async () => {
    if (!pendingUpload) return;
    
    await uploadPhotoMemory({
      uri: pendingUpload.uri,
      latitude: pendingUpload.latitude,
      longitude: pendingUpload.longitude,
    });

    setPendingUpload(null);
    setActivePanel('none');
  }, [pendingUpload, uploadPhotoMemory]);

  const handleConfirmFeelingPin = useCallback(async () => {
    if (!selectedFeeling || !manualPinLocation) return;
    
    await uploadFeelingPin({
      latitude: manualPinLocation.latitude,
      longitude: manualPinLocation.longitude,
      feeling: selectedFeeling,
      title: pinTitle || undefined,
    });

    setManualPinLocation(null);
    setSelectedFeeling(null);
    setPinTitle('');
    setActivePanel('none');
  }, [selectedFeeling, manualPinLocation, pinTitle, uploadFeelingPin]);

  const handleCancelPanel = useCallback(() => {
    setPendingUpload(null);
    setManualPinLocation(null);
    setSelectedFeeling(null);
    setPinTitle('');
    setActivePanel('none');
  }, []);

  const handleRecordingError = useCallback((errorMessage: string) => {
    Alert.alert('Error', errorMessage);
  }, []);

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedView style={styles.centeredContent}>
          <Ionicons name="map-outline" size={64} color="#666" />
          <ThemedText style={styles.loginPrompt}>Log in to start capturing memories</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const hasActivePanel = activePanel !== 'none';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>My Living Map</ThemedText>
        <UploadStatus state={uploadState} />
      </View>

      {/* Main content - responsive layout */}
      <View style={[styles.mainContent, isWideScreen && styles.mainContentWide]}>
        {/* Left/Top: Map + Memories List */}
        <View style={[styles.mapSection, isWideScreen && styles.mapSectionWide]}>
          {/* Map placeholder */}
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderEmoji}>🗺️</Text>
            <Text style={styles.mapPlaceholderText}>Map View Coming Soon</Text>
            <Text style={styles.mapPinCount}>{memories.length} memories placed</Text>
          </View>

          {/* Memories list */}
          <ScrollView style={styles.memoriesList} showsVerticalScrollIndicator={false}>
            {memories.length === 0 ? (
              <Text style={styles.emptyText}>No memories yet. Start capturing!</Text>
            ) : (
              memories.map(memory => <MemoryListItem key={memory.id} memory={memory} />)
            )}
          </ScrollView>
        </View>

        {/* Right/Bottom: Action Panel */}
        <View style={[styles.actionPanel, isWideScreen && styles.actionPanelWide]}>
          {/* Error display */}
          {error && (
            <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
              <Text style={styles.errorText}>{error}</Text>
              <Ionicons name="close" size={16} color="#FF3B30" />
            </TouchableOpacity>
          )}

          {/* Photo Confirmation Panel */}
          {activePanel === 'photo-confirm' && pendingUpload && (
            <View style={styles.confirmPanel}>
              <Text style={styles.panelTitle}>Confirm Photo Upload</Text>
              
              <Image source={{ uri: pendingUpload.uri }} style={styles.photoPreview} resizeMode="contain" />
              
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={18} color="#5856D6" />
                <Text style={styles.locationText}>
                  {pendingUpload.latitude.toFixed(4)}, {pendingUpload.longitude.toFixed(4)}
                </Text>
                <Text style={styles.locationSource}>({pendingUpload.locationSource})</Text>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelPanel}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmButton, uploadState === 'uploading' && styles.buttonDisabled]} 
                  onPress={handleConfirmPhotoUpload}
                  disabled={uploadState === 'uploading'}
                >
                  {uploadState === 'uploading' ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={18} color="#FFF" />
                      <Text style={styles.confirmButtonText}>Upload</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Feeling Pin Panel */}
          {activePanel === 'feeling-pin' && manualPinLocation && (
            <View style={styles.confirmPanel}>
              <Text style={styles.panelTitle}>Create Feeling Pin</Text>
              
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={18} color="#5856D6" />
                <Text style={styles.locationText}>
                  {manualPinLocation.latitude.toFixed(4)}, {manualPinLocation.longitude.toFixed(4)}
                </Text>
              </View>

              <TextInput
                style={styles.titleInput}
                placeholder="Add a title (optional)"
                placeholderTextColor="#999"
                value={pinTitle}
                onChangeText={setPinTitle}
                maxLength={100}
              />

              <FeelingSelector
                selectedFeeling={selectedFeeling}
                onFeelingSelect={setSelectedFeeling}
                compact={!isWideScreen}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelPanel}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmButton, !selectedFeeling && styles.buttonDisabled]} 
                  onPress={handleConfirmFeelingPin}
                  disabled={!selectedFeeling || uploadState === 'uploading'}
                >
                  {uploadState === 'uploading' ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="heart" size={18} color="#FFF" />
                      <Text style={styles.confirmButtonText}>Create</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Default Capture UI */}
          {activePanel === 'none' && (
            <>
              <CaptureModeToggle mode={captureMode} onModeChange={setCaptureMode} />
              
              <View style={styles.captureArea}>
                {captureMode === 'voice' && (
                  <VoiceRecorder
                    onRecordingComplete={handleRecordingComplete}
                    onError={handleRecordingError}
                  />
                )}
                {captureMode === 'photo' && (
                  <PhotoPicker
                    onPhotoSelected={handlePhotoSelected}
                    onError={handleRecordingError}
                  />
                )}
                {captureMode === 'feeling' && (
                  <View style={styles.feelingCaptureArea}>
                    <Text style={styles.feelingCaptureText}>
                      Drop a pin at your current location with an emotional tag
                    </Text>
                    <TouchableOpacity style={styles.dropPinButton} onPress={handleDropFeelingPin}>
                      <Ionicons name="add-circle" size={24} color="#FFF" />
                      <Text style={styles.dropPinButtonText}>Drop Feeling Pin</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
          {/* Loading Overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#5856D6" />
              <Text style={styles.loadingText}>Getting location...</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loginPrompt: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  uploadStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Main content layout
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  mainContentWide: {
    flexDirection: 'row',
  },
  
  // Map section
  mapSection: {
    flex: 1,
    minHeight: 200,
  },
  mapSectionWide: {
    flex: 2,
    borderRightWidth: 1,
    borderRightColor: '#E5E5EA',
  },
  mapPlaceholder: {
    height: 180,
    backgroundColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  mapPlaceholderEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  mapPinCount: {
    marginTop: 4,
    fontSize: 13,
    color: '#888',
  },
  memoriesList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
    fontSize: 14,
  },
  memoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  memoryItemInfo: {
    flex: 1,
  },
  memoryItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  memoryItemCoords: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  feelingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  feelingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Action Panel
  actionPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  actionPanelWide: {
    flex: 1,
    borderTopWidth: 0,
    maxWidth: 400,
  },
  
  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  modeToggleDisabled: {
    opacity: 0.5,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: '#5856D6',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  
  // Capture area
  captureArea: {
    minHeight: 100,
  },
  feelingCaptureArea: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  feelingCaptureText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  dropPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5856D6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  dropPinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Confirmation panels
  confirmPanel: {
    gap: 12,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#000000',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#F0EFFF',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#5856D6',
    fontWeight: '500',
  },
  locationSource: {
    fontSize: 12,
    color: '#888',
  },
  titleInput: {
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#5856D6',
    gap: 6,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  
  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: '#FF3B30',
    fontSize: 13,
  },
  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  loadingText: {
    fontSize: 16,
    color: '#5856D6',
    fontWeight: '600',
  },
});
