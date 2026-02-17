import type { Feeling } from '@/components/FeelingSelector';
import { PageHeader } from '@/components/layout';
import { MemoryFilmstrip } from '@/components/map';
import { CreateMemoryModal } from '@/components/map/CreateMemoryModal';
import { MapComponent } from '@/components/map/MapComponent';
import { MemoryAudioPlayer } from '@/components/memories/MemoryAudioPlayer';
import { FloatingActionButton } from '@/components/shared';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useMemories, type Memory } from '@/context/MemoriesContext';
import { useMapViewport, type MapRegion } from '@/hooks/useMapViewport';
import { useIsMobileView } from '@/hooks/usePlatform';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// const { width } = Dimensions.get('window');
const FEELINGS: Feeling[] = ['JOY', 'CALM', 'ENERGETIC', 'INSPIRED', 'MELANCHOLY'];
const FEELING_EMOJIS: Record<Feeling, string> = {
  JOY: '😊',
  CALM: '😌',
  ENERGETIC: '⚡',
  INSPIRED: '✨',
  MELANCHOLY: '😢',
};

import { socialService } from '@/services/social.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MapScreen() {
  const router = useRouter();
  const isMobile = useIsMobileView();
  const insets = useSafeAreaInsets();
  const { user, accessToken } = useAuth();
  const { memories, fetchMemories, uploadFeelingPin, uploadPhotoMemory } = useMemories();

  // Data state
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);

  // Modal state
  const [captureModalVisible, setCaptureModalVisible] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Map state
  const [manualPinLocation, setManualPinLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showTempPin, setShowTempPin] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapRef = useRef<any>(null);

  // Default region (Ho Chi Minh City)
  const defaultRegion: MapRegion = {
    latitude: 10.8231,
    longitude: 106.6297,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Map viewport hook for bounding box queries
  const { onRegionChange, isLoading: isMapLoading } = useMapViewport();

  // Filter state
  const [feelingFilter, setFeelingFilter] = useState<Feeling | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // New memory form state
  const [newMemory, setNewMemory] = useState({
    title: '',
    content: '',
    feeling: 'JOY' as Feeling,
    photoUrl: '',
  });

  // Filter memories
  const filteredMemories = memories.filter((m) => {
    const matchesFeeling = feelingFilter === 'ALL' || m.feeling === feelingFilter;
    const matchesSearch =
      !searchQuery || (m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesFeeling && matchesSearch;
  });

  // Load memories on focus
  // Use isFocused as a more reliable trigger for refetching data
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      const loadMemories = async () => {
        try {
          await fetchMemories();
        } catch (error) {
          console.error('Failed to load memories:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadMemories();
    }
  }, [isFocused, fetchMemories]);

  // Memory interaction state
  const handleLike = async () => {
    if (!selectedMemory || !user) return;

    // Optimistic update
    const wasLiked = selectedMemory.liked;
    const newLikeCount = (selectedMemory.likeCount || 0) + (wasLiked ? -1 : 1);

    // Update local state for the modal
    setSelectedMemory((prev) =>
      prev
        ? {
            ...prev,
            liked: !wasLiked,
            likeCount: newLikeCount,
          }
        : null,
    );

    try {
      await socialService.toggleLikeMemory(selectedMemory.id, accessToken || '');
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Revert on error
      setSelectedMemory((prev) =>
        prev
          ? {
              ...prev,
              liked: wasLiked,
              likeCount: (prev.likeCount || 0) + (wasLiked ? 1 : -1),
            }
          : null,
      );
    }
  };

  const handleComment = () => {
    if (selectedMemory) {
      goToMemoryDetail(selectedMemory.id);
    }
  };

  const handleMemoryPress = useCallback(
    async (memory: Memory) => {
      setSelectedMemory(memory);
      setDetailModalVisible(true);

      // Fetch latest social status
      if (accessToken) {
        try {
          const status = await socialService.getLikeStatusMemory(memory.id, accessToken);
          setSelectedMemory((prev) =>
            prev && prev.id === memory.id ? { ...prev, liked: status.liked } : prev,
          );
        } catch (e) {
          console.log('Failed to fetch like status', e);
        }
      }

      // Fly to the memory location
      mapRef.current?.flyTo({
        latitude: memory.latitude,
        longitude: memory.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    },
    [accessToken],
  );

  const handleCapture = () => {
    setCaptureModalVisible(true);
  };

  const handleTeleport = () => {
    // Teleport to random memory
    if (filteredMemories.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredMemories.length);
      const memory = filteredMemories[randomIndex];
      handleMemoryPress(memory);
      // Fly to the memory location
      mapRef.current?.flyTo({
        latitude: memory.latitude,
        longitude: memory.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleMapLongPress = useCallback((coordinate: { latitude: number; longitude: number }) => {
    setManualPinLocation(coordinate);
    setShowTempPin(true);
    // Pre-fill the new memory with location and open create modal
    setNewMemory((prev) => ({
      ...prev,
      title: '',
      content: '',
    }));
    setCreateModalVisible(true);
  }, []);

  const handleRegionChangeComplete = useCallback(
    (region: MapRegion) => {
      onRegionChange(region);
    },
    [onRegionChange],
  );

  const handleCreateMemory = async (data: {
    title: string;
    content: string;
    feeling: Feeling;
    type: 'text_only' | 'voice' | 'photo' | 'mixed';
    privacy: 'private' | 'friends' | 'public';
    mediaUrl?: string;
    audioUrl?: string;
  }) => {
    if (!data.title.trim()) {
      return;
    }

    try {
      // Use manual pin location if available, otherwise use current location if available, else default to Ho Chi Minh City
      const location = manualPinLocation ||
        currentLocation || { latitude: 10.8231, longitude: 106.6297 };
      let created: Memory | null = null;

      if (data.type === 'photo' && data.mediaUrl) {
        // Upload as photo memory
        created = await uploadPhotoMemory({
          uri: data.mediaUrl,
          latitude: location.latitude,
          longitude: location.longitude,
          title: data.title,
          privacy: data.privacy,
        });
      } else {
        // Upload as feeling pin (with optional audio)
        created = await uploadFeelingPin({
          latitude: location.latitude,
          longitude: location.longitude,
          feeling: data.feeling,
          title: data.title,
          voiceUri: data.audioUrl,
          privacy: data.privacy,
        });
      }

      if (created) {
        setCreateModalVisible(false);
        setNewMemory({ title: '', content: '', feeling: 'JOY', photoUrl: '' });
        // Reset temp pin state
        setManualPinLocation(null);
        setShowTempPin(false);
      }
    } catch (error) {
      console.error('Failed to create memory:', error);
    }
  };

  const goToMemoryDetail = (memoryId: string) => {
    setDetailModalVisible(false);
    router.push({ pathname: '/(tabs)/memory/[id]', params: { id: memoryId } });
  };

  // Function to open modal with current location (for FAB and New button)
  const handleOpenCreateWithCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.warn('Failed to get current location:', error);
    }
    // Clear manual pin since we're using current location
    setManualPinLocation(null);
    setShowTempPin(false);
    setCreateModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Map"
        rightAction={
          <View>
            {/* New Post Button - Desktop only */}
            {!isMobile && (
              <Pressable
                style={styles.newMemoryButton}
                onPress={handleOpenCreateWithCurrentLocation}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.newMemoryButtonText}>New Memory</Text>
              </Pressable>
            )}
          </View>
        }
      />

      {/* Map Area */}
      <View style={styles.mapContainer}>
        <MapComponent
          ref={mapRef}
          initialRegion={defaultRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          onLongPress={handleMapLongPress}
          memories={filteredMemories}
          onMemoryPress={handleMemoryPress}
          manualPinLocation={manualPinLocation}
          showTempPin={showTempPin}
          isLoading={isMapLoading}
          containerStyle={styles.map}
        />
      </View>

      {/* Filmstrip Section */}
      <View
        style={[
          styles.filmstripContainer,
          {
            paddingBottom: Platform.select({
              ios: 90, // Tab bar height (84) + buffer
              android: 64 + insets.bottom, // Tab bar height (56) + buffer + safe area
              default: 64, // Web/desktop
            }),
          },
        ]}
      >
        {/* Header */}
        <View style={styles.filmstripHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.filmstripTitle}>Your Memories</Text>
            <Text style={styles.memoryCount}>{filteredMemories.length} memories</Text>
          </View>
          {/* Feeling Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContent}
          >
            <Pressable
              style={[styles.filterBadge, feelingFilter === 'ALL' && styles.filterBadgeActive]}
              onPress={() => setFeelingFilter('ALL')}
            >
              <Text
                style={[
                  styles.filterBadgeText,
                  feelingFilter === 'ALL' && styles.filterBadgeTextActive,
                ]}
              >
                All
              </Text>
            </Pressable>
            {FEELINGS.map((feeling) => (
              <Pressable
                key={feeling}
                style={[styles.filterBadge, feelingFilter === feeling && styles.filterBadgeActive]}
                onPress={() => setFeelingFilter(feeling)}
              >
                <Text
                  style={[
                    styles.filterBadgeText,
                    feelingFilter === feeling && styles.filterBadgeTextActive,
                  ]}
                >
                  {FEELING_EMOJIS[feeling]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Memory List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.light.primary} />
          </View>
        ) : filteredMemories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No memories found</Text>
          </View>
        ) : (
          <MemoryFilmstrip memories={filteredMemories} onMemoryPress={handleMemoryPress} />
        )}
      </View>

      {/* FAB for creating new memory */}
      {isMobile && (
        <FloatingActionButton
          onPress={handleOpenCreateWithCurrentLocation}
          icon={<Ionicons name="add" size={24} color="#fff" />}
        />
      )}

      {/* Capture Type Modal */}
      <Modal
        visible={captureModalVisible}
        transparent={Platform.OS === 'web'}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' || Platform.OS === 'android' ? 'pageSheet' : undefined}
        onRequestClose={() => setCaptureModalVisible(false)}
      >
        {Platform.OS === 'web' ? (
          <Pressable style={styles.modalOverlay} onPress={() => setCaptureModalVisible(false)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Capture a Memory</Text>
                <Pressable onPress={() => setCaptureModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#171717" />
                </Pressable>
              </View>

              <View style={styles.captureGrid}>
                <CaptureOption
                  icon="mic-outline"
                  label="Voice"
                  description="Record audio"
                  onPress={() => {
                    setCaptureModalVisible(false);
                    setCreateModalVisible(true);
                  }}
                />
                <CaptureOption
                  icon="camera-outline"
                  label="Photo"
                  description="Take a photo"
                  onPress={() => {
                    setCaptureModalVisible(false);
                    setCreateModalVisible(true);
                  }}
                />
                <CaptureOption
                  icon="happy-outline"
                  label="Feeling"
                  description="Log emotion"
                  onPress={() => {
                    setCaptureModalVisible(false);
                    setCreateModalVisible(true);
                  }}
                />
                <CaptureOption
                  icon="sparkles-outline"
                  label="Mixed"
                  description="All types"
                  onPress={() => {
                    setCaptureModalVisible(false);
                    setCreateModalVisible(true);
                  }}
                />
              </View>
            </View>
          </Pressable>
        ) : (
          <SafeAreaView style={styles.nativeModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Capture a Memory</Text>
              <Pressable onPress={() => setCaptureModalVisible(false)}>
                <Ionicons name="close" size={24} color="#171717" />
              </Pressable>
            </View>

            <View style={styles.captureGrid}>
              <CaptureOption
                icon="mic-outline"
                label="Voice"
                description="Record audio"
                onPress={() => {
                  setCaptureModalVisible(false);
                  setCreateModalVisible(true);
                }}
              />
              <CaptureOption
                icon="camera-outline"
                label="Photo"
                description="Take a photo"
                onPress={() => {
                  setCaptureModalVisible(false);
                  setCreateModalVisible(true);
                }}
              />
              <CaptureOption
                icon="happy-outline"
                label="Feeling"
                description="Log emotion"
                onPress={() => {
                  setCaptureModalVisible(false);
                  setCreateModalVisible(true);
                }}
              />
              <CaptureOption
                icon="sparkles-outline"
                label="Mixed"
                description="All types"
                onPress={() => {
                  setCaptureModalVisible(false);
                  setCreateModalVisible(true);
                }}
              />
            </View>
          </SafeAreaView>
        )}
      </Modal>

      {/* Create Memory Modal */}
      <CreateMemoryModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreateMemory}
        initialData={newMemory}
      />

      {/* Memory Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent={Platform.OS === 'web'}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' || Platform.OS === 'android' ? 'pageSheet' : undefined}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        {Platform.OS === 'web' ? (
          <Pressable style={styles.modalOverlay} onPress={() => setDetailModalVisible(false)}>
            <View style={styles.modalContent}>
              {selectedMemory && renderMemoryDetailContent()}
            </View>
          </Pressable>
        ) : (
          <SafeAreaView style={styles.nativeModalContainer}>
            {selectedMemory && renderMemoryDetailContent()}
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );

  // Helper function to render memory detail content
  function renderMemoryDetailContent() {
    if (!selectedMemory) return null;
    return (
      <>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{selectedMemory.title || 'Memory'}</Text>
          <Pressable onPress={() => setDetailModalVisible(false)}>
            <Ionicons name="close" size={24} color="#171717" />
          </Pressable>
        </View>

        <ScrollView style={styles.detailScroll}>
          {/* Image */}
          {selectedMemory.mediaUrl &&
            (selectedMemory.type === 'photo' || selectedMemory.type === 'mixed') && (
              <Image
                source={{ uri: selectedMemory.mediaUrl }}
                style={styles.detailImage}
                resizeMode="cover"
              />
            )}

          {/* Audio Player for voice memories */}
          {selectedMemory.mediaUrl &&
            (selectedMemory.type === 'voice' || selectedMemory.type === 'mixed') && (
              <View style={styles.audioPlayerWrapper}>
                <MemoryAudioPlayer
                  audioUrl={selectedMemory.mediaUrl}
                  duration={selectedMemory.duration}
                  autoPlay={false}
                />
              </View>
            )}

          {/* Placeholder for text/voice memories */}
          {selectedMemory.placeholderMetadata && !selectedMemory.mediaUrl && (
            <View style={[styles.detailPlaceholder, styles.placeholderGradient]}>
              <Text style={styles.placeholderEmoji}>
                {FEELING_EMOJIS[selectedMemory.feeling || 'JOY']}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.detailActions}>
            <View style={styles.leftActions}>
              <Pressable style={styles.actionButton} onPress={handleLike}>
                <Ionicons
                  name={selectedMemory.liked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={selectedMemory.liked ? '#ef4444' : '#171717'}
                />
                {selectedMemory.likeCount !== undefined && selectedMemory.likeCount > 0 && (
                  <Text style={styles.actionCount}>{selectedMemory.likeCount}</Text>
                )}
              </Pressable>
              <Pressable style={styles.actionButton} onPress={handleComment}>
                <Ionicons name="chatbubble-outline" size={24} color="#171717" />
                {selectedMemory.commentCount !== undefined &&
                  selectedMemory.commentCount > 0 && (
                    <Text style={styles.actionCount}>{selectedMemory.commentCount}</Text>
                  )}
              </Pressable>
            </View>
          </View>

          {/* Metadata */}
          <View style={styles.metadataRow}>
            <View style={styles.metadataBadge}>
              <Text style={styles.metadataText}>
                📍{' '}
                {`${selectedMemory.latitude.toFixed(4)}, ${selectedMemory.longitude.toFixed(4)}`}
              </Text>
            </View>
            {selectedMemory.feeling && (
              <View style={styles.metadataBadge}>
                <Text style={styles.metadataText}>
                  {FEELING_EMOJIS[selectedMemory.feeling]} {selectedMemory.feeling}
                </Text>
              </View>
            )}
            {selectedMemory.placeholderMetadata?.timeOfDay && (
              <View style={styles.metadataBadge}>
                <Text style={styles.metadataText}>
                  🕐 {selectedMemory.placeholderMetadata.timeOfDay}
                </Text>
              </View>
            )}
            <View style={styles.metadataBadge}>
              <Ionicons
                name={
                  selectedMemory.privacy?.toLowerCase() === 'public'
                    ? 'globe-outline'
                    : selectedMemory.privacy?.toLowerCase() === 'friends'
                      ? 'people-outline'
                      : 'lock-closed-outline'
                }
                size={12}
                color="#737373"
              />
            </View>
          </View>

          {/* View Full Button */}
          <Pressable
            style={styles.viewFullButton}
            onPress={() => goToMemoryDetail(selectedMemory.id)}
          >
            <Text style={styles.viewFullButtonText}>View Full Memory</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.light.primary} />
          </Pressable>
        </ScrollView>
      </>
    );
  }
}

// Capture Option Component
function CaptureOption({
  icon,
  label,
  description,
  onPress,
}: {
  icon: string;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.captureOption} onPress={onPress}>
      <View style={styles.captureIconContainer}>
        <Ionicons name={icon as any} size={24} color={Colors.light.primary} />
      </View>
      <Text style={styles.captureLabel}>{label}</Text>
      <Text style={styles.captureDescription}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  newMemoryButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newMemoryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    minHeight: 300,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  filmstripContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingVertical: 8,
    // paddingVertical: 8, // Duplicate removed
    // Removed maxHeight to allow content to dictate height
  },
  filmstripHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filmstripTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  memoryCount: {
    fontSize: 12,
    color: '#737373',
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  filterBadgeActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterBadgeText: {
    fontSize: 12,
    color: '#737373',
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#171717',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#737373',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    // On desktop, we want to center the modal
    ...(Platform.OS === 'web' && {
      alignItems: 'center',
      justifyContent: 'center',
    }),
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    // Mobile: Bottom sheet
    width: '100%',
    maxHeight: '90%', // Increased from 80% for mobile

    // Desktop: Centered card
    ...(Platform.OS === 'web' && {
      width: 480, // Fixed width on desktop
      maxHeight: '85%',
      borderRadius: 24, // Rounded corners on all sides
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    }),
  },
  nativeModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
  },
  captureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  captureOption: {
    // Responsive width logic needed in component or using flex basis
    width: '47%', // roughly half minus gap
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    gap: 8,
  },
  captureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  captureDescription: {
    fontSize: 12,
    color: '#737373',
  },
  detailScroll: {
    paddingHorizontal: 16,
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  audioPlayerWrapper: {
    marginBottom: 16,
    // backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
  },
  detailPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderGradient: {
    backgroundColor: '#f0e6e6',
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  detailContent: {
    fontSize: 14,
    color: '#737373',
    lineHeight: 20,
    marginBottom: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metadataBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  metadataText: {
    fontSize: 12,
    color: '#737373',
  },
  viewFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    marginBottom: 16,
  },
  viewFullButtonText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  actionCount: {
    fontSize: 14,
    color: '#171717',
    marginLeft: 4,
  },
});
