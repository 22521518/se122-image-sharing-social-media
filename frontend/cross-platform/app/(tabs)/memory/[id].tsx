/**
 * Memory Detail Route within Tabs Layout
 *
 * Route: /(tabs)/memory/[id]
 * Displays a full-screen memory detail view with interactions while keeping sidebar.
 */
import { PageHeader } from '@/components/layout';
import { EditMemoryModal } from '@/components/memories/EditMemoryModal';
import { MemoryAudioPlayer } from '@/components/memories/MemoryAudioPlayer';
import { ActionMenu, DoubleTapLike, ImageCarousel, LikeButton, ReportModal, UserAvatar } from '@/components/shared';
import { ImageViewerModal } from '@/components/shared/ImageViewerModal';
import { CommentInput, CommentList } from '@/components/social';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Memory, useMemories } from '@/context/MemoriesContext';
import { ApiService } from '@/services/api.service';
import { socialService } from '@/services/social.service';
import { Comment } from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const POST_MAX_WIDTH = 1000;
const HORIZONTAL_PADDING = 16;
const TABLET_BREAKPOINT = 768;

const FEELING_EMOJIS: Record<string, string> = {
  JOY: '😊',
  CALM: '😌',
  ENERGETIC: '⚡',
  INSPIRED: '✨',
  MELANCHOLY: '😢',
};

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user: currentUser } = useAuth();
  const { deleteMemory } = useMemories();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isDesktop = screenWidth >= TABLET_BREAKPOINT;
  const contentPadding =
    isDesktop && screenWidth > POST_MAX_WIDTH + HORIZONTAL_PADDING * 2
      ? (screenWidth - POST_MAX_WIDTH) / 8
      : 0;

  const [memory, setMemory] = useState<Memory | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isOwnMemory = currentUser?.id === memory?.userId;

  // Fetch memory data - extracted for reuse
  const fetchMemoryData = useCallback(async () => {
    if (!id || !accessToken) return;
    
    setIsLoading(true);
    setIsLoadingComments(true);
    try {
      // Fetch Memory Details
      const memoryData = await ApiService.get<Memory>(`/api/memories/${id}`, accessToken);
      setMemory(memoryData);
      setLikeCount(memoryData.likeCount || 0);
      // Check like status
      try {
        const likeStatus = await socialService.getLikeStatusMemory(id, accessToken);
        setIsLiked(likeStatus.liked);
      } catch (e) {
        // If 404/error, assume false
        setIsLiked(false);
      }

      // Fetch Comments
      const commentsData = await socialService.getMemoryComments(id, accessToken);
      setComments(commentsData.comments);
    } catch (err: any) {
      console.error('Failed to fetch memory:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingComments(false);
    }
  }, [id, accessToken]);

  // Light refresh - only memory data without loading state
  const refreshMemory = useCallback(async () => {
    if (!id || !accessToken) return;
    try {
      const memoryData = await ApiService.get<Memory>(`/api/memories/${id}`, accessToken);
      setMemory(memoryData);
      setLikeCount(memoryData.likeCount || 0);
    } catch (err: any) {
      console.error('Failed to refresh memory:', err);
    }
  }, [id, accessToken]);

  // Use isFocused as a more reliable trigger for refetching data
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchMemoryData();
    }
  }, [isFocused, fetchMemoryData]);

  const handleLike = async () => {
    if (!memory || !accessToken) return;
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1));
    await socialService.toggleLikeMemory(memory.id, accessToken);
  };

  const handleDoubleTap = () => {
    if (!isLiked) handleLike();
  };

  const handleAddComment = async (content: string) => {
    if (!id || !accessToken) return;
    try {
      const response = await socialService.createCommentOnMemory(id, content, accessToken);
      setComments((prev) => [response.comment, ...prev]);
      setMemory((prev) => (prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : null));
    } catch (e) {
      console.error('Failed to add comment', e);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!accessToken) return;
    try {
      await socialService.deleteComment(commentId, accessToken);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setMemory((prev) =>
        prev ? { ...prev, commentCount: Math.max(0, (prev.commentCount || 0) - 1) } : null,
      );
    } catch (e) {
      console.error('Failed to delete comment', e);
    }
  };

  const goToProfile = () => {
    if (memory?.user) {
      router.push({ pathname: '/(tabs)/user/[id]', params: { id: memory.user.id } });
    }
  };

  const handleDeleteMemory = () => {
    if (!memory) return;
    Alert.alert('Delete Memory', 'Are you sure you want to delete this memory?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const success = await deleteMemory(memory.id);
          if (success) {
            router.back();
          }
        },
      },
    ]);
  };

  // Only allow swipe to go back
  const swipeGesture = Gesture.Fling()
    .direction(1) // Right
    .onEnd(() => {
      if (!isDesktop) router.back();
    })
    .runOnJS(true);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <PageHeader showBack title="Memory" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </View>
    );
  }

  if (!memory) {
    return (
      <View style={styles.container}>
        <PageHeader showBack title="Memory" />
        <View style={styles.loadingContainer}>
          <Text style={styles.notFoundText}>Memory not found</Text>
        </View>
      </View>
    );
  }

  // --- Component Parts ---

  const MemoryHeader = () => (
    <View style={styles.postHeader}>
      <Pressable style={styles.authorInfo} onPress={goToProfile}>
        <UserAvatar
          src={memory?.user?.avatarUrl} // Assuming backend returns user relation now
          name={memory?.user?.name || 'User'}
          size="md"
        />
        <View>
          <Text style={styles.authorName}>{memory?.user?.name || 'Unknown User'}</Text>
          <Text style={styles.timestamp}>
            {memory.createdAt
              ? formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })
              : ''}
          </Text>
        </View>
      </Pressable>
      <Pressable style={styles.moreButton} onPress={() => setShowMenu(true)}>
        <Ionicons name="ellipsis-horizontal" size={20} color="#737373" />
      </Pressable>
    </View>
  );

  const MemoryContent = () => (
    <View style={styles.postContent}>
      <View style={styles.metadataBadgeRow}>
        {memory.feeling && (
          <View style={styles.metadataBadge}>
            <Text style={styles.metadataText}>
              {FEELING_EMOJIS[memory.feeling] || '✨'} {memory.feeling}
            </Text>
          </View>
        )}
        <View style={styles.metadataBadge}>
          <Text style={styles.metadataText}>
            📍 {memory.latitude.toFixed(4)}, {memory.longitude.toFixed(4)}
          </Text>
        </View>
      </View>

      {memory.title && <Text style={styles.title}>{memory.title}</Text>}

      {/* Voice Player Placeholder if needed */}
      {(memory.type?.toLowerCase() === 'voice' || memory.type?.toLowerCase() === 'mixed') && (
        <View style={styles.voicePlayer}>
          {/* Add proper player here later */}
          <MemoryAudioPlayer
            audioUrl={memory.mediaUrl!}
            duration={memory.duration}
            autoPlay={false}
            style={{
              width: '100%',
            }}
          />
        </View>
      )}
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
          <Text style={styles.actionCount}>{memory.commentCount || 0}</Text>
        </Pressable>
      </View>
    </View>
  );

  const CommentsSection = () => (
    <View style={styles.commentsSection}>
      <Text style={styles.commentsTitle}>Comments ({memory.commentCount || 0})</Text>
      <CommentList
        comments={comments}
        isLoading={isLoadingComments}
        onDelete={handleDeleteComment}
      />
    </View>
  );

  // Determine media for display
  // Handle case-sensitivity for type (backend might send uppercase)
  const memoryType = memory.type?.toLowerCase();
  const hasVisualMedia = (memoryType === 'photo' || memoryType === 'mixed') && !!memory.mediaUrl;
  const imageUrls = hasVisualMedia ? [memory.mediaUrl!] : [];

  const MediaView = ({ square = false }) => {
    if (hasVisualMedia) {
      return (
        <DoubleTapLike onDoubleTap={handleDoubleTap}>
          <ImageCarousel
            images={imageUrls}
            aspectRatio={square ? 'square' : 'auto'}
            style={isDesktop ? { height: '100%', width: '100%' } : undefined}
            maxHeight={isDesktop ? 800 : undefined}
            onImagePress={() => setImageViewerVisible(true)}
          />
        </DoubleTapLike>
      );
    }

    // Placeholder for text/voice only
    return (
      <View style={[styles.noImagePlaceholder, styles.placeholderGradient]}>
        <Text style={styles.placeholderEmoji}>{FEELING_EMOJIS[memory.feeling || 'JOY']}</Text>
      </View>
    );
  };

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
        <PageHeader showBack title="Memory" />

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
              {/* Left Column: Image/Media */}
              <View style={styles.leftColumn}>
                <View style={styles.desktopImageContainer}>
                  <MediaView />
                </View>
              </View>

              {/* Right Column: Details & Comments */}
              <View style={[styles.rightColumn, { paddingBottom: insets.bottom }]}>
                <ScrollView
                  style={styles.rightColumnScroll}
                  contentContainerStyle={{ paddingBottom: 60 }}
                >
                  <MemoryHeader />
                  <MemoryContent />
                  <ActionButtons />
                  <View style={styles.desktopDivider} />
                  <CommentsSection />
                </ScrollView>
                <View
                  style={[
                    styles.desktopInputContainer,
                    { paddingBottom: Math.max(insets.bottom, 16) },
                  ]}
                >
                  <CommentInput onSubmit={handleAddComment} />
                </View>
              </View>
            </View>
          ) : (
            // MOBILE: Single Column
            <ScrollView
              contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
            >
              <MemoryHeader />
              <MediaView square />
              <ActionButtons />
              <MemoryContent />

              <Pressable
                style={styles.viewCommentsButton}
                onPress={() => setShowCommentsModal(true)}
              >
                <Text style={styles.viewCommentsText}>
                  View all {memory.commentCount || 0} comments
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

        {/* Image Viewer */}
        {hasVisualMedia && (
          <ImageViewerModal
            visible={imageViewerVisible}
            images={imageUrls}
            initialIndex={0}
            onClose={() => setImageViewerVisible(false)}
          />
        )}

        {/* Action Menu */}
        {memory && (
          <ActionMenu
            visible={showMenu}
            onClose={() => setShowMenu(false)}
            items={[
              ...(isOwnMemory
                ? [
                    {
                      label: 'Edit Memory',
                      icon: 'create-outline',
                      onPress: () => setShowEditModal(true),
                    },
                    {
                      label: 'Delete Memory',
                      icon: 'trash-outline',
                      onPress: handleDeleteMemory,
                      destructive: true,
                    },
                  ]
                : [
                    {
                      label: 'Report Memory',
                      icon: 'flag-outline',
                      onPress: () => setShowReportModal(true),
                      destructive: true,
                    },
                  ]),
              {
                label: 'Copy Link',
                icon: 'link-outline',
                onPress: () => {
                  // TODO: Copy memory link
                },
              },
            ]}
          />
        )}

        {/* Report Modal */}
        {memory && (
          <ReportModal
            visible={showReportModal}
            onClose={() => setShowReportModal(false)}
            targetType="MEMORY"
            targetId={memory.id}
          />
        )}

        {/* Edit Memory Modal */}
        {memory && (
          <EditMemoryModal
            visible={showEditModal}
            memoryId={memory.id}
            onClose={() => setShowEditModal(false)}
            onUpdated={refreshMemory}
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
  postContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 8,
    marginTop: 8,
  },
  metadataBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metadataBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  metadataText: {
    fontSize: 12,
    color: '#737373',
  },
  voicePlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
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
    flex: 1.5,
    backgroundColor: '#262626', // Darker background for media
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightColumn: {
    flex: 1,
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
    width: '100%',
    aspectRatio: 1, // Square placeholder
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderGradient: {
    backgroundColor: '#f0e6e6',
  },
  placeholderEmoji: {
    fontSize: 64,
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
    paddingBottom: 0,
  },
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
