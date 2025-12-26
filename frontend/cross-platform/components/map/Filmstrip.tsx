/**
 * Filmstrip Component - Story 2.4b
 * 
 * Horizontal scrollable filmstrip showing thumbnails of visible memories.
 * - Binds to mapMemories from MemoriesContext
 * - onPress centers map and triggers audio playback
 * - Two-way sync with map pins (optional)
 */
import React, { useRef, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { Memory } from '@/context/MemoriesContext';
import { getMemoryColor, getMemoryIcon, getTypeIcon, getTypeColor } from '@/constants/MemoryUI';
import { Feeling } from '@/components/FeelingSelector';

// Thumbnail sizing
const THUMBNAIL_SIZE = 80;
const ITEM_MARGIN = 8;

import { MemoryDetailModal } from '@/components/memories/MemoryDetailModal';

// ... existing code ...

interface FilmstripProps {
  memories: Memory[];
  onMemoryPress: (memory: Memory) => void;
  isLoading?: boolean;
  selectedMemoryId?: string | null;
  onAudioPlay?: (memoryId: string) => void;
}

export interface FilmstripRef {
  scrollToMemory: (memoryId: string) => void;
}

interface FilmstripItemProps {
  memory: Memory;
  onPress: () => void;
  onLongPress: () => void;
  isSelected: boolean;
}

function FilmstripItem({ memory, onPress, onLongPress, isSelected }: FilmstripItemProps) {
  const color = getMemoryColor(memory);
  const icon = getMemoryIcon(memory);
  const typeIcon = getTypeIcon(memory.type);
  const hasImage = memory.mediaUrl && memory.type === 'photo';

  return (
    <TouchableOpacity
      style={StyleSheet.flatten([
        styles.thumbnailContainer,
        isSelected && styles.thumbnailSelected,
        isSelected && { borderColor: color },
      ])}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      {hasImage ? (
        <Image
          source={{ uri: memory.mediaUrl! }}
          style={styles.thumbnailImage}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={StyleSheet.flatten([styles.thumbnailPlaceholder, { backgroundColor: color + '30' }])}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
      )}

      {/* Type indicator badge */}
      <View style={StyleSheet.flatten([styles.typeBadge, { backgroundColor: color }])}>
        <Ionicons name={typeIcon} size={10} color="#FFF" />
      </View>

      {/* Voice indicator (shows if has audio) */}
      {memory.type === 'voice' && (
        <View style={styles.voiceIndicator}>
          <Ionicons name="play-circle" size={24} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

export const Filmstrip = forwardRef<FilmstripRef, FilmstripProps>(({
  memories,
  onMemoryPress,
  isLoading = false,
  selectedMemoryId,
  onAudioPlay,
}, ref) => {
  const flatListRef = useRef<FlatList>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [detailMemory, setDetailMemory] = useState<Memory | null>(null);
  
  // Use expo-audio useAudioPlayer hook
  const audioPlayer = useAudioPlayer(currentAudioUrl ?? undefined);

  // Play audio when player becomes ready and source has changed
  useEffect(() => {
    if (currentAudioUrl && audioPlayer) {
        // Attempt to play whenever the audio URL is active and player is ready
        // Note: useAudioPlayer handles loading state internally
        audioPlayer.play();
    }
  }, [currentAudioUrl, audioPlayer]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    scrollToMemory: (memoryId: string) => {
      const index = memories.findIndex((m) => m.id === memoryId);
      if (index !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5, // Center the item
        });
      }
    }
  }));

  // Handle memory press: center map, play audio if voice, AND open detail modal (Story 6.5: AC4)
  const handlePress = useCallback((memory: Memory) => {
    // Trigger map centering callback
    onMemoryPress(memory);

    // Open detail modal (Story 6.5: When I tap on a filmstrip item, open detail view)
    setDetailMemory(memory);

    // Play audio if it's a voice memory (AC: triggers Voice Sticker)
    if (memory.type === 'voice' && memory.mediaUrl) {
      // Update state to trigger useEffect
      setCurrentAudioUrl(memory.mediaUrl);
      onAudioPlay?.(memory.id);
    } else {
        // Stop audio if switching to non-voice
        setCurrentAudioUrl(null);
    }
  }, [onMemoryPress, onAudioPlay]);

  // Handle long press to show details
  const handleLongPress = useCallback((memory: Memory) => {
    setDetailMemory(memory);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailMemory(null);
  }, []);

  // Render item
  const renderItem = useCallback(
    ({ item }: { item: Memory }) => (
      <FilmstripItem
        memory={item}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
        isSelected={selectedMemoryId === item.id}
      />
    ),
    [handlePress, handleLongPress, selectedMemoryId]
  );

  const keyExtractor = useCallback((item: Memory) => item.id, []);

  // Empty state
  if (memories.length === 0 && !isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={24} color="#999" />
          <Text style={styles.emptyText}>Pan the map to see memories</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#5856D6" />
          </View>
        )}
        <FlatList
          ref={flatListRef}
          data={memories}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          // Performance optimizations
          removeClippedSubviews={Platform.OS !== 'web'}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={11}
          getItemLayout={(_data, index) => ({
            length: THUMBNAIL_SIZE + ITEM_MARGIN * 2,
            offset: (THUMBNAIL_SIZE + ITEM_MARGIN * 2) * index,
            index,
          })}
        />
      </View>

      <MemoryDetailModal
        visible={!!detailMemory}
        memory={detailMemory}
        onClose={closeDetail}
        // onLoginRequired should be passed from parent or handled via auth context in modal
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: THUMBNAIL_SIZE + 32, // Thumbnail + padding
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px -2px 8px rgba(0, 0, 0, 0.1)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        }),
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    marginHorizontal: ITEM_MARGIN,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.2,
          shadowRadius: 2,
          elevation: 2,
        }),
  },
  voiceIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  emptyState: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 8,
    right: 16,
    zIndex: 1,
  },
});

