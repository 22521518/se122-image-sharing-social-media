import React, { useState, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ViewStyle,
  Animated,
  View,
} from 'react-native';
import { ThemedText } from '../themed-text';
import { socialService } from '../../services/social.service';
import { Ionicons } from '@expo/vector-icons';

interface LikeButtonProps {
  itemId: string; // Renamed from postId for clarity, but keeping postId supported for back-compat if needed (or just use generic)
  targetType?: 'post' | 'memory';
  initialLiked?: boolean;
  initialCount?: number;
  isAuthenticated?: boolean;
  accessToken?: string;
  onLikeChange?: (liked: boolean, count: number) => void;
  onLoginRequired?: () => void;
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
}

const SIZE_CONFIG = {
  small: { icon: 20, fontSize: 12 },
  medium: { icon: 24, fontSize: 14 },
  large: { icon: 32, fontSize: 16 },
};

export function LikeButton({
  itemId,
  targetType = 'post',
  initialLiked = false,
  initialCount = 0,
  isAuthenticated = true,
  accessToken,
  onLikeChange,
  onLoginRequired,
  style,
  size = 'medium',
  showCount = true,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(initialLiked ? 1 : 0)).current;

  // Sync with external state changes
  useEffect(() => {
    setLiked(initialLiked);
    setCount(initialCount);
    colorAnim.setValue(initialLiked ? 1 : 0);
  }, [initialLiked, initialCount]);

  if (!itemId) {
    return null;
  }

  const sizeConfig = SIZE_CONFIG[size];

  const animateHeart = (toLiked: boolean) => {
    // Scale bounce animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Color transition
    Animated.timing(colorAnim, {
      toValue: toLiked ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  };

  const handleToggleLike = async () => {
    if (isLoading) return;

    // Check authentication
    if (!isAuthenticated || !accessToken) {
      onLoginRequired?.();
      return;
    }

    // Optimistic update
    const previousLiked = liked;
    const previousCount = count;
    const newLiked = !liked;
    const newCount = newLiked ? count + 1 : Math.max(0, count - 1);

    setLiked(newLiked);
    setCount(newCount);
    animateHeart(newLiked);
    setIsLoading(true);

    try {
      let response;
      if (targetType === 'post') {
        response = await socialService.toggleLike(itemId, accessToken);
      } else {
        response = await socialService.toggleLikeMemory(itemId, accessToken);
      }
      
      // Sync with server response
      setLiked(response.liked);
      setCount(response.likeCount);
      onLikeChange?.(response.liked, response.likeCount);
    } catch (error: any) {
      // Rollback on error
      setLiked(previousLiked);
      setCount(previousCount);
      animateHeart(previousLiked);

      // Handle 401 Unauthorized
      if (
        error?.status === 401 ||
        error?.message?.includes('401') ||
        error?.message?.includes('Unauthorized')
      ) {
        onLoginRequired?.();
      } else {
        Alert.alert('Error', 'Failed to update like.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Interpolate color from gray to red
  const heartColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#888', '#FF3B5C'],
  });

  return (
    <TouchableOpacity
      style={StyleSheet.flatten([styles.container, style])}
      onPress={handleToggleLike}
      disabled={isLoading}
      activeOpacity={0.7}
      accessibilityLabel={liked ? 'Unlike' : 'Like'}
      accessibilityRole="button"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#FF3B5C" />
      ) : (
        <Animated.View
          style={StyleSheet.flatten([
            styles.iconContainer,
            { transform: [{ scale: scaleAnim }] },
          ])}
        >
          <Animated.Text style={{ color: heartColor }}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={sizeConfig.icon}
            />
          </Animated.Text>
        </Animated.View>
      )}
      {showCount && (
        <ThemedText
          style={StyleSheet.flatten([
            styles.count,
            { fontSize: sizeConfig.fontSize, color: liked ? '#FF3B5C' : '#888' },
          ])}
        >
          {count > 0 ? count : ''}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontWeight: '500',
    minWidth: 20,
  },
});
