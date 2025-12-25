import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import postcardsService, { Postcard } from '../../services/postcards.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PostcardViewerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, accessToken } = useAuth();

  const [postcard, setPostcard] = useState<Postcard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);

  // Animation values
  const envelopeScale = useRef(new Animated.Value(1)).current;
  const envelopeRotate = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentScale = useRef(new Animated.Value(0.8)).current;
  const lockShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPostcard();
  }, [id]);

  const loadPostcard = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await postcardsService.getPostcard(id, accessToken);
      setPostcard(data);
      
      // If already unlocked, show content immediately
      if (data.status === 'UNLOCKED') {
        contentOpacity.setValue(1);
        contentScale.setValue(1);
        setHasRevealed(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load postcard');
    } finally {
      setLoading(false);
    }
  };

  const playLockShake = () => {
    Animated.sequence([
      Animated.timing(lockShake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(lockShake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(lockShake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(lockShake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const playRevealAnimation = () => {
    setIsRevealing(true);

    // Envelope flip and scale up animation
    Animated.parallel([
      Animated.timing(envelopeScale, {
        toValue: 1.2,
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(envelopeRotate, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Then fade in content
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(contentScale, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(envelopeScale, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setHasRevealed(true);
        setIsRevealing(false);
      });
    });
  };

  const handleTapLocked = () => {
    if (postcard?.status === 'LOCKED') {
      playLockShake();
    } else if (postcard?.status === 'UNLOCKED' && !hasRevealed) {
      playRevealAnimation();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const rotateInterpolate = envelopeRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !postcard) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error || 'Postcard not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLocked = postcard.status === 'LOCKED';
  const isSender = postcard.senderId === user?.id;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isLocked ? '🔒 Locked Postcard' : '📬 Postcard'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Sender Info */}
      <View style={styles.senderInfo}>
        <Ionicons name="person-circle" size={40} color="#ccc" />
        <View style={styles.senderDetails}>
          <Text style={styles.senderName}>
            From: {postcard.sender?.name || 'Unknown'}
          </Text>
          <Text style={styles.sentDate}>
            Sent on {formatDate(postcard.createdAt)}
          </Text>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.contentArea}>
        {/* Locked State - Envelope */}
        {isLocked && !isSender && (
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={handleTapLocked}
            style={styles.lockedContainer}
          >
            <Animated.View 
              style={[
                styles.envelope,
                { transform: [{ translateX: lockShake }] }
              ]}
            >
              <View style={styles.envelopeTop} />
              <View style={styles.envelopeBody}>
                <Ionicons name="lock-closed" size={48} color="#666" />
                <Text style={styles.lockedText}>
                  {postcard.unlockDate 
                    ? `Opens on ${formatDate(postcard.unlockDate)}`
                    : 'Opens when you arrive at the location'
                  }
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* Unlocked State - Reveal Animation */}
        {postcard.status === 'UNLOCKED' && !hasRevealed && (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={handleTapLocked}
            style={styles.revealContainer}
          >
            <Animated.View 
              style={[
                styles.envelope,
                { 
                  transform: [
                    { scale: envelopeScale },
                    { rotateY: rotateInterpolate }
                  ] 
                }
              ]}
            >
              <View style={styles.envelopeTop} />
              <View style={styles.envelopeBody}>
                <Ionicons name="gift-outline" size={48} color="#007AFF" />
                <Text style={styles.tapToReveal}>Tap to reveal!</Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        )}

        {/* Revealed Content */}
        {(hasRevealed || isSender) && postcard.status !== 'LOCKED' && (
          <Animated.View 
            style={[
              styles.revealedContent,
              {
                opacity: isSender ? 1 : contentOpacity,
                transform: [{ scale: isSender ? 1 : contentScale }]
              }
            ]}
          >
            {postcard.mediaUrl && (
              <Image 
                source={{ uri: postcard.mediaUrl }} 
                style={styles.postcardImage}
                resizeMode="cover"
              />
            )}
            {postcard.message && (
              <View style={styles.messageContainer}>
                <Text style={styles.message}>{postcard.message}</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Sender preview of locked content */}
        {isSender && isLocked && (
          <View style={styles.senderPreview}>
            <Text style={styles.senderPreviewLabel}>
              (This is what they'll see after unlock)
            </Text>
            {postcard.mediaUrl && (
              <Image 
                source={{ uri: postcard.mediaUrl }} 
                style={styles.postcardImage}
                resizeMode="cover"
              />
            )}
            {postcard.message && (
              <View style={styles.messageContainer}>
                <Text style={styles.message}>{postcard.message}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Unlock Info Footer */}
      <View style={styles.footer}>
        {postcard.viewedAt && (
          <Text style={styles.viewedAt}>
            Viewed on {formatDate(postcard.viewedAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  senderDetails: {
    marginLeft: 12,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sentDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  contentArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  lockedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  envelope: {
    width: SCREEN_WIDTH * 0.8,
    aspectRatio: 1.4,
    backgroundColor: '#f5f0e6',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  envelopeTop: {
    height: '25%',
    backgroundColor: '#e8dfd0',
    borderBottomWidth: 2,
    borderBottomColor: '#d4c9b9',
  },
  envelopeBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  lockedText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  tapToReveal: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  revealedContent: {
    width: '100%',
    alignItems: 'center',
  },
  postcardImage: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 0.75,
    borderRadius: 12,
    marginBottom: 16,
  },
  messageContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  senderPreview: {
    width: '100%',
    alignItems: 'center',
  },
  senderPreviewLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  viewedAt: {
    fontSize: 12,
    color: '#999',
  },
});
