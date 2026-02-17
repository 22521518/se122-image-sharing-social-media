import {
    ActionMenu,
    DoubleTapLike,
    ImageCarousel,
    LikeButton,
    ReportModal,
    UserAvatar
} from '@/components/shared';
import { EditPostModal } from '@/components/social/EditPostModal';
import { useAuth } from '@/context/AuthContext';
import type { PostDetail } from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface PostCardProps {
  post: PostDetail;
  onLike: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onReport?: (postId: string) => void;
  onUpdated?: () => void;
}

export function PostCard({ post, onLike, onComment, onReport, onUpdated }: PostCardProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [isLiked, setIsLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isOwnPost = currentUser?.id === post.author.id;

  // Defensive check for missing author
  if (!post.author) {
    console.warn('PostCard: post.author is undefined for post', post.id);
    return null;
  }

  const handleLike = () => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1));
    onLike(post.id);
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
    }
  };

  const goToPost = () => router.push({ pathname: '/(tabs)/post/[id]', params: { id: post.id } });
  const goToProfile = () =>
    router.push({ pathname: '/(tabs)/user/[id]', params: { id: post.author.id } });

  console.log("PostCard id: ", post.id);
  console.log("PostCard: ", post);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.authorInfo} onPress={goToProfile}>
          <UserAvatar src={post.author.avatarUrl} name={post.author.name || 'User'} size="sm" />
          <View>
            <Text style={styles.authorName}>{post.author.name}</Text>
            <Text style={styles.timestamp}>
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color="#737373" />
        </Pressable>
      </View>

      {/* Image(s) with carousel */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <DoubleTapLike onDoubleTap={handleDoubleTap}>
          <ImageCarousel
            images={post.imageUrls}
            aspectRatio="square"
            maxHeight={400}
            onImagePress={goToPost}
          />
        </DoubleTapLike>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <LikeButton isLiked={isLiked} likeCount={likeCount} onToggle={handleLike} />
          <Pressable style={styles.actionButton} onPress={goToPost}>
            <Ionicons name="chatbubble-outline" size={20} color="#737373" />
            <Text style={styles.actionCount}>{post.commentCount}</Text>
          </Pressable>
        </View>
        <Pressable style={styles.actionButton}>
          <Ionicons name="bookmark-outline" size={20} color="#737373" />
        </Pressable>
      </View>

      {/* Content */}
      <Pressable style={styles.content} onPress={goToPost}>
        <Text style={styles.contentText}>
          <Text style={styles.username} onPress={goToProfile}>
            {post.author.name}{' '}
          </Text>
          {post.content}
        </Text>

        {post.commentCount > 0 && (
          <Text style={styles.viewComments}>View all {post.commentCount} comments</Text>
        )}
      </Pressable>

      {/* Action Menu */}
      <ActionMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        items={[
          ...(isOwnPost
            ? [
                {
                  label: 'Edit Post',
                  icon: 'create-outline',
                  onPress: () => setShowEditModal(true),
                },
                {
                  label: 'Delete Post',
                  icon: 'trash-outline',
                  onPress: () => {
                    // TODO: Implement delete post
                  },
                  destructive: true,
                },
              ]
            : [
                {
                  label: 'Report Post',
                  icon: 'flag-outline',
                  onPress: () => setShowReportModal(true),
                  destructive: true,
                },
              ]),
          {
            label: 'Copy Link',
            icon: 'link-outline',
            onPress: () => {
              // TODO: Copy post link
            },
          },
        ]}
      />

      {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetType="POST"
        targetId={post.id}
        onReported={() => {
          onReport?.(post.id);
        }}
      />

      {/* Edit Post Modal */}
      <EditPostModal
        visible={showEditModal}
        postId={post.id}
        onClose={() => setShowEditModal(false)}
        onUpdated={onUpdated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  timestamp: {
    fontSize: 12,
    color: '#737373',
  },
  menuButton: {
    padding: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  actionCount: {
    fontSize: 14,
    color: '#737373',
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  contentText: {
    fontSize: 14,
    color: '#171717',
    lineHeight: 20,
  },
  username: {
    fontWeight: '600',
  },
  viewComments: {
    fontSize: 14,
    color: '#737373',
    marginTop: 4,
  },
});
