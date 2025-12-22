import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from 'expo-audio';
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
  const [isInitializing, setIsInitializing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Use the new expo-audio hook with preset
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const isStartingRef = useRef(false); // Mutex to prevent double-tap
  const isStoppingRef = useRef(false); // Mutex to prevent double-stop

  // Derived state from recorder
  const isRecording = audioRecorder.isRecording;

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
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  // Timer for duration tracking and auto-stop
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (isRecording) {
      startTimeRef.current = Date.now();
      intervalId = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setRecordingDuration(Math.min(elapsed, MAX_DURATION_MS));

        // Auto-stop at max duration - use ref to avoid stale closure
        if (elapsed >= MAX_DURATION_MS && !isStoppingRef.current) {
          isStoppingRef.current = true;
          audioRecorder
            .stop()
            .then(() => {
              const uri = audioRecorder.uri;
              const durationSeconds = MAX_DURATION_MS / 1000;

              if (uri && locationRef.current && durationSeconds >= 1.0) {
                onRecordingComplete({
                  uri,
                  duration: durationSeconds,
                  latitude: locationRef.current.latitude,
                  longitude: locationRef.current.longitude,
                });
              }
              locationRef.current = null;
              setRecordingDuration(0);
              isStoppingRef.current = false;
            })
            .catch(console.error);
        }
      }, 100);
      timerRef.current = intervalId;
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRecording, audioRecorder, onRecordingComplete]);

  const requestPermissions = async () => {
    try {
      // Request audio permission using expo-audio
      const audioStatus = await AudioModule.requestRecordingPermissionsAsync();
      if (!audioStatus.granted) {
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
      Alert.alert(
        'Permissions Required',
        permissionError || 'Please grant microphone and location permissions',
      );
      return;
    }

    // Prevent multiple parallel starts (double-tap protection)
    if (isRecording || isStartingRef.current) {
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
    setIsInitializing(true);

    try {
      // Get location first
      const location = await getCurrentLocation();
      if (!location) {
        onError?.('Could not get your location. Please ensure location services are enabled.');
        setIsInitializing(false);
        isStartingRef.current = false;
        return;
      }
      locationRef.current = location;

      // Configure audio mode for recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Prepare and start recording using the new expo-audio API
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsInitializing(false);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Recording start error:', error);
      onError?.('Failed to start recording');
      setIsInitializing(false);
    } finally {
      isStartingRef.current = false; // Release mutex
    }
  };

  const stopRecording = async () => {
    // Prevent double-stop
    if (isStoppingRef.current || !isRecording) {
      return;
    }

    // Set mutex lock
    isStoppingRef.current = true;

    try {
      // Stop recording and get the URI
      await audioRecorder.stop();

      const uri = audioRecorder.uri;
      const durationSeconds = recordingDuration / 1000;

      if (uri && locationRef.current && durationSeconds >= 1.0) {
        onRecordingComplete({
          uri,
          duration: durationSeconds,
          latitude: locationRef.current.latitude,
          longitude: locationRef.current.longitude,
        });
      } else if (durationSeconds < 1.0) {
        onError?.(
          `Recording too short (${durationSeconds.toFixed(1)}s). Hold for at least 1 second.`,
        );
      }

      locationRef.current = null;
      setRecordingDuration(0);
    } catch (error) {
      console.error('Recording stop error:', error);
      onError?.('Failed to save recording');
    } finally {
      isStoppingRef.current = false; // Release mutex
    }
  };

  const handlePressIn = () => {
    startRecording();
  };

  const handlePressOut = () => {
    stopRecording();
  };

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
        disabled={isInitializing}
      >
        <Animated.View
          style={[
            styles.recordButton,
            isRecording && styles.recordingButton,
            isInitializing && styles.initializingButton,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {isInitializing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={32} color="#FFFFFF" />
          )}
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
        <Text style={styles.instructionText}>Hold to record (max 5 seconds)</Text>
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
  initializingButton: {
    backgroundColor: '#FF8888',
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
