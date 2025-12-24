import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { ThemedText } from '../themed-text';
import { socialService, Comment as CommentType } from '../../services/social.service';
import { Ionicons } from '@expo/vector-icons';

interface CommentListProps {
  itemId: string;
  targetType?: 'post' | 'memory';
  accessToken?: string;
  currentUserId?: string;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
  onCommentCountChange?: (count: number) => void;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
}

interface CommentItemProps {
  comment: CommentType;
  onDelete: (commentId: string) => Promise<void>;
  isDeleting: boolean;
}

function CommentItem({ comment, onDelete, isDeleting }: CommentItemProps) {
  const handleDelete = () => {
    // Use window.confirm for web, Alert.alert for native
    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('Delete this comment?')) {
        onDelete(comment.id);
      }
    } else {
      Alert.alert(
        'Delete Comment',
        'Are you sure you want to delete this comment?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(comment.id) },
        ]
      );
    }
  };

  const formattedDate = new Date(comment.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.commentItem}>
      <View style={styles.avatarContainer}>
        {comment.author.avatarUrl ? (
          <Image source={{ uri: comment.author.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <ThemedText style={styles.avatarText}>
              {comment.author.name?.charAt(0)?.toUpperCase() || '?'}
            </ThemedText>
          </View>
        )}
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <ThemedText style={styles.authorName}>
            {comment.author.name || 'Anonymous'}
          </ThemedText>
          <ThemedText style={styles.timestamp}>{formattedDate}</ThemedText>
        </View>
        <ThemedText style={styles.commentText}>{comment.content}</ThemedText>
      </View>
      {comment.isOwner && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={isDeleting}
          accessibilityLabel="Delete comment"
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export interface CommentListHandle {
  addComment: (comment: CommentType) => void;
  scrollToEnd: () => void;
}

export const CommentList = React.forwardRef<CommentListHandle, CommentListProps>(({
  itemId,
  targetType = 'post',
  accessToken,
  currentUserId,
  isAuthenticated = true,
  onLoginRequired,
  onCommentCountChange,
  ListHeaderComponent,
}, ref) => {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = React.useRef<FlatList>(null);

  React.useImperativeHandle(ref, () => ({
    addComment: (comment: CommentType) => {
      setComments((prev) => [...prev, comment]);
      // Scroll to end after state update
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    },
    scrollToEnd: () => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }));

  const loadComments = async (showRefresh = false) => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    if (showRefresh) {
      setIsRefreshing(true);
    }

    try {
      let response;
      if (targetType === 'post') {
        response = await socialService.getComments(itemId, accessToken);
      } else {
        response = await socialService.getMemoryComments(itemId, accessToken);
      }
      
      setComments(response.comments);
      onCommentCountChange?.(response.count);
      setError(null);
    } catch (err: any) {
      if (
        err?.status === 401 ||
        err?.message?.includes('401') ||
        err?.message?.includes('Unauthorized')
      ) {
        onLoginRequired?.();
      } else {
        setError('Failed to load comments');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [itemId, accessToken]);

  const handleDelete = async (commentId: string) => {
    if (!accessToken) return;

    setDeletingId(commentId);

    // Optimistic update
    const previousComments = [...comments];
    setComments(comments.filter((c) => c.id !== commentId));

    try {
      const response = await socialService.deleteComment(commentId, accessToken);
      onCommentCountChange?.(response.commentCount);
    } catch (err: any) {
      // Rollback on error
      setComments(previousComments);

      if (
        err?.status === 401 ||
        err?.message?.includes('401') ||
        err?.message?.includes('Unauthorized')
      ) {
        onLoginRequired?.();
      } else if (
        err?.status === 403 ||
        err?.message?.includes('403') ||
        err?.message?.includes('Forbidden')
      ) {
        Alert.alert('Error', 'You can only delete your own comments');
      } else {
        Alert.alert('Error', 'Failed to delete comment');
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadComments()}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  if (comments.length === 0) {
    return (
      <FlatList
        ref={flatListRef}
        data={[]}
        renderItem={null}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadComments(true)} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {ListHeaderComponent}
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
              <ThemedText style={styles.emptyText}>No comments yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>Be the first to comment!</ThemedText>
            </View>
          </>
        }
      />
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={comments}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CommentItem
          comment={item}
          onDelete={handleDelete}
          isDeleting={deletingId === item.id}
        />
      )}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => loadComments(true)} />
      }
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={ListHeaderComponent}
    />
  );
});

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#444',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
});
