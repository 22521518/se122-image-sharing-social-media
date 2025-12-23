import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { LikeButton } from '@/components/social/LikeButton';
import { CommentList } from '@/components/social/CommentList';
import { CommentInput } from '@/components/social/CommentInput';
import { useAuth } from '@/context/AuthContext';
import { socialService, PostDetail, Comment as CommentType } from '@/services/social.service';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, accessToken, user } = useAuth();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(0);

  // Ref to CommentList for adding new comments
  const commentListRef = useRef<{ addComment: (comment: CommentType) => void } | null>(null);

  const loadPost = useCallback(async (showRefresh = false) => {
    if (!id || !accessToken) return;

    if (showRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const postData = await socialService.getPost(id, accessToken);
      setPost(postData);
      setCommentCount(postData.commentCount);
      setError(null);
    } catch (err: any) {
      if (err?.status === 404 || err?.message?.includes('404')) {
        setError('Post not found');
      } else {
        setError('Failed to load post');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, accessToken]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleLoginRequired = () => {
    router.push('/(auth)/login');
  };

  const handleLikeChange = (liked: boolean, newCount: number) => {
    if (post) {
      setPost({ ...post, liked, likeCount: newCount });
    }
  };

  const handleCommentCountChange = (count: number) => {
    setCommentCount(count);
    if (post) {
      setPost({ ...post, commentCount: count });
    }
  };

  const handleSubmitComment = async (content: string) => {
    if (!accessToken || !id) return;

    const response = await socialService.createComment(id, content, accessToken);
    handleCommentCountChange(response.commentCount);
    // The CommentList will refresh or we can add optimistically
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
        <ThemedText style={styles.errorText}>{error || 'Post not found'}</ThemedText>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Post',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadPost(true)} />
        }
      >
        {/* Author Header */}
        <View style={styles.authorSection}>
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
            <ThemedText style={styles.authorName}>
              {post.author.name || 'Anonymous'}
            </ThemedText>
            <ThemedText style={styles.timestamp}>{formatDate(post.createdAt)}</ThemedText>
          </View>
        </View>

        {/* Post Content */}
        <View style={styles.contentSection}>
          <ThemedText style={styles.postContent}>{post.content}</ThemedText>
        </View>

        {/* Interaction Bar */}
        <View style={styles.interactionBar}>
          <LikeButton
            postId={post.id}
            initialLiked={post.liked}
            initialCount={post.likeCount}
            isAuthenticated={isAuthenticated}
            accessToken={accessToken || undefined}
            onLikeChange={handleLikeChange}
            onLoginRequired={handleLoginRequired}
            size="large"
            showCount
          />
          <View style={styles.commentCountContainer}>
            <Ionicons name="chatbubble-outline" size={24} color="#666" />
            <ThemedText style={styles.commentCountText}>{commentCount}</ThemedText>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Comments Section Header */}
        <View style={styles.commentsHeader}>
          <ThemedText style={styles.sectionTitle}>Comments</ThemedText>
        </View>

        {/* Comments List */}
        <View style={styles.commentsSection}>
          <CommentList
            postId={post.id}
            accessToken={accessToken || undefined}
            currentUserId={user?.id}
            isAuthenticated={isAuthenticated}
            onLoginRequired={handleLoginRequired}
            onCommentCountChange={handleCommentCountChange}
          />
        </View>
      </ScrollView>

      {/* Comment Input Fixed at Bottom */}
      <CommentInput
        onSubmit={handleSubmitComment}
        isAuthenticated={isAuthenticated}
        onLoginRequired={handleLoginRequired}
        placeholder="Write a comment..."
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  headerButton: {
    padding: 8,
    marginLeft: Platform.OS === 'ios' ? 0 : 8,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  authorInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  contentSection: {
    padding: 16,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  interactionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 24,
  },
  commentCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentCountText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  divider: {
    height: 8,
    backgroundColor: '#f5f5f5',
  },
  commentsHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  commentsSection: {
    minHeight: 200,
  },
  errorText: {
    fontSize: 16,
    color: '#888',
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
