/**
 * Memory Detail Deep Link Route (Story 6.5)
 *
 * Route: /memory/[id]
 * Displays a full-screen memory detail view with interactions.
 */
import { MemoryAudioPlayer } from '@/components/memories/MemoryAudioPlayer';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/AuthContext';
import { Memory } from '@/context/MemoriesContext';
import { ApiService } from '@/services/api.service';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const FEELING_EMOJIS: Record<string, string> = {
  JOY: '😊',
  CALM: '😌',
  ENERGETIC: '⚡',
  INSPIRED: '✨',
  MELANCHOLY: '😢',
};

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, isAuthenticated } = useAuth();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !accessToken) {
      setLoading(false);
      return;
    }

    const fetchMemory = async () => {
      try {
        const data = await ApiService.get<Memory>(`/api/memories/${id}`, accessToken);
        setMemory(data);
      } catch (err: any) {
        console.error('Failed to fetch memory:', err);
        setError(err.message || 'Memory not found');
      } finally {
        setLoading(false);
      }
    };

    fetchMemory();
  }, [id, accessToken]);

  const handleClose = () => {
    // Navigate back to map or previous screen
    if (router.canGoBack()) {
      // router.back();
      router.replace('/(tabs)/map');
    } else {
      router.replace('/(tabs)/map');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#5856D6" />
          <ThemedText style={styles.loadingText}>Loading memory...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !memory) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <ThemedText style={styles.errorText}>{error || 'Memory not found'}</ThemedText>
          <ThemedText style={styles.backLink} onPress={handleClose}>
            Go back
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const hasImage = memory.mediaUrl && (memory.type === 'photo' || memory.type === 'mixed');
  const hasAudio = memory.mediaUrl && (memory.type === 'voice' || memory.type === 'mixed');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {memory.title || 'Memory'}
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Image */}
        {hasImage && (
          <Image source={{ uri: memory.mediaUrl! }} style={styles.image} resizeMode="cover" />
        )}

        {/* Audio Player */}
        {hasAudio && (
          <View style={styles.audioSection}>
            <View style={styles.audioHeader}>
              <Ionicons name="mic" size={24} color="#5856D6" />
              <ThemedText style={styles.audioLabel}>Voice Memory</ThemedText>
            </View>
            <MemoryAudioPlayer
              audioUrl={memory.mediaUrl!}
              duration={memory.duration}
              autoPlay={false}
              style={{
                width: '100%',
              }}
            />
          </View>
        )}

        {/* Placeholder for text-only memories */}
        {!hasImage && !hasAudio && memory.feeling && (
          <View style={styles.feelingPlaceholder}>
            <ThemedText style={styles.feelingEmoji}>
              {FEELING_EMOJIS[memory.feeling] || '📍'}
            </ThemedText>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.metadataSection}>
          {memory.feeling && (
            <View style={styles.metadataBadge}>
              <ThemedText style={styles.metadataText}>
                {FEELING_EMOJIS[memory.feeling]} {memory.feeling}
              </ThemedText>
            </View>
          )}
          <View style={styles.metadataBadge}>
            <Ionicons name="location" size={14} color="#666" />
            <ThemedText style={styles.metadataText}>
              {memory.latitude.toFixed(4)}, {memory.longitude.toFixed(4)}
            </ThemedText>
          </View>
          <View style={styles.metadataBadge}>
            <Ionicons
              name={
                memory.privacy === 'public'
                  ? 'globe-outline'
                  : memory.privacy === 'friends'
                    ? 'people-outline'
                    : 'lock-closed-outline'
              }
              size={14}
              color="#666"
            />
            <ThemedText style={styles.metadataText}>{memory.privacy}</ThemedText>
          </View>
        </View>

        {/* Creator info */}
        {memory.user && (
          <View style={styles.creatorSection}>
            {memory.user.avatarUrl ? (
              <Image source={{ uri: memory.user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={16} color="#999" />
              </View>
            )}
            <ThemedText style={styles.creatorName}>{memory.user.name || 'Anonymous'}</ThemedText>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.stat}>
            <Ionicons name="heart" size={20} color="#ef4444" />
            <ThemedText style={styles.statText}>{memory.likeCount || 0}</ThemedText>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble" size={20} color="#666" />
            <ThemedText style={styles.statText}>{memory.commentCount || 0}</ThemedText>
          </View>
        </View>

        {/* Created date */}
        <ThemedText style={styles.dateText}>
          Created {new Date(memory.createdAt).toLocaleDateString()}
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
  },
  backLink: {
    marginTop: 24,
    color: '#5856D6',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  image: {
    width: width - 32,
    height: (width - 32) * 0.75,
    borderRadius: 12,
  },
  audioSection: {
    gap: 12,
  },
  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  feelingPlaceholder: {
    width: width - 32,
    height: 200,
    // backgroundColor: '#1c1c1e',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feelingEmoji: {
    fontSize: 64,
  },
  metadataSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metadataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  metadataText: {
    color: '#999',
    fontSize: 12,
  },
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    gap: 24,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: '#fff',
    fontSize: 14,
  },
  dateText: {
    color: '#666',
    fontSize: 12,
  },
});
