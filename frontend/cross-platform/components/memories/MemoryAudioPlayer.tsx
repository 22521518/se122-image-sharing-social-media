/**
 * MemoryAudioPlayer Component (Native Version)
 *
 * Uses expo-audio for iOS/Android.
 */
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { AudioSource, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '../themed-text';

interface MemoryAudioPlayerProps {
  audioUrl: string;
  duration?: number;
  autoPlay?: boolean;
  onPlaybackComplete?: () => void;
  style?: object;
}

export function MemoryAudioPlayer({
  audioUrl,
  duration: providedDuration,
  autoPlay = false,
  onPlaybackComplete,
  style,
}: MemoryAudioPlayerProps) {
  // Always use light theme colors
  const colors = Colors.light;
  const [error, setError] = useState<string | null>(null);
  const [progressBarWidth, setProgressBarWidth] = useState(200);

  // Create audio source
  const audioSource: AudioSource = useMemo(() => ({ uri: audioUrl }), [audioUrl]);

  // Initialize audio player
  const player = useAudioPlayer(audioSource);
  const status = useAudioPlayerStatus(player);

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate duration
  const audioDuration = status.duration || 0;
  const totalDuration = providedDuration && providedDuration > 0 ? providedDuration : audioDuration;

  const currentPosition = status.currentTime || 0;
  const progress =
    totalDuration > 0 && isFinite(currentPosition)
      ? Math.min(100, Math.max(0, (currentPosition / totalDuration) * 100))
      : 0;

  // Auto-play on mount
  useEffect(() => {
    if (autoPlay && player && status.isLoaded) {
      player.play();
    }
  }, [autoPlay, status.isLoaded]);

  // Handle playback completion
  useEffect(() => {
    if (status.didJustFinish && onPlaybackComplete) {
      onPlaybackComplete();
    }
  }, [status.didJustFinish, onPlaybackComplete]);

  const handlePlayPause = async () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        await player.play();
      }
    } catch (err) {
      console.error('[MemoryAudioPlayer] Play error:', err);
      setError('Failed to play audio');
    }
  };

  const handleSeek = (locationX: number) => {
    if (
      !isFinite(locationX) ||
      !isFinite(totalDuration) ||
      totalDuration <= 0 ||
      progressBarWidth <= 0
    ) {
      return;
    }

    const percentage = Math.max(0, Math.min(100, (locationX / progressBarWidth) * 100));
    const seekPosition = (percentage / 100) * totalDuration;

    if (isFinite(seekPosition) && seekPosition >= 0) {
      player.seekTo(seekPosition);
    }
  };

  const handleProgressBarLayout = (event: LayoutChangeEvent) => {
    setProgressBarWidth(event.nativeEvent.layout.width);
  };

  const isPlaying = status.playing;
  const isLoading = status.isBuffering;
  const isLoaded = status.isLoaded;

  if (error) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: '#FFF5F3', borderColor: Colors.memory.voice + '30' },
          styles.errorContainer,
          style,
        ]}
      >
        <Ionicons name="alert-circle" size={24} color={colors.destructive} />
        <ThemedText style={[styles.errorText, { color: colors.destructive }]}>{error}</ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: '#FFF5F3', borderColor: Colors.memory.voice + '30' },
        style,
      ]}
    >
      <Pressable
        onPress={handlePlayPause}
        style={[
          styles.playButton,
          { backgroundColor: Colors.memory.voice },
          isLoading && { backgroundColor: colors.mutedForeground },
          !isLoaded && !isLoading && { backgroundColor: colors.muted },
        ]}
        disabled={!isLoaded && !isLoading}
      >
        <Ionicons
          name={isLoading ? 'hourglass' : isPlaying ? 'pause' : 'play'}
          size={28}
          color="#FFFFFF"
        />
      </Pressable>

      <View style={styles.progressSection}>
        <Pressable
          style={styles.progressBarContainer}
          onLayout={handleProgressBarLayout}
          onPress={(event) => handleSeek(event.nativeEvent.locationX)}
        >
          <View
            style={[styles.progressBarBackground, { backgroundColor: Colors.memory.voice + '20' }]}
          >
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress}%`, backgroundColor: Colors.memory.voice },
              ]}
            />
          </View>
        </Pressable>

        <View style={styles.timeContainer}>
          <ThemedText style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatTime(currentPosition)}
          </ThemedText>
          <ThemedText style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatTime(totalDuration)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    flex: 1,
    gap: 4,
  },
  progressBarContainer: {
    height: 32,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 11,
  },
  errorContainer: {
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    marginLeft: 8,
  },
});
