import { Colors } from '@/constants/Colors';
import { Postcard } from '@/types/api.types';
import { calculateDistance } from '@/utils/geo';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface LockedPostcardModalProps {
  visible: boolean;
  postcard: Postcard | null;
  onClose: () => void;
  onRefresh?: () => Promise<void>;
}

export function LockedPostcardModal({
  visible,
  postcard,
  onClose,
  onRefresh,
}: LockedPostcardModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userDistance, setUserDistance] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const isGeoLocked = !!(postcard?.unlockLatitude && postcard?.unlockLongitude);

  // Calculate distance when modal opens for geo-locked postcards
  useEffect(() => {
    if (visible && isGeoLocked && postcard) {
      setIsLoadingLocation(true);
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setUserDistance('Location permission denied');
            return;
          }

          const location = await Location.getCurrentPositionAsync({});
          const dist = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            postcard.unlockLatitude!,
            postcard.unlockLongitude!,
          );

          if (dist.km < 1) {
            setUserDistance(`${dist.meters}m away`);
          } else {
            setUserDistance(`${dist.km.toFixed(1)}km away`);
          }
        } catch (error) {
          console.warn('Failed to calculate distance:', error);
          setUserDistance('Unable to get location');
        } finally {
          setIsLoadingLocation(false);
        }
      })();
    }
  }, [visible, isGeoLocked, postcard]);

  if (!postcard) return null;

  // Use status from backend - the source of truth
  const isLocked = postcard.status === 'LOCKED';
  const isUnlocked = postcard.status === 'UNLOCKED';

  const isTimeLocked = !!postcard.unlockDate;

  // Check if time has passed (show refresh button)
  const isTimePassedButLocked =
    isTimeLocked && isLocked && new Date(postcard.unlockDate!) <= new Date();

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Determine unlock status and message based on backend status
  let iconName: keyof typeof Ionicons.glyphMap = 'lock-closed';
  let iconColor = '#737373';
  let title = 'This postcard is locked';
  let message = 'You cannot view the content yet.';

  if (isUnlocked) {
    // Backend says it's unlocked - should not show this modal normally
    // but handle just in case
    iconName = 'lock-open';
    iconColor = '#22c55e';
    title = 'Postcard Unlocked!';
    message = 'This postcard is ready to be viewed.';
  } else if (isLocked) {
    if (isGeoLocked) {
      iconName = 'location';
      iconColor = '#10b981'; // Green for geo
      title = 'Location Locked';
      const lat = postcard.unlockLatitude!.toFixed(4);
      const lng = postcard.unlockLongitude!.toFixed(4);
      const radius = postcard.unlockRadius || 100;
      const distanceText = isLoadingLocation
        ? 'Calculating distance...'
        : userDistance || 'Unknown distance';
      message = `📍 (${lat}, ${lng})\n📏 Within ${radius}m radius\n🚶 ${distanceText}`;
    } else if (isTimeLocked) {
      const date = new Date(postcard.unlockDate!);
      const now = new Date();

      if (date > now) {
        // Future date - show countdown
        iconName = 'time';
        iconColor = '#f59e0b'; // Amber for time
        title = 'Time Locked';
        const timeUntil = formatDistanceToNow(date, { addSuffix: false });
        message = `This postcard will be available in ${timeUntil} (${format(date, 'MMM d, yyyy')}).`;
      } else {
        // Date has passed but still locked (processing delay)
        iconName = 'hourglass';
        iconColor = Colors.light.primary; // Blue for processing
        title = 'Unlocking...';
        message = 'This postcard is being unlocked. Please refresh in a moment.';
      }
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
            <Ionicons name={iconName} size={32} color={iconColor} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {isTimePassedButLocked && onRefresh && (
            <Pressable
              style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
              onPress={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#fff" />
                  <Text style={styles.refreshButtonText}>Try Again</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  closeButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  refreshButton: {
    width: '100%',
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  refreshButtonDisabled: {
    opacity: 0.7,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
