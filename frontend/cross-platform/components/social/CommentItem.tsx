import { ActionMenu, ReportModal, UserAvatar } from '@/components/shared';
import { useAuth } from '@/context/AuthContext';
import type { Comment } from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface CommentItemProps {
  comment: Comment;
  onDelete?: (commentId: string) => void;
  onReport?: (commentId: string) => void;
}

export function CommentItem({ comment, onDelete, onReport }: CommentItemProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const isOwnComment = currentUser?.id === comment.author.id;

  const goToProfile = () =>
    router.push({ pathname: '/(tabs)/user/[id]', params: { id: comment.author.id } });

  return (
    <View style={styles.container}>
      <UserAvatar
        src={comment.author.avatarUrl}
        name={comment.author.name || 'User'}
        size="sm"
        onPress={goToProfile}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.textContainer}>
            <Text style={styles.username} onPress={goToProfile}>
              {comment.author.name}
            </Text>
            <Text style={styles.commentText}> {comment.content}</Text>
          </View>

          <Pressable
            style={styles.menuButton}
            onPress={() => setShowMenu(!showMenu)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={14} color="#737373" />
          </Pressable>
        </View>

        <Text style={styles.timestamp}>
          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
        </Text>
      </View>

      {/* Action Menu */}
      <ActionMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        items={[
          ...(isOwnComment
            ? [
                {
                  label: 'Delete Comment',
                  icon: 'trash-outline',
                  onPress: () => onDelete?.(comment.id),
                  destructive: true,
                },
              ]
            : [
                {
                  label: 'Report Comment',
                  icon: 'flag-outline',
                  onPress: () => setShowReportModal(true),
                  destructive: true,
                },
              ]),
        ]}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="COMMENT"
        targetId={comment.id}
        onReported={() => {
          onReport?.(comment.id);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  commentText: {
    fontSize: 14,
    color: '#171717',
  },
  menuButton: {
    padding: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#737373',
    marginTop: 4,
  },
});
