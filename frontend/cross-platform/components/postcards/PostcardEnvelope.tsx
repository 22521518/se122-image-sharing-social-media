import { UserAvatar } from '@/components/shared';
import { Colors } from '@/constants/Colors';
import type { Postcard } from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

interface PostcardEnvelopeProps {
  postcard: Postcard;
  onOpen?: (postcard: Postcard) => void;
  onFlip?: (postcard: Postcard) => void;
}

/**
 * Check if postcard can be unlocked based on date and location
 */
export function PostcardEnvelope({ postcard, onOpen, onFlip }: PostcardEnvelopeProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Simple status check
  const isLocked = postcard.status === 'LOCKED';
  
  // Can unlock logic can be handled in parent, or kept simple here if needed for flip
  // For now, we assume if it's LOCKED, we just show the lock UI. 
  // Clicking it will trigger the parent's handler which decides whether to open Modal or Detail.

  const senderName = postcard.sender?.name || 'Unknown';
  const senderAvatar = postcard.sender?.avatarUrl;

  const handlePress = () => {
    // Just pass through to parent. 
    // Parent handles: Locked -> Modal, Unlocked -> Detail
    onOpen?.(postcard);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Animated.View
        style={[
          styles.envelope,
          isLocked ? styles.envelopeLocked : styles.envelopeUnlocked,
          { transform: [{ rotateY: frontInterpolate }] },
        ]}
      >
        {/* Lock Icon - Top Left */}
        {isLocked && (
          <View style={styles.lockIconContainer}>
             <Ionicons 
               name="lock-closed" 
               size={16} 
               color="#737373" 
             />
          </View>
        )}

        {/* Date stamp - top right */}
        <Text style={styles.dateStamp}>{format(new Date(postcard.createdAt), 'MMM d, yyyy')}</Text>

        {/* Sender info - bottom left */}
        <View style={styles.senderInfo}>
          <UserAvatar src={senderAvatar} name={senderName} size="sm" />
          <View>
            <Text style={styles.senderLabel}>From: {senderName}</Text>
          </View>
        </View>

        {/* Center Content - Type Icon */}
        <View style={styles.centerDecor}>
          {isLocked ? (
             <Ionicons 
               name={postcard.unlockDate ? "time-outline" : "location-outline"} 
               size={48} 
               color={postcard.unlockDate ? "#d97706" : "#10b981"} 
               style={{ opacity: 0.8 }}
             />
          ) : (
             <Ionicons name="mail-open-outline" size={48} color={Colors.light.primary} style={{opacity: 0.5}} />
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    aspectRatio: 4 / 3,
  },
  envelope: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    justifyContent: 'center', 
    alignItems: 'center',
  },
  envelopeLocked: {
    backgroundColor: '#fffbeb', // Warmer/Lighter background for locked
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  envelopeUnlocked: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  lockIconContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 8,
  },
  senderInfo: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  senderLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#171717',
  },
  dateStamp: {
    position: 'absolute',
    top: 12,
    right: 12,
    fontSize: 10,
    color: '#737373',
    fontWeight: '500',
  },
  centerDecor: {
      alignItems: 'center',
      justifyContent: 'center',
  },
});
