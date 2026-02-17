import type { Comment } from '@/services/social.service';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CommentItem } from './CommentItem';

interface CommentListProps {
  comments: Comment[];
  isLoading?: boolean;
  onDelete?: (commentId: string) => void;
  onReport?: (commentId: string) => void;
}

function SkeletonBox({ style }: { style?: object }) {
  return <View style={[styles.skeleton, style]} />;
}

export function CommentList({ comments, isLoading, onDelete, onReport }: CommentListProps) {
  if (isLoading) {
    return (
      <View>
        {[...Array(3)].map((_, i) => (
          <View key={i} style={styles.skeletonItem}>
            <SkeletonBox style={styles.skeletonAvatar} />
            <View style={styles.skeletonContent}>
              <SkeletonBox style={styles.skeletonText} />
              <SkeletonBox style={styles.skeletonTime} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (comments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
      </View>
    );
  }

  return (
    <View>
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} onDelete={onDelete} onReport={onReport} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
  },
  skeletonItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  skeletonAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  skeletonContent: {
    flex: 1,
    gap: 8,
  },
  skeletonText: {
    width: '75%',
    height: 16,
  },
  skeletonTime: {
    width: 64,
    height: 12,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#737373',
  },
});
