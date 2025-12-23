import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
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
import { useMapViewport, MapRegion } from '@/hooks/useMapViewport';
import { createInitialRegion } from '@/utils/geo';
import { useLocalSearchParams } from 'expo-router';
// Platform-agnostic map component - Metro resolves to .web.tsx or .native.tsx
import { MapComponent } from '@/components/MapComponent';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { VisualMemoryCard } from '@/components/VisualMemoryCard';
import { Filmstrip, FilmstripRef } from '@/components/map/Filmstrip';
import { getMemoryColor, getMemoryIcon, getTypeIcon } from '@/constants/MemoryUI';

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
function CaptureModeToggle({
  mode,
  onModeChange,
  disabled,
}: {
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
        <Text style={[styles.modeButtonText, mode === 'voice' && styles.modeButtonTextActive]}>
          Voice
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modeButton, mode === 'photo' && styles.modeButtonActive]}
        onPress={() => onModeChange('photo')}
        disabled={disabled}
      >
        <Ionicons name="image" size={20} color={mode === 'photo' ? '#FFFFFF' : '#666'} />
        <Text style={[styles.modeButtonText, mode === 'photo' && styles.modeButtonTextActive]}>
          Photo
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modeButton, mode === 'feeling' && styles.modeButtonActive]}
        onPress={() => onModeChange('feeling')}
        disabled={disabled}
      >
        <Ionicons name="heart" size={20} color={mode === 'feeling' ? '#FFFFFF' : '#666'} />
        <Text style={[styles.modeButtonText, mode === 'feeling' && styles.modeButtonTextActive]}>
          Feeling
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Memory list item
function MemoryListItem({ memory }: { memory: Memory }) {
  const getIcon = () => getMemoryIcon(memory);
  const getColor = () => getMemoryColor(memory);

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

  const { accessToken, completeOnboarding } = useAuth();
  const isAuthenticated = !!accessToken;
  const params = useLocalSearchParams<{ onboardingMemory?: string }>();
  const {
    mapMemories,
    uploadState,
    error,
    isLoadingMapMemories,
    uploadVoiceMemory,
    uploadPhotoMemory,
    uploadFeelingPin,
    clearError,
  } = useMemories();

  // Map viewport hook for debounced bounding box queries (Story 2.4a)
  const { onRegionChange } = useMapViewport({
    debounceMs: 500, // AC: Debounce to avoid request spam
    limit: 50,
  });

  // Track current map region
  const [currentRegion, setCurrentRegion] = useState<MapRegion>(
    createInitialRegion(10.762622, 106.660172, 12), // Default: Ho Chi Minh City
  );

  const [captureMode, setCaptureMode] = useState<CaptureMode>('voice');
  const [activePanel, setActivePanel] = useState<ActivePanel>('none');
  const [isLoading, setIsLoading] = useState(false);

  // Photo upload state
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  // Feeling pin state
  const [manualPinLocation, setManualPinLocation] = useState<ManualPinLocation | null>(null);
  const [selectedFeeling, setSelectedFeeling] = useState<Feeling | null>(null);
  const [pinTitle, setPinTitle] = useState('');

  // Mobile Layout State
  const bottomSheetRef = React.useRef<BottomSheet>(null);
  const snapPoints = React.useMemo(() => ['15%', '55%', '90%'], []);
  // Mobile Tabs
  const [activeMobileTab, setActiveMobileTab] = useState<'browse' | 'posts' | 'voice' | 'photo' | 'feeling'>(
    'browse',
  );
  // Desktop action panel collapse state
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(true);
  // Story 2.4b: Selected memory for filmstrip two-way sync
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const filmstripRef = useRef<FilmstripRef>(null);

  // Initialize viewport on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated && currentRegion) {
      onRegionChange(currentRegion);
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle onboarding memory (AC 4, Subtask 3.1-3.3)
  useEffect(() => {
    if (params.onboardingMemory && isAuthenticated) {
      // Pre-fill the feeling pin with onboarding memory
      setPinTitle(params.onboardingMemory);
      setCaptureMode('feeling');
      setActiveMobileTab('feeling');
      
      // Get current location and show feeling pin panel
      handleDropFeelingPin();
    }
  }, [params.onboardingMemory, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleRecordingComplete = useCallback(
    async (data: { uri: string; duration: number; latitude: number; longitude: number }) => {
      await uploadVoiceMemory({
        uri: data.uri,
        duration: data.duration,
        latitude: data.latitude,
        longitude: data.longitude,
      });
    },
    [uploadVoiceMemory],
  );

  const handlePhotoSelected = useCallback(
    async (data: {
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
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
          locationSource = 'device';
        } catch {
          Alert.alert('Error', 'Failed to get location for this photo.');
          setIsLoading(false);
          return;
        }
        setIsLoading(false);
      }

      setPendingUpload({ uri: data.uri, latitude, longitude, locationSource });
      setActivePanel('photo-confirm');
    },
    [],
  );

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

    // If this pin was created from onboarding, mark user as onboarded (AC 4, Subtask 3.3)
    if (params.onboardingMemory) {
      await completeOnboarding();
    }

    setManualPinLocation(null);
    setSelectedFeeling(null);
    setPinTitle('');
    setActivePanel('none');
  }, [selectedFeeling, manualPinLocation, pinTitle, uploadFeelingPin, params.onboardingMemory, completeOnboarding]);

  const handleCancelPanel = useCallback(() => {
    setPendingUpload(null);
    setManualPinLocation(null);
    setSelectedFeeling(null);
    setPinTitle('');
    setActivePanel('none');
  }, []);

  // Story 2.4b: Handle filmstrip memory press - center map and optionally play audio
  const handleFilmstripMemoryPress = useCallback((memory: Memory) => {
    // Update selected memory for highlight
    setSelectedMemoryId(memory.id);
    // Animate map to memory location (AC: centers map on pin)
    setCurrentRegion({
      ...currentRegion,
      latitude: memory.latitude,
      longitude: memory.longitude,
    });
  }, [currentRegion]);

  // Handle map pin press for two-way sync
  const handleMapMemoryPress = useCallback((memory: Memory) => {
    setSelectedMemoryId(memory.id);
    // Scroll filmstrip to the memory
    filmstripRef.current?.scrollToMemory(memory.id);
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

  // Shared error banner helper
  const renderError = () =>
    error && (
      <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
        <Text style={styles.errorText}>{error}</Text>
        <Ionicons name="close" size={16} color="#FF3B30" />
      </TouchableOpacity>
    );

  // Shared Action Panel Content (Photo Confirmation, Feeling Pin, Capture UI)
  const renderActionPanelContent = () => (
    <>
      {activePanel === 'photo-confirm' && pendingUpload && (
        <View style={styles.confirmPanel}>
          <Text style={styles.panelTitle}>Confirm Photo Upload</Text>
          <Image
            source={{ uri: pendingUpload.uri }}
            style={styles.photoPreview}
            resizeMode="contain"
          />
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
              <PhotoPicker onPhotoSelected={handlePhotoSelected} onError={handleRecordingError} />
            )}
            {captureMode === 'feeling' && (
              <View style={styles.feelingCaptureArea}>
                <Ionicons name="hand-left" size={48} color="#5856D6" />
                <Text style={styles.feelingCaptureText}>
                  Long-press anywhere on the map above to drop a pin with an emotional tag
                </Text>
                <Text style={styles.feelingCaptureHint}>
                  💡 Tip: Hold your finger on the map for half a second
                </Text>
                <TouchableOpacity style={styles.dropPinButton} onPress={handleDropFeelingPin}>
                  <Ionicons name="add-circle" size={24} color="#FFF" />
                  <Text style={styles.dropPinButtonText}>Drop Right Here</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#5856D6" />
          <Text style={styles.loadingText}>Getting location...</Text>
        </View>
      )}
    </>
  );

  // Desktop Layout
  if (isWideScreen) {
    return (
      <SafeAreaView style={styles.container}>
        <MapComponent
          initialRegion={currentRegion}
          onRegionChangeComplete={(region) => {
            setCurrentRegion(region);
            onRegionChange(region);
          }}
          onLongPress={(coordinate) => {
            setManualPinLocation(coordinate);
            setSelectedFeeling(null);
            setPinTitle('');
            setActivePanel('feeling-pin');
          }}
          memories={mapMemories}
          onMemoryPress={handleMapMemoryPress}
          manualPinLocation={manualPinLocation}
          showTempPin={activePanel === 'feeling-pin'}
          isLoading={isLoadingMapMemories}
          containerStyle={StyleSheet.absoluteFill}
        />

        {/* Story 2.4b: Filmstrip overlay at bottom of map */}
        <Filmstrip
          ref={filmstripRef}
          memories={mapMemories}
          onMemoryPress={handleFilmstripMemoryPress}
          isLoading={isLoadingMapMemories}
          selectedMemoryId={selectedMemoryId}
        />

        <View style={styles.desktopOverlayContainer} pointerEvents="box-none">
          <View style={styles.desktopLeftPanelWide}>
            <View style={[styles.header, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <ThemedText type="title" style={styles.headerTitle}>
                My Living Map
              </ThemedText>
              <UploadStatus state={uploadState} />
            </View>
            <ScrollView style={styles.memoriesListWide} showsVerticalScrollIndicator={false}>
              {mapMemories.length === 0 ? (
                <Text style={styles.emptyText}>
                  {isLoadingMapMemories
                    ? 'Loading memories...'
                    : 'No memories in this area. Pan the map or start capturing!'}
                </Text>
              ) : (
                mapMemories.map((memory) => (
                  <TouchableOpacity
                    key={memory.id}
                    style={styles.desktopPostCard}
                    onPress={() => {
                      setCurrentRegion({
                        ...currentRegion,
                        latitude: memory.latitude,
                        longitude: memory.longitude,
                      });
                    }}
                  >
                    {memory.mediaUrl && (
                      <Image
                        source={{ uri: memory.mediaUrl }}
                        style={styles.desktopPostImage}
                        resizeMode="contain"
                      />
                    )}
                    <View style={styles.desktopPostContent}>
                      <View style={styles.desktopPostHeader}>
                        <View
                          style={[
                            styles.desktopPostIcon,
                            { backgroundColor: memory.type === 'voice' ? '#FF6B6B' : memory.type === 'photo' ? '#5856D6' : '#A855F7' },
                          ]}
                        >
                          <Ionicons
                            name={memory.type === 'voice' ? 'mic' : memory.type === 'photo' ? 'image' : 'heart'}
                            size={14}
                            color="#FFF"
                          />
                        </View>
                        <Text style={styles.desktopPostTitle}>
                          {memory.title || `${memory.type === 'voice' ? 'Voice' : memory.type === 'photo' ? 'Photo' : 'Feeling'} Memory`}
                        </Text>
                        {memory.feeling && (
                          <View style={[styles.desktopPostFeeling, { backgroundColor: '#F0EFFF' }]}>
                            <Text style={styles.desktopPostFeelingText}>{memory.feeling}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.desktopPostLocation}>
                        📍 {memory.latitude.toFixed(4)}, {memory.longitude.toFixed(4)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>

          <View style={[styles.desktopRightPanel, !isActionPanelOpen && styles.desktopRightPanelCollapsed]}>
            <TouchableOpacity
              style={styles.actionPanelToggle}
              onPress={() => setIsActionPanelOpen(!isActionPanelOpen)}
            >
              <Ionicons
                name={isActionPanelOpen ? 'chevron-forward' : 'chevron-back'}
                size={20}
                color="#666"
              />
              {!isActionPanelOpen && (
                <Text style={styles.actionPanelToggleText}>Actions</Text>
              )}
            </TouchableOpacity>
            {isActionPanelOpen && (
              <View style={styles.actionPanelContent}>
                {renderError()}
                {renderActionPanelContent()}
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Mobile Layout
  const CARD_WIDTH = width * 0.7;
  const SNAP_INTERVAL = CARD_WIDTH + 16;
  const INSET_X = (width - CARD_WIDTH) / 2;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <MapComponent
        initialRegion={currentRegion}
        onRegionChangeComplete={(region) => {
          setCurrentRegion(region);
          onRegionChange(region);
        }}
        onLongPress={(coordinate) => {
          setManualPinLocation(coordinate);
          setSelectedFeeling(null);
          setPinTitle('');
          setActivePanel('feeling-pin');
        }}
        memories={mapMemories}
        onMemoryPress={handleMapMemoryPress}
        manualPinLocation={manualPinLocation}
        showTempPin={activePanel === 'feeling-pin'}
        isLoading={isLoadingMapMemories}
        containerStyle={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.mobileHeaderOverlay} pointerEvents="box-none">
        {renderError()}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            width: '100%',
            paddingHorizontal: 16,
          }}
        >
          <UploadStatus state={uploadState} />
          <TouchableOpacity
            style={styles.fullscreenToggle}
            onPress={() => bottomSheetRef.current?.snapToIndex(0)}
          >
            <Ionicons name="map-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Overlay for Blocking Actions (Photo Confirm / Manual Pin) */}
      {activePanel !== 'none' ? (
        <View style={styles.mobileActionOverlay}>{renderActionPanelContent()}</View>
      ) : (
        <BottomSheet
          ref={bottomSheetRef}
          index={1}
          snapPoints={snapPoints}
          enablePanDownToClose={false}
          style={{ zIndex: 100 }}
        >
          <BottomSheetView style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Memories</Text>
          </BottomSheetView>

          {/* Di chuyển ScrollView xuống đây, ngoài BottomSheetView */}
          <View style={styles.quickActionsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsContainer}
              style={styles.quickActionsScroll}
              nestedScrollEnabled={true}
              scrollEnabled={true}
              bounces={false}
            >
              <TouchableOpacity
                style={[styles.actionBtn, activeMobileTab === 'posts' && styles.actionBtnActive]}
                onPress={() =>
                  setActiveMobileTab(activeMobileTab === 'posts' ? 'browse' : 'posts')
                }
              >
                <Ionicons
                  name="newspaper"
                  size={18}
                  color={activeMobileTab === 'posts' ? '#FFF' : '#5856D6'}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    activeMobileTab === 'posts' && styles.actionBtnTextActive,
                  ]}
                >
                  Posts
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, activeMobileTab === 'voice' && styles.actionBtnActive]}
                onPress={() =>
                  setActiveMobileTab(activeMobileTab === 'voice' ? 'browse' : 'voice')
                }
              >
                <Ionicons
                  name="mic"
                  size={18}
                  color={activeMobileTab === 'voice' ? '#FFF' : '#5856D6'}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    activeMobileTab === 'voice' && styles.actionBtnTextActive,
                  ]}
                >
                  Voice
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, activeMobileTab === 'photo' && styles.actionBtnActive]}
                onPress={() =>
                  setActiveMobileTab(activeMobileTab === 'photo' ? 'browse' : 'photo')
                }
              >
                <Ionicons
                  name="camera"
                  size={18}
                  color={activeMobileTab === 'photo' ? '#FFF' : '#5856D6'}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    activeMobileTab === 'photo' && styles.actionBtnTextActive,
                  ]}
                >
                  Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  activeMobileTab === 'feeling' && styles.actionBtnActive,
                ]}
                onPress={() =>
                  setActiveMobileTab(activeMobileTab === 'feeling' ? 'browse' : 'feeling')
                }
              >
                <Ionicons
                  name="heart"
                  size={18}
                  color={activeMobileTab === 'feeling' ? '#FFF' : '#5856D6'}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    activeMobileTab === 'feeling' && styles.actionBtnTextActive,
                  ]}
                >
                  Feeling
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={styles.sheetContent}>
            {activeMobileTab === 'posts' ? (
              <GHScrollView
                contentContainerStyle={{ paddingHorizontal: INSET_X, paddingVertical: 16 }}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={SNAP_INTERVAL}
                snapToAlignment="center"
              >
                {mapMemories.length === 0 ? (
                  <View style={[styles.emptyPostsContainer, { width: width - INSET_X * 2 }]}>
                    <Ionicons name="newspaper-outline" size={48} color="#CCC" />
                    <Text style={styles.emptyPostsText}>No posts yet</Text>
                    <Text style={styles.emptyPostsSubtext}>
                      Your memories will appear here as posts
                    </Text>
                  </View>
                ) : (
                  mapMemories.map((m) => (
                    <VisualMemoryCard
                      key={m.id}
                      memory={m}
                      onPress={(mem) => {
                        setCurrentRegion({
                          ...currentRegion,
                          latitude: mem.latitude,
                          longitude: mem.longitude,
                        });
                        setActiveMobileTab('browse');
                        bottomSheetRef.current?.snapToIndex(0);
                      }}
                    />
                  ))
                )}
              </GHScrollView>
            ) : activeMobileTab !== 'browse' ? (
              <View style={styles.mobileCaptureContainer}>
                {activeMobileTab === 'voice' && (
                  <VoiceRecorder
                    onRecordingComplete={(file) => {
                      handleRecordingComplete(file);
                      setActiveMobileTab('browse');
                    }}
                    onError={handleRecordingError}
                  />
                )}
                {activeMobileTab === 'photo' && (
                  <PhotoPicker
                    onPhotoSelected={(p) => {
                      handlePhotoSelected(p);
                      setActiveMobileTab('browse');
                    }}
                    onError={handleRecordingError}
                  />
                )}
                {activeMobileTab === 'feeling' && (
                  <View style={styles.feelingCaptureAreaMobile}>
                    <ThemedText style={{ textAlign: 'center', marginBottom: 12 }}>
                      How are you feeling right now?
                    </ThemedText>
                    <TouchableOpacity
                      style={[styles.dropPinButton, { width: '100%' }]}
                      onPress={() => {
                        handleDropFeelingPin();
                        setActiveMobileTab('browse');
                      }}
                    >
                      <Ionicons name="location" size={20} color="#FFF" />
                      <Text style={styles.dropPinButtonText}>Drop Feeling Pin Here</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.cancelCaptureBtn}
                  onPress={() => setActiveMobileTab('browse')}
                >
                  <Text style={styles.cancelCaptureText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <GHScrollView
                contentContainerStyle={{ paddingHorizontal: INSET_X, paddingVertical: 16 }}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={SNAP_INTERVAL}
                snapToAlignment="center"
              >
                {mapMemories.map((m) => (
                  <VisualMemoryCard
                    key={m.id}
                    memory={m}
                    onPress={(mem) => {
                      setCurrentRegion({
                        ...currentRegion,
                        latitude: mem.latitude,
                        longitude: mem.longitude,
                      });
                      bottomSheetRef.current?.snapToIndex(0);
                    }}
                  />
                ))}
              </GHScrollView>
            )}
          </View>
        </BottomSheet>
      )}
    </GestureHandlerRootView>
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
  mapContainer: {
    height: 280,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapLoadingOverlay: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapLoadingText: {
    fontSize: 12,
    color: '#5856D6',
    fontWeight: '600',
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
  mapInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  memoriesList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  // 50% wide left panel for desktop
  desktopLeftPanelWide: {
    width: '50%',
    maxWidth: 600,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: '90%',
  },
  memoriesListWide: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // Desktop Post Card styles
  desktopPostCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  desktopPostImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E8F4F8',
  },
  desktopPostContent: {
    padding: 14,
  },
  desktopPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  desktopPostIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopPostTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  desktopPostFeeling: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  desktopPostFeelingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5856D6',
  },
  desktopPostLocation: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
  // Collapsible action panel
  desktopRightPanelCollapsed: {
    width: 50,
    minWidth: 50,
    maxWidth: 50,
    padding: 0,
  },
  actionPanelToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  actionPanelToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 4,
    writingDirection: 'ltr',
  },
  actionPanelContent: {
    flex: 1,
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
  feelingCaptureHint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
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
  // Temporary pin marker
  tempPinMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -16 }, { translateY: -32 }],
    alignItems: 'center',
    zIndex: 5,
  },
  tempPinLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF3B30',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: -4,
  },

  // Mobile Layout Styles
  mobileHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    padding: 16,
    alignItems: 'flex-end',
    pointerEvents: 'box-none',
  },
  fullscreenToggle: {
    position: 'absolute',
    bottom: 300, // Adjust based on sheet
    right: 16,
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 50,
  },
  sheetHeader: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sheetContent: {
    flex: 1,
    backgroundColor: '#F9F9FB',
  },
  mobileTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  mobileTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  mobileTabActive: {
    backgroundColor: '#5856D6',
  },
  mobileTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  mobileTabTextActive: {
    color: '#FFF',
  },
  mobileActionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 200,
  },
  mobileCardsContainer: {
    padding: 16,
  },
  mobileCaptureContainer: {
    padding: 20,
  },
  feelingCaptureAreaMobile: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 16,
  },
  desktopOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    zIndex: 10,
  },
  desktopLeftPanel: {
    width: 380,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '100%',
  },
  desktopRightPanel: {
    width: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  mobileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  quickActions: {
    flex: 1,
    marginLeft: 12,
  },
  quickActionsScroll: {
    flexGrow: 0,
  },
  quickActionsContainer: {
    gap: 8,
    paddingRight: 16,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  actionBtnMap: {
    backgroundColor: '#E5E5EA',
  },
  actionBtnActive: {
    backgroundColor: '#5856D6',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5856D6',
  },
  actionBtnTextActive: {
    color: '#FFF',
  },
  cancelCaptureBtn: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 10,
  },
  cancelCaptureText: {
    color: '#999',
    fontSize: 14,
  },
  quickActionsWrapper: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  // Posts tab styles
  emptyPostsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyPostsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyPostsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  postItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  postItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postItemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  postItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  postItemLocation: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  postItemFeeling: {
    backgroundColor: '#F0EFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  postItemFeelingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5856D6',
  },
});
