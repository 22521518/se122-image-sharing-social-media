import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { LikeButton } from './LikeButton';
import { DoubleTapLike } from './DoubleTapLike';
import { socialService, PostDetail as PostDetailType } from '@/services/social.service';
import { Ionicons } from '@expo/vector-icons';

interface PostCardProps {
  post: PostDetailType;
  accessToken?: string;
  isAuthenticated?: boolean;
  currentUserId?: string;
  onLoginRequired?: () => void;
  onPress?: () => void;
  showDoubleTapLike?: boolean;
  style?: ViewStyle;
}

/**
 * PostCard - Displays a post with author info, content, and interaction buttons
 * Supports double-tap to like on mobile
 */
export function PostCard({
  post,
  accessToken,
  isAuthenticated = false,
  currentUserId,
  onLoginRequired,
  onPress,
  showDoubleTapLike = true,
  style,
}: PostCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleDoubleTapLike = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      onLoginRequired?.();
      return;
    }

    // If not liked, like it (double-tap always likes, never unlikes)
    if (!liked) {
      // Optimistic update
      setLiked(true);
      setLikeCount((prev) => prev + 1);

      try {
        const response = await socialService.toggleLike(post.id, accessToken);
        setLiked(response.liked);
        setLikeCount(response.likeCount);
      } catch (error) {
        // Rollback
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      }
    }
  }, [liked, isAuthenticated, accessToken, post.id, onLoginRequired]);

  const handleLikeChange = (newLiked: boolean, newCount: number) => {
    setLiked(newLiked);
    setLikeCount(newCount);
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({ pathname: '/post/[id]', params: { id: post.id } } as any);
    }
  };

  const handleCommentPress = () => {
    router.push({ pathname: '/post/[id]', params: { id: post.id } } as any);
  };

  const cardContent = (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Author Header */}
      <View style={styles.header}>
        {post.author.avatarUrl ? (
          <Image source={{ uri: post.author.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <ThemedText style={styles.avatarText}>
              {post.author.name?.charAt(0)?.toUpperCase() || '?'}
            </ThemedText>
          </View>
        )}
        <View style={styles.authorInfo}>
          <ThemedText style={styles.authorName} numberOfLines={1}>
            {post.author.name || 'Anonymous'}
          </ThemedText>
          <ThemedText style={styles.timestamp}>{formatDate(post.createdAt)}</ThemedText>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <ThemedText style={styles.postText} numberOfLines={5}>
          {post.content}
        </ThemedText>
      </View>

      {/* Interaction Bar */}
      <View style={styles.interactionBar}>
        <LikeButton
          postId={post.id}
          initialLiked={liked}
          initialCount={likeCount}
          isAuthenticated={isAuthenticated}
          accessToken={accessToken}
          onLikeChange={handleLikeChange}
          onLoginRequired={onLoginRequired}
          size="medium"
          showCount
        />
        <TouchableOpacity style={styles.commentButton} onPress={handleCommentPress}>
          <Ionicons name="chatbubble-outline" size={20} color="#666" />
          <ThemedText style={styles.commentCount}>
            {post.commentCount > 0 ? post.commentCount : ''}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Wrap with DoubleTapLike for mobile double-tap functionality
  if (showDoubleTapLike) {
    return (
      <DoubleTapLike
        onDoubleTap={handleDoubleTapLike}
        disabled={!isAuthenticated}
      >
        {cardContent}
      </DoubleTapLike>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  authorInfo: {
    marginLeft: 10,
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  interactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    gap: 16,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    gap: 4,
  },
  commentCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    minWidth: 20,
  },
});
