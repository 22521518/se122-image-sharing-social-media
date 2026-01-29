import { FeelingBadge } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';
import type { Memory } from '@/context/MemoriesContext';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface MemoryFilmstripProps {
  memories: Memory[];
  onMemoryPress?: (memory: Memory) => void;
  compact?: boolean;
}

export function MemoryFilmstrip({
  memories,
  onMemoryPress,
  compact = false,
}: MemoryFilmstripProps) {
  const { user } = useAuth();
  const cardWidth = compact ? 128 : 200;
  const cardHeight = compact ? 120 : 280;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const node = flatListRef.current?.getScrollableNode();
      if (node instanceof HTMLElement) {
        const onWheel = (e: WheelEvent) => {
          if (e.deltaY !== 0) {
            e.preventDefault();
            node.scrollLeft += e.deltaY;
          }
        };
        node.addEventListener('wheel', onWheel, { passive: false });
        return () => node.removeEventListener('wheel', onWheel);
      }
    }
  }, []);

  if (memories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No memories to display</Text>
      </View>
    );
  }

  const renderMemoryCard = ({ item }: { item: Memory }) => (
    <MemoryCard
      memory={item}
      onPress={() => onMemoryPress?.(item)}
      compact={compact}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      currentUserId={user?.id}
    />
  );

  return (
    <FlatList
      ref={flatListRef}
      horizontal
      data={memories}
      keyExtractor={(item) => item.id}
      renderItem={renderMemoryCard}
      showsHorizontalScrollIndicator={true}
      persistentScrollbar={true}
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

interface MemoryCardProps {
  memory: Memory;
  onPress?: () => void;
  compact?: boolean;
  cardWidth: number;
  cardHeight: number;
  currentUserId?: string;
}

function MemoryCard({ memory, onPress, compact, cardWidth, cardHeight, currentUserId }: MemoryCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const hasImage = memory.mediaUrl && (memory.type === 'photo' || memory.type === 'mixed');
  const hasAudio = memory.type === 'voice' || memory.type === 'mixed';
  const hasPlaceholder = memory.placeholderMetadata;

  // Get feeling emoji
  const getFeelingEmoji = (feeling?: string) => {
    const emojis: Record<string, string> = {
      JOY: '😊',
      CALM: '😌',
      ENERGETIC: '⚡',
      INSPIRED: '✨',
      MELANCHOLY: '😢',
    };
    return feeling ? emojis[feeling] || '📍' : '📍';
  };

  const toggleAudio = () => {
    setIsPlaying(!isPlaying);
    // In a real app, this would control audio playback
  };

  // Get privacy icon name
  const getPrivacyIcon = (privacy?: string) => {
    const p = privacy?.toLowerCase();
    if (p === 'public') return 'globe-outline';
    if (p === 'friends') return 'people-outline';
    return 'lock-closed-outline'; // Private default
  };

  return (
    <Pressable style={[styles.card, { width: cardWidth, height: cardHeight }]} onPress={onPress}>
      {/* Background */}
      {hasImage && memory.mediaUrl ? (
        <Image
          source={{ uri: memory.mediaUrl }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : hasPlaceholder ? (
        <View style={[StyleSheet.absoluteFillObject, styles.placeholderBackground]}>
          <View style={styles.emojiContainer}>
            <Text style={styles.placeholderEmoji}>{getFeelingEmoji(memory.feeling)}</Text>
          </View>
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.defaultBackground]} />
      )}

      {/* Gradient overlay */}
      <View style={styles.gradientOverlay} />

      {/* Top Left: Avatar + Feeling Badge */}
      <View style={styles.topLeftControls}>
        {(memory.userId !== currentUserId || memory.user?.avatarUrl) ? (
          <View style={[styles.avatarContainer, memory.userId !== currentUserId && styles.friendAvatarContainer]}>
             {memory.user?.avatarUrl ? (
               <Image source={{ uri: memory.user.avatarUrl }} style={styles.avatar} />
             ) : (
               <View style={[styles.avatar, styles.avatarPlaceholder]}>
                 <Ionicons name="person" size={16} color="#999" />
               </View>
             )}
             {memory.userId !== currentUserId && memory.user?.name && (
                <Text style={styles.userName} numberOfLines={1}>{memory.user.name}</Text>
             )}
             {memory.feeling && (
               <View style={styles.avatarFeelingBadge}>
                  <FeelingBadge feeling={memory.feeling} size="sm" />
               </View>
             )}
          </View>
        ) : (
           memory.feeling && (
            <View style={styles.feelingBadge}>
              <FeelingBadge feeling={memory.feeling} size="sm" />
            </View>
          )
        )}
      </View>

      {/* Top Right Controls (Audio & Privacy) */}
      <View style={styles.topRightControls}>
        {/* Audio indicator */}
        {hasAudio && (
          <Pressable style={styles.controlButton} onPress={toggleAudio}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={12} color="#fff" />
          </Pressable>
        )}
        
        {/* Privacy Indicator */}
        <View style={[styles.controlButton, styles.privacyBadge]}>
          <Ionicons name={getPrivacyIcon(memory.privacy)} size={10} color="#fff" />
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={compact ? 1 : 2}>
          {memory.title || 'Untitled memory'}
        </Text>

        {!compact && (
          <>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.locationText} numberOfLines={1}>
                {`${memory.latitude.toFixed(4)}, ${memory.longitude.toFixed(4)}`}
              </Text>
            </View>
            <Text style={styles.timeText}>
              {formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#737373',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  separator: {
    width: 8,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
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
  defaultBackground: {
    backgroundColor: '#e5e5e5',
  },
  placeholderBackground: {
    backgroundColor: '#f0e6e6',
  },
  emojiContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  topLeftControls: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  avatarContainer: {
    marginBottom: 4,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  friendAvatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingRight: 8,
    borderRadius: 20,
    gap: 6,
  },
  userName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 80,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFeelingBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    transform: [{ scale: 0.8 }],
  },
  feelingBadge: {
    // Standard position if no avatar
  },
  topRightControls: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row', // Stack them horizontally
    gap: 4,
    alignItems: 'center',
  },
  controlButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioButton: {
    // Legacy style kept for backward compat if needed, but replaced by controlButton
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)', // Slightly darker for privacy
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
});
