/**
 * MemoryAudioPlayer Component (Web Version)
 *
 * Uses HTML5 Audio API for web compatibility.
 */
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(providedDuration || 0);
  const [error, setError] = useState<string | null>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || providedDuration || 0);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPlaybackComplete?.();
    };

    const handleError = () => {
      setError('Failed to load audio');
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      if (autoPlay) {
        audio.play().catch(console.error);
        setIsPlaying(true);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    // Cleanup
    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audioRef.current = null;
    };
  }, [audioUrl, providedDuration, autoPlay, onPlaybackComplete]);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch((err) => {
        console.error('Play error:', err);
        setError('Failed to play audio');
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (event: any) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    const seekTime = percentage * duration;

    if (isFinite(seekTime) && seekTime >= 0 && seekTime <= duration) {
      audio.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const totalDuration = duration || providedDuration || 0;

  if (error) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.card }, styles.errorContainer, style]}
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
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      {/* Play/Pause Button */}
      <Pressable
        onPress={handlePlayPause}
        style={[
          styles.playButton,
          { backgroundColor: Colors.memory.voice },
          isLoading && { backgroundColor: colors.mutedForeground },
        ]}
        disabled={isLoading}
      >
        <Ionicons
          name={isLoading ? 'hourglass' : isPlaying ? 'pause' : 'play'}
          size={28}
          color={colors.primaryForeground}
        />
      </Pressable>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        {/* Progress Bar - clickable */}
        <Pressable style={styles.progressBarContainer} onPress={handleSeek}>
          <View style={[styles.progressBarBackground, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress}%`, backgroundColor: Colors.memory.voice },
              ]}
            />
          </View>
        </Pressable>

        {/* Time Display */}
        <View style={styles.timeContainer}>
          <ThemedText style={[styles.timeText, { color: colors.textSecondary }]}>
            {formatTime(currentTime)}
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
    cursor: 'pointer',
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
