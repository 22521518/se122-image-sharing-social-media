import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ViewStyle } from 'react-native';
import { ThemedText } from '../themed-text';
import { socialService } from '../../services/social.service';

interface FollowButtonProps {
  userId: string;
  initialIsFollowing?: boolean;
  isAuthenticated?: boolean;
  accessToken?: string;
  onFollowChange?: (isFollowing: boolean) => void;
  onLoginRequired?: () => void;
  style?: ViewStyle;
}

export function FollowButton({ 
  userId, 
  initialIsFollowing = false, 
  isAuthenticated = true,
  accessToken,
  onFollowChange, 
  onLoginRequired,
  style 
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  if (!userId) {
    return null;
  }

  const backgroundColor = isFollowing ? '#ccc' : '#007AFF';
  const textColor = isFollowing ? '#000' : '#fff';

  const handleFollow = async () => {
    // Check if user is authenticated before following
    if (!isAuthenticated || !accessToken) {
      onLoginRequired?.();
      return;
    }

    setIsFollowing(true);
    
    try {
      await socialService.followUser(userId, accessToken);
      onFollowChange?.(true);
    } catch (error: any) {
      setIsFollowing(false);
      // Handle 401 Unauthorized - token expired or invalid
      if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        onLoginRequired?.();
      } else {
        Alert.alert('Error', 'Failed to follow user.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = () => {
    // Check if user is authenticated before unfollowing
    if (!isAuthenticated || !accessToken) {
      onLoginRequired?.();
      return;
    }

    // Use window.confirm for web, Alert.alert for native
    if (typeof window !== 'undefined' && window.confirm) {
      // Web platform
      if (window.confirm('Are you sure you want to unfollow this user?')) {
        performUnfollow();
      }
    } else {
      // Native platform
      Alert.alert(
        'Unfollow',
        'Are you sure you want to unfollow this user?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unfollow', style: 'destructive', onPress: performUnfollow },
        ]
      );
    }
  };

  const performUnfollow = async () => {
    if (!accessToken) return;
    
    setIsFollowing(false);
    
    try {
      await socialService.unfollowUser(userId, accessToken);
      onFollowChange?.(false);
    } catch (error: any) {
      setIsFollowing(true);
      // Handle 401 Unauthorized - token expired or invalid
      if (error?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        onLoginRequired?.();
      } else {
        Alert.alert('Error', 'Failed to unfollow user.');
      }
    }
  };

  const onPress = () => {
    if (isLoading) return;
    
    if (isFollowing) {
      handleUnfollow();
    } else {
      handleFollow();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor }, style]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <ThemedText style={[styles.text, { color: textColor }]}>
          {isFollowing ? 'Following' : 'Follow'}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  text: {
    fontWeight: '600',
    fontSize: 14,
  },
});
