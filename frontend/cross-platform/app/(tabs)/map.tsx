import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { useMemories, Memory, MemoryUploadState } from '@/context/MemoriesContext';
import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

// Placeholder for a simple map representation
function MapPlaceholder({ memories }: { memories: Memory[] }) {
  return (
    <View style={styles.mapPlaceholder}>
      <ThemedText style={styles.mapPlaceholderText}>
        🗺️ Map View Coming Soon
      </ThemedText>
      <ThemedText style={styles.mapPinCount}>
        {memories.length} voice sticker{memories.length !== 1 ? 's' : ''} placed
      </ThemedText>
      {/* Show pins as a simple list for now */}
      {memories.length > 0 && (
        <ScrollView style={styles.pinList} horizontal showsHorizontalScrollIndicator={false}>
          {memories.map((memory) => (
            <View key={memory.id} style={styles.pinItem}>
              <Ionicons name="mic" size={16} color="#FF6B6B" />
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

export default function MapScreen() {
  const { accessToken, user } = useAuth();
  const isAuthenticated = !!accessToken;
  const { memories, uploadState, error, uploadVoiceMemory, setUploadState, clearError } = useMemories();
  const [lastRecordingLocation, setLastRecordingLocation] = useState<{ lat: number; lng: number } | null>(null);

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
      // Successfully uploaded - could animate the pin appearing on map here
      console.log('Voice sticker saved:', memory.id);
    }
  }, [uploadVoiceMemory]);

  const handleRecordingError = useCallback((errorMessage: string) => {
    Alert.alert('Recording Error', errorMessage);
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
            Log in to start capturing voice stickers
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

      {/* Voice recorder FAB */}
      <View style={styles.recorderContainer}>
        <VoiceRecorder
          onRecordingComplete={handleRecordingComplete}
          onError={handleRecordingError}
        />
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
  recorderContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
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
    bottom: 130,
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
});
