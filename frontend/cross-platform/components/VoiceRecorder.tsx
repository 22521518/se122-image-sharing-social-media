import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Text, Alert, Platform } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useMemories } from '../context/MemoriesContext';

interface VoiceRecorderProps {
  onRecordingComplete: (data: {
    uri: string;
    duration: number;
    latitude: number;
    longitude: number;
  }) => void;
  onError?: (error: string) => void;
}

const MAX_DURATION_MS = 5000; // 5 seconds max

export function VoiceRecorder({ onRecordingComplete, onError }: VoiceRecorderProps) {
  const { uploadState } = useMemories();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const isStartingRef = useRef(false); // Mutex to prevent double-tap
  const isStoppingRef = useRef(false); // Mutex to prevent double-stop

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
  }, []);

  // Pulse animation while recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const requestPermissions = async () => {
    try {
      // Request audio permission
      const audioPermission = await Audio.requestPermissionsAsync();
      if (audioPermission.status !== 'granted') {
        setPermissionError('Microphone permission is required to record voice stickers');
        setHasPermissions(false);
        return;
      }

      // Request location permission
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (locationPermission.status !== 'granted') {
        setPermissionError('Location permission is required to place voice stickers on the map');
        setHasPermissions(false);
        return;
      }

      setHasPermissions(true);
      setPermissionError(null);
    } catch (error) {
      console.error('Permission error:', error);
      setPermissionError('Failed to request permissions');
      setHasPermissions(false);
    }
  };

  const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Location error:', error);
      return null;
    }
  };

  const startRecording = async () => {
    if (!hasPermissions) {
      Alert.alert('Permissions Required', permissionError || 'Please grant microphone and location permissions');
      return;
    }

    // Prevent multiple parallel starts (double-tap protection)
    if (isRecording || recordingRef.current || isStartingRef.current) {
      console.log('Already recording or starting, ignoring double-tap');
      return;
    }

    // Prevent recording while uploading
    if (uploadState === 'uploading') {
      console.log('Upload in progress, cannot start new recording');
      onError?.('Please wait for the current upload to finish');
      return;
    }

    // Set mutex lock
    isStartingRef.current = true;

    try {
      // Get location first
      const location = await getCurrentLocation();
      if (!location) {
        onError?.('Could not get your location. Please ensure location services are enabled.');
        return;
      }
      locationRef.current = location;

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording with optimized settings for voice
      const recording = new Audio.Recording();
      
      // Set up native-level status monitoring for auto-stop
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.durationMillis && status.durationMillis >= MAX_DURATION_MS) {
          // Native-level auto-stop as backup to JS timer
          stopRecording();
        }
      });

      // PREPARE
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MEDIUM,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 64000,
        },
      });

      // START
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer and auto-stop at MAX_DURATION
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setRecordingDuration(Math.min(elapsed, MAX_DURATION_MS));

        // Auto-stop at max duration
        if (elapsed >= MAX_DURATION_MS) {
          stopRecording();
        }
      }, 100);

    } catch (error) {
      console.error('Recording start error:', error);
      onError?.('Failed to start recording');
      // Cleanup on failure
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) { /* ignore */ }
        recordingRef.current = null;
      }
      setIsRecording(false);
    } finally {
      isStartingRef.current = false; // Release mutex
    }
  };

  const stopRecording = async () => {
    // Prevent double-stop
    if (isStoppingRef.current) {
      console.log('Already stopping, ignoring');
      return;
    }
    
    // Capture the current recording instance to avoid race conditions
    const recording = recordingRef.current;
    
    // If we don't have a recording ref, we can't stop anything.
    if (!recording) {
      setIsRecording(false);
      return;
    }

    // Set mutex lock
    isStoppingRef.current = true;

    try {
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

    let durationMillis = 0;
    
      // Get status to check recording state and duration
      try {
        const status = await recording.getStatusAsync();
        durationMillis = status.durationMillis || 0;
        
        // Stop and unload if currently recording
        if (status.isRecording) {
          await recording.stopAndUnloadAsync();
        } else {
          // If not recording but loaded, ensure it's unloaded
          await recording.stopAndUnloadAsync();
        }
      } catch (e) {
        // Fallback: If getStatus fails, try to stop/unload blindly to ensure cleanup
        console.warn('Error getting status or stopping:', e);
        try { await recording.stopAndUnloadAsync(); } catch (ign) {}
      }

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      // Get URI
      const uri = recording.getURI();
      
      setIsRecording(false);

      const durationSeconds = durationMillis / 1000;

      if (uri && locationRef.current && durationSeconds >= 1.0) {
        onRecordingComplete({
          uri,
          duration: durationSeconds,
          latitude: locationRef.current.latitude,
          longitude: locationRef.current.longitude,
        });
      } else if (durationSeconds < 1.0) {
        onError?.(`Recording too short (${durationSeconds.toFixed(1)}s). Hold for at least 1 second.`);
      }

      // Only nullify if it's still the same recording (though unlikely to change if we handle start correctly)
      if (recordingRef.current === recording) {
        recordingRef.current = null;
      }
      locationRef.current = null;
      setRecordingDuration(0);

    } catch (error) {
      console.error('Recording stop error:', error);
      setIsRecording(false);
      // Ensure cleanup
      if (recordingRef.current === recording) {
        recordingRef.current = null;
      }
      onError?.('Failed to save recording');
    } finally {
      isStoppingRef.current = false; // Release mutex
    }
  };

  const handlePressIn = () => {
    startRecording();
  };

  const handlePressOut = () => {
    // Small delay to ensure startRecording has time to initialize if it was just called
    // or just call stopRecording immediately and let the logic handle it.
    stopRecording();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}s`;
  };

  return (
    <View style={styles.container}>
      {/* Timer display */}
      {isRecording && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
          <Text style={styles.maxText}>/ 5.0s</Text>
        </View>
      )}

      {/* Recording button */}
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={styles.buttonWrapper}
      >
        <Animated.View
          style={[
            styles.recordButton,
            isRecording && styles.recordingButton,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Ionicons
            name={isRecording ? 'mic' : 'mic-outline'}
            size={32}
            color="#FFFFFF"
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Permission error message */}
      {permissionError && (
        <TouchableOpacity onPress={requestPermissions} style={styles.errorContainer}>
          <Text style={styles.errorText}>{permissionError}</Text>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      )}

      {/* Instructions */}
      {!isRecording && !permissionError && (
        <Text style={styles.instructionText}>
          Hold to record (max 5 seconds)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWrapper: {
    padding: 10,
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  maxText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 4,
  },
  instructionText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
});
