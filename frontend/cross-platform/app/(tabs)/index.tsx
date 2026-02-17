import { PageHeader } from '@/components/layout';
import { EmptyState, FloatingActionButton } from '@/components/shared';
import { CreatePostModal, PostCard, PostCardSkeleton } from '@/components/social';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useIsMobileView } from '@/hooks/usePlatform';
import { mediaService } from '@/services/media.service';
import { socialService } from '@/services/social.service';
import type { PostDetail, PrivacyLevel } from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';

const POST_MAX_WIDTH = 680;
const HORIZONTAL_PADDING = 16;

const Index = () => {
  const isMobile = useIsMobileView();
  const { accessToken } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();

  // Calculate post width - max 600px, with padding on sides
  const contentPadding =
    screenWidth > POST_MAX_WIDTH + HORIZONTAL_PADDING * 2
      ? (screenWidth - POST_MAX_WIDTH) / 3
      : HORIZONTAL_PADDING;

  const [posts, setPosts] = useState<PostDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const cursorRef = React.useRef<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Sync cursor state with ref
  const updateCursor = useCallback((newCursor: string | null) => {
    setCursor(newCursor);
    cursorRef.current = newCursor;
  }, []);

  // Initial fetch
  const fetchFeed = useCallback(
    async (reset = false) => {
      if (!accessToken) return;

      if (reset) {
        setIsLoading(true);
        updateCursor(null);
      }

      try {
        const currentCursor = reset ? undefined : (cursorRef.current || undefined);
        const response = await socialService.getFeed(
          accessToken,
          currentCursor,
        );
        setPosts((prev) => (reset ? response.posts : [...prev, ...response.posts]));
        updateCursor(response.nextCursor);
        setHasMore(response.hasMore);
      } catch (error) {
        console.error('Failed to load feed:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [accessToken, updateCursor],
  );

  // Load more posts
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursor) return;
    setIsLoadingMore(true);
    await fetchFeed();
  }, [isLoadingMore, hasMore, cursor, fetchFeed]);

  // Use isFocused as a more reliable trigger for refetching data
  const isFocused = useIsFocused();
  const hasFetchedInitially = useRef(false);

  // Initial load and refetch on focus
  useEffect(() => {
    if (isFocused) {
      // Skip the first mount (handled by initial render) or always refetch
      fetchFeed(true);
      hasFetchedInitially.current = true;
    }
  }, [isFocused, fetchFeed]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFeed(true);
  };

  const handleLike = async (postId: string) => {
    if (!accessToken) return;
    await socialService.likePost(postId, accessToken);
  };

  const handleCreatePost = async (data: {
    content: string;
    imageUrls?: string[];
    privacy: PrivacyLevel;
  }) => {
    if (!accessToken) return;

    // Upload images first and collect mediaIds
    const mediaIds: string[] = [];
    if (data.imageUrls && data.imageUrls.length > 0) {
      for (const imageUri of data.imageUrls) {
        try {
          // Determine mime type from URI
          const extension = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
          const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

          const media = await mediaService.uploadMedia(imageUri, mimeType, accessToken);
          mediaIds.push(media.id);
        } catch (error) {
          console.error('Failed to upload image:', error);
        }
      }
    }

    const newPost = await socialService.createPost(
      {
        content: data.content,
        privacy: data.privacy,
        mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
        mediaMetadata:
          mediaIds.length > 0
            ? mediaIds.map((id, index) => ({ mediaId: id, sortOrder: index }))
            : undefined,
      },
      accessToken,
    );
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostPress = (postId: string) => {
    router.push({ pathname: '/post/[id]', params: { id: postId } });
  };

  // Refresh a single post after edit
  const handlePostUpdated = useCallback(async (postId: string) => {
    if (!accessToken) return;
    try {
      const updatedPost = await socialService.getPost(postId, accessToken);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
    } catch (error) {
      console.error('Failed to refresh post:', error);
    }
  }, [accessToken]);

  const renderPost = ({ item }: { item: PostDetail }) => (
    <Pressable style={styles.postWrapper} onPress={() => handlePostPress(item.id)}>
      <PostCard 
        post={item} 
        onLike={handleLike} 
        onUpdated={() => handlePostUpdated(item.id)} 
      />
    </Pressable>
  );

  const renderSkeletons = () => (
    <View style={styles.skeletonContainer}>
      {[...Array(3)].map((_, i) => (
        <View key={i} style={styles.postWrapper}>
          <PostCardSkeleton />
        </View>
      ))}
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={Colors.light.primary} />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      title="No posts yet"
      description="Follow some friends or create your first post to get started!"
      action={{
        label: 'Create Post',
        onPress: () => setCreateModalOpen(true),
      }}
    />
  );

  return (
    <View style={styles.container}>
      <PageHeader
        title="Feed"
        rightAction={
          <View style={styles.headerRightActions}>
            {/* Search - Desktop: Search bar, Mobile: Search icon */}
            {!isMobile ? (
              <Pressable
                style={styles.searchBar}
                onPress={() => router.push('/(tabs)/explore')}
              >
                <Ionicons name="search" size={16} color="#737373" />
                <Text style={styles.searchBarPlaceholder}>Search...</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.headerIconButton}
                onPress={() => router.push('/(tabs)/explore')}
              >
                <Ionicons name="search" size={22} color="#171717" />
              </Pressable>
            )}

            {/* New Post Button - Desktop only */}
            {!isMobile && (
              <Pressable style={styles.newPostButton} onPress={() => setCreateModalOpen(true)}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.newPostButtonText}>New Post</Text>
              </Pressable>
            )}
          </View>
        }
      />

      <View style={styles.content}>
        {isLoading && posts.length === 0 ? (
          renderSkeletons()
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[Colors.light.primary]}
                tintColor={Colors.light.primary}
              />
            }
            contentContainerStyle={[
              posts.length === 0 ? styles.emptyContainer : styles.listContent,
              { paddingHorizontal: contentPadding },
            ]}
          />
        )}
      </View>

      {/* FAB for creating new memory */}
      {isMobile && (
        <FloatingActionButton
          onPress={() => setCreateModalOpen(true)}
          icon={<Ionicons name="add" size={24} color="#fff" />}
        />
      )}

      <CreatePostModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreatePost}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  postWrapper: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  skeletonContainer: {
    padding: 16,
  },
  newPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  newPostButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#737373',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderColor: '#e5e5e5',
    borderWidth: 1, 
    gap: 8,
    minWidth: 360,
  },
  searchBarPlaceholder: {
    fontSize: 14,
    color: '#737373',
  },
  headerIconButton: {
    padding: 8,
    borderRadius: 8,
  },
});

export default Index;
