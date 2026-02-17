import { PageHeader } from '@/components/layout';
import { ActionMenu, DoubleTapLike, ImageCarousel, LikeButton, ReportModal, UserAvatar } from '@/components/shared';
import { ImageViewerModal } from '@/components/shared/ImageViewerModal';
import { CommentInput, CommentList } from '@/components/social';
import { EditPostModal } from '@/components/social/EditPostModal';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { socialService } from '@/services/social.service';
import type { Comment, PostDetail } from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const POST_MAX_WIDTH = 1000; // Increased for 2-column layout
const HORIZONTAL_PADDING = 16;
const TABLET_BREAKPOINT = 768;

export default function PostDetailPage() {
  const params = useLocalSearchParams<{ id?: string; postId?: string }>();
  const postId = params.id || params.postId;
  const router = useRouter();
  const { accessToken, user: currentUser } = useAuth();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [nextPostId, setNextPostId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isDesktop = screenWidth >= TABLET_BREAKPOINT;

  // contentPadding only applies to the container in desktop mode to center it
  const contentPadding =
    isDesktop && screenWidth > POST_MAX_WIDTH + HORIZONTAL_PADDING * 2
      ? (screenWidth - POST_MAX_WIDTH) / 8
      : 0;

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showCommentsModal, setShowCommentsModal] = useState(false);

  // Fetch post data - extracted for reuse
  const fetchPostData = useCallback(async () => {
    if (!postId || !accessToken) return;

    setIsLoading(true);
    setIsLoadingComments(true);

    try {
      const [postData, commentsData] = await Promise.all([
        socialService.getPost(postId, accessToken),
        socialService.getComments(postId, accessToken),
      ]);

      if (postData) {
        setPost(postData);
        setIsLiked(postData.liked ?? postData.isLiked ?? false);
        setLikeCount(postData.likeCount);
      }
      setComments(commentsData.comments);
    } catch (error) {
      console.error('Failed to load post:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingComments(false);
    }
  }, [postId, accessToken]);

  // Light refresh - only post data without loading state
  const refreshPost = useCallback(async () => {
    if (!postId || !accessToken) return;
    try {
      const postData = await socialService.getPost(postId, accessToken);
      if (postData) {
        setPost(postData);
        setIsLiked(postData.liked ?? postData.isLiked ?? false);
        setLikeCount(postData.likeCount);
      }
    } catch (error) {
      console.error('Failed to refresh post:', error);
    }
  }, [postId, accessToken]);

  // Use isFocused as a more reliable trigger for refetching data
  const isFocused = useIsFocused();

  useEffect(() => {
    const fetchNextPost = async () => {
      if (!accessToken || !postId) return;
      try {
        // Fetch feed to find context
        const feed = await socialService.getFeed(accessToken, undefined, 20);
        const currentIndex = feed.posts.findIndex((p) => p.id === postId);

        if (currentIndex !== -1 && currentIndex < feed.posts.length - 1) {
          // If current post is in feed and not last, get next one
          setNextPostId(feed.posts[currentIndex + 1].id);
        } else if (feed.posts.length > 0) {
          // Fallback: just get the first one if we can't find current or it's last
          // (Simple loop logic for "surfing", or could be more complex specific recommendation)
          const firstPost = feed.posts[0];
          if (firstPost.id !== postId) {
            setNextPostId(firstPost.id);
          }
        }
      } catch (error) {
        console.log('Failed to pre-fetch next post', error);
      }
    };

    if (isFocused) {
      fetchPostData();
      fetchNextPost();
    }
  }, [isFocused, postId, accessToken, fetchPostData]);

  const handleNextPost = () => {
    if (nextPostId) {
      router.push({ pathname: '/(tabs)/post/[id]', params: { id: nextPostId } });
    }
  };

  // Desktop: Arrow Key Navigation
  useEffect(() => {
    if (isDesktop && Platform.OS === 'web') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') {
          handleNextPost();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDesktop, nextPostId]);

  // Mobile: Swipe Gesture
  const swipeGesture = Gesture.Fling()
    .direction(3) // Direction.LEFT (1=RIGHT, 2=LEFT ?? Check docs: 1=RIGHT, 2=LEFT, 4=UP, 8=DOWN) - wait, standard is Directions.LEFT.
    // Let's use numeric literal for simplicity if needed or import Directions.
    // Directions.RIGHT = 1, LEFT = 2.
    // Actually, create-react-app / expo environment handles imports.
    // Let's assume Direction.LEFT (2) for "Next" (Swipe Left to go forward).
    .direction(2) // Directions.LEFT
    .onEnd(() => {
      if (!isDesktop && nextPostId) {
        // Run on JS thread
        router.push({ pathname: '/(tabs)/post/[id]', params: { id: nextPostId } });
      }
    })
    .runOnJS(true);

  const handleLike = async () => {
    if (!post || !accessToken) return;
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1));
    await socialService.likePost(post.id, accessToken);
  };

  const handleDoubleTap = () => {
    if (!isLiked) handleLike();
  };

  const handleAddComment = async (content: string) => {
    if (!postId || !accessToken) return;
    const response = await socialService.createComment(postId, content, accessToken);
    setComments((prev) => [response.comment, ...prev]);
    setPost((prev) => (prev ? { ...prev, commentCount: prev.commentCount + 1 } : null));
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!accessToken) return;
    await socialService.deleteComment(commentId, accessToken);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setPost((prev) => (prev ? { ...prev, commentCount: prev.commentCount - 1 } : null));
  };

  const goToProfile = () => {
    if (post) {
      router.push({ pathname: '/(tabs)/user/[id]', params: { id: post.author.id } });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <PageHeader showBack title="Post" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <PageHeader showBack title="Post" />
        <View style={styles.loadingContainer}>
          <Text style={styles.notFoundText}>Post not found</Text>
        </View>
      </View>
    );
  }

  // --- Components Parts ---

  const isOwnPost = currentUser?.id === post.author.id;

  const PostHeader = () => (
    <View style={styles.postHeader}>
      <Pressable style={styles.authorInfo} onPress={goToProfile}>
        <UserAvatar src={post.author.avatarUrl} name={post.author.name || 'User'} size="md" />
        <View>
          <Text style={styles.authorName}>{post.author.name}</Text>
          <Text style={styles.timestamp}>
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </Text>
        </View>
      </Pressable>
      <Pressable style={styles.moreButton} onPress={() => setShowMenu(true)}>
        <Ionicons name="ellipsis-horizontal" size={20} color="#737373" />
      </Pressable>
    </View>
  );

  const PostContent = () => (
    <View style={styles.postContent}>
      <Pressable onPress={goToProfile}>
        <Text style={styles.username}>{post.author.username || post.author.name}</Text>
      </Pressable>
      <Text style={styles.contentText}>{post.content}</Text>
    </View>
  );

  const ActionButtons = () => (
    <View style={styles.actionsRow}>
      <View style={styles.leftActions}>
        <LikeButton isLiked={isLiked} likeCount={likeCount} onToggle={handleLike} size="lg" />
        <Pressable
          style={styles.actionButton}
          onPress={() => (isDesktop ? null : setShowCommentsModal(true))}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#171717" />
          <Text style={styles.actionCount}>{post.commentCount}</Text>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Ionicons name="share-outline" size={24} color="#171717" />
        </Pressable>
      </View>
      <Pressable style={styles.actionButton}>
        <Ionicons name="bookmark-outline" size={24} color="#171717" />
      </Pressable>
    </View>
  );

  const CommentsSection = () => (
    <View style={styles.commentsSection}>
      <Text style={styles.commentsTitle}>Comments ({post.commentCount})</Text>
      <CommentList
        comments={comments}
        isLoading={isLoadingComments}
        onDelete={handleDeleteComment}
      />
    </View>
  );

  // --- Render Layouts ---

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
        <PageHeader showBack title="Post" />

        <View
          style={[
            styles.mainWrapper,
          {
            paddingHorizontal: contentPadding,
            maxWidth: isDesktop ? undefined : 600,
            alignSelf: 'center',
            width: '100%',
          },
        ]}
      >
        {isDesktop ? (
          // DESKTOP: 2-Column Layout
          <View style={styles.desktopContainer}>
            {/* Left Column: Image */}
            <View style={styles.leftColumn}>
              <View style={styles.desktopImageContainer}>
                {post.imageUrls && post.imageUrls.length > 0 ? (
                  <DoubleTapLike onDoubleTap={handleDoubleTap}>
                    <ImageCarousel
                      images={post.imageUrls}
                      aspectRatio="auto"
                      style={{ height: '100%', width: '100%' }}
                      maxHeight={800} // Allow taller images on desktop
                      onImagePress={(index) => {
                        setSelectedImageIndex(index);
                        setImageViewerVisible(true);
                      }}
                    />
                  </DoubleTapLike>
                ) : (
                  <View style={styles.noImagePlaceholder}>
                    <Ionicons name="image-outline" size={64} color="#e5e5e5" />
                  </View>
                )}
              </View>
            </View>

            {/* Right Column: Details & Comments */}
            <View style={[styles.rightColumn, { paddingBottom: insets.bottom }]}>
              <ScrollView style={styles.rightColumnScroll} contentContainerStyle={{ paddingBottom: 60 }}>
                <PostHeader />
                <PostContent />
                <ActionButtons />
                <View style={styles.desktopDivider} />
                <CommentsSection />
              </ScrollView>
              <View style={[styles.desktopInputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <CommentInput onSubmit={handleAddComment} />
              </View>
            </View>
          </View>
        ) : (
          // MOBILE: Single Column with Modal
          <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}>
            <PostHeader />
            {post.imageUrls && post.imageUrls.length > 0 && (
              <DoubleTapLike onDoubleTap={handleDoubleTap}>
                <ImageCarousel
                  images={post.imageUrls}
                  aspectRatio="square"
                  onImagePress={(index) => {
                    setSelectedImageIndex(index);
                    setImageViewerVisible(true);
                  }}
                />
              </DoubleTapLike>
            )}
            <ActionButtons />
            <PostContent />

            {/* Mobile: View Comments Button */}
            <Pressable
              style={styles.viewCommentsButton}
              onPress={() => setShowCommentsModal(true)}
            >
              <Text style={styles.viewCommentsText}>
                View all {post.commentCount} comments
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#737373" />
            </Pressable>
          </ScrollView>
        )}
      </View>

      {/* Mobile Comment Modal */}
      {!isDesktop && (
        <Modal
          visible={showCommentsModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCommentsModal(false)}
        >
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <Pressable onPress={() => setShowCommentsModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </Pressable>
            </View>
            <ScrollView style={styles.modalContent}>
              <CommentList
                comments={comments}
                isLoading={isLoadingComments}
                onDelete={handleDeleteComment}
              />
            </ScrollView>
            <View style={styles.modalInputContainer}>
              <CommentInput onSubmit={handleAddComment} />
            </View>
          </View>
        </Modal>
      )}

      {/* Image Viewer Modal */}
      {post && (
        <ImageViewerModal
          visible={imageViewerVisible}
          images={post.imageUrls || []}
          initialIndex={selectedImageIndex}
          onClose={() => setImageViewerVisible(false)}
        />
      )}

      {/* Action Menu */}
      {post && (
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
            {
              label: 'Share',
              icon: 'share-outline',
              onPress: () => {
                // TODO: Share post
              },
            },
          ]}
        />
      )}

      {/* Report Modal */}
      {post && (
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="POST"
          targetId={post.id}
        />
      )}

      {/* Edit Post Modal */}
      {post && (
        <EditPostModal
          visible={showEditModal}
          postId={post.id}
          onClose={() => setShowEditModal(false)}
          onUpdated={refreshPost}
        />
      )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mainWrapper: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#737373',
  },
  // --- Header ---
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  moreButton: {
    padding: 8,
  },
  // --- Actions ---
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  actionCount: {
    fontSize: 14,
    color: '#171717',
  },
  // --- Content ---
  postContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginRight: 8,
    marginBottom: 4,
  },
  contentText: {
    fontSize: 14,
    color: '#171717',
    lineHeight: 20,
  },
  // --- Comments ---
  commentsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 12,
    marginTop: 12,
  },
  // --- Mobile Specific ---
  scrollContent: {
    paddingBottom: 80,
  },
  viewCommentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    backgroundColor: '#fafafa',
  },
  viewCommentsText: {
    color: '#737373',
    fontSize: 14,
  },
  // --- Desktop 2-Column ---
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    marginVertical: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    // Shadow for depth
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  leftColumn: {
    flex: 1.5, // 60% width
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightColumn: {
    flex: 1, // 40% width
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e5e5',
    display: 'flex',
    flexDirection: 'column',
  },
  desktopImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  noImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  rightColumnScroll: {
    flex: 1,
    width: '100%',
  },
  desktopDivider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 8,
  },
  desktopInputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingBottom: 0, // CommentInput has its own padding
  },
  // --- Modal ---
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  modalInputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
});
