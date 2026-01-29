import { UserAvatar } from '@/components/shared';
import type { Postcard } from '@/types/api.types';
import { calculateDistance } from '@/utils/geo';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface PostcardDetailProps {
  postcard: Postcard | null;
  visible: boolean;
  onClose: () => void;
}

export function PostcardDetail({ postcard, visible, onClose }: PostcardDetailProps) {
  const [distance, setDistance] = useState<string | null>(null);

  if (!postcard) return null;

  const senderName = postcard.sender?.name || 'Unknown';
  const senderAvatar = postcard.sender?.avatarUrl;
  const recipientName = postcard.recipient?.name || 'Unknown';

  useEffect(() => {
    if (visible && postcard?.unlockLatitude && postcard?.unlockLongitude) {
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;

          const location = await Location.getCurrentPositionAsync({});
          const dist = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            postcard.unlockLatitude!,
            postcard.unlockLongitude!
          );
          
          if (dist.km < 1) {
            setDistance(`${dist.meters}m`);
          } else {
            setDistance(`${dist.km}km`);
          }
        } catch (error) {
          console.warn('Failed to calculate distance:', error);
        }
      })();
    }
  }, [visible, postcard]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.senderInfo}>
              <UserAvatar src={senderAvatar} name={senderName} size="md" />
              <View>
                <Text style={styles.senderName}>{senderName}</Text>
                <Text style={styles.date}>
                  {format(new Date(postcard.createdAt), 'MMM d, yyyy')}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#171717" />
            </Pressable>
          </View>

          <ScrollView style={styles.content}>
            {/* Image */}
            {postcard.mediaUrl && (
              <Image source={{ uri: postcard.mediaUrl }} style={styles.image} resizeMode="cover" />
            )}

            {/* Message */}
            <View style={styles.messageContainer}>
              {postcard.message && (
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>"{postcard.message}"</Text>
                </View>
              )}

              {/* Metadata */}
              <View style={styles.metadata}>
                {/* Recipient */}
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={16} color="#737373" />
                  <Text style={styles.metaText}>To: {recipientName}</Text>
                  {postcard.senderId === postcard.recipientId && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Future self</Text>
                    </View>
                  )}
                </View>

                {/* Unlock date */}
                {postcard.unlockDate && (
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={16} color="#737373" />
                    <Text style={styles.metaText}>
                      Unlocks: {format(new Date(postcard.unlockDate), 'MMM d, yyyy')}
                    </Text>
                  </View>
                )}

                {/* Unlock location */}
                {postcard.unlockLatitude && postcard.unlockLongitude && (
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={16} color="#737373" />
                    <Text style={styles.metaText}>
                      Location unlock: {postcard.unlockLatitude.toFixed(4)},{' '}
                      {postcard.unlockLongitude.toFixed(4)}
                      {distance ? ` (${distance} away)` : postcard.unlockRadius && ` (${postcard.unlockRadius}m radius)`}
                    </Text>
                  </View>
                )}

                {/* Status */}
                <View style={styles.metaRow}>
                  <Ionicons
                    name={
                      postcard.status === 'UNLOCKED' ? 'lock-open-outline' : 'lock-closed-outline'
                    }
                    size={16}
                    color="#737373"
                  />
                  <Text style={styles.metaText}>Status: {postcard.status}</Text>
                </View>
              </View>

              {/* Actions */}
              <Pressable style={styles.shareButton}>
                <Ionicons name="share-outline" size={16} color="#171717" />
                <Text style={styles.shareButtonText}>Share</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
  },
  date: {
    fontSize: 12,
    color: '#737373',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#f5f5f5',
  },
  messageContainer: {
    padding: 16,
    gap: 16,
  },
  messageBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
  },
  messageText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#171717',
    lineHeight: 20,
  },
  metadata: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: '#737373',
  },
  badge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    color: '#737373',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    marginTop: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
});
