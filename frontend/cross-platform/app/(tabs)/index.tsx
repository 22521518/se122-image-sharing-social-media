import CreatePostModal from '@/components/social/CreatePostModal';
import { PostCard } from '@/components/social/PostCard';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/Colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, accessToken, user } = useAuth();

  // AC 3, 4, 5: Feed with infinite scroll and pull-to-refresh
  const { posts, refreshPosts, loadMorePosts, isLoading, isLoadingMore, hasMore } = useSocial();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      refreshPosts();
    }
  }, [isAuthenticated, refreshPosts]);

  // AC 5: Pull-to-refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    await refreshPosts();
    setIsRefreshing(false);
  };

  // AC 5: Infinite scroll - load more when reaching end
  const onEndReached = () => {
    if (!isLoadingMore && hasMore) {
      loadMorePosts();
    }
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  const handleCreatePostClose = () => {
    setShowCreatePost(false);
    // Refresh posts after creating
    refreshPosts();
  };

  // Footer component for loading indicator
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <ThemedText style={StyleSheet.flatten([styles.loadingMoreText, { color: colors.textSecondary }])}>
          Loading more...
        </ThemedText>
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={StyleSheet.flatten([styles.centered, { backgroundColor: colors.background }])}>
        <View style={StyleSheet.flatten([styles.iconContainer, { backgroundColor: colors.muted }])}>
          <Ionicons name="people-outline" size={48} color={colors.primary} />
        </View>
        <ThemedText style={StyleSheet.flatten([styles.title, { color: colors.text }])}>Welcome to LifeMapped</ThemedText>
        <ThemedText style={StyleSheet.flatten([styles.subtitle, { color: colors.textSecondary }])}>
          Sign in to discover and share memories
        </ThemedText>
        <TouchableOpacity 
          style={StyleSheet.flatten([styles.primaryButton, { backgroundColor: colors.primary }])} 
          onPress={handleLogin}
        >
          <ThemedText style={styles.primaryButtonText}>Sign In</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading && posts.length === 0) {
    return (
      <View style={StyleSheet.flatten([styles.centered, { backgroundColor: colors.background }])}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }])}>
      {/* Header */}
      <View style={StyleSheet.flatten([styles.header, { borderBottomColor: colors.border }])}>
        <ThemedText style={StyleSheet.flatten([styles.headerTitle, { color: colors.text }])}>Feed</ThemedText>
        <TouchableOpacity 
          style={StyleSheet.flatten([styles.headerButton, { backgroundColor: colors.muted }])}
          onPress={() => setShowCreatePost(true)}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* AC 4, 5: Chronologically sorted with cursor-based pagination & infinite scroll */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            accessToken={accessToken || undefined}
            isAuthenticated={isAuthenticated}
            currentUserId={user?.id}
            onLoginRequired={handleLogin}
            showDoubleTapLike
            style={styles.postCard}
          />
        )}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={StyleSheet.flatten([styles.emptyIconContainer, { backgroundColor: colors.muted }])}>
              <Ionicons name="create-outline" size={40} color={colors.primary} />
            </View>
            <ThemedText style={StyleSheet.flatten([styles.emptyText, { color: colors.text }])}>No posts yet</ThemedText>
            <ThemedText style={StyleSheet.flatten([styles.emptySubtext, { color: colors.textSecondary }])}>
              Follow friends or be the first to share!
            </ThemedText>
            <TouchableOpacity 
              style={StyleSheet.flatten([styles.primaryButton, { backgroundColor: colors.primary, marginTop: 20 }])} 
              onPress={() => setShowCreatePost(true)}
            >
              <ThemedText style={styles.primaryButtonText}>Create Post</ThemedText>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? styles.centerContent : styles.listContent}
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={StyleSheet.flatten([styles.fab, { backgroundColor: colors.primary }, Theme.shadows.lg])} 
        onPress={() => setShowCreatePost(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreatePost}
        onClose={handleCreatePostClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: Theme.typography.fontSizes.xxl,
    fontWeight: Theme.typography.fontWeights.bold,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCard: {
    marginBottom: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: Theme.typography.fontSizes.xxl,
    fontWeight: Theme.typography.fontWeights.bold,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Theme.typography.fontSizes.base,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  primaryButton: {
    paddingHorizontal: Theme.spacing.xxl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: Theme.typography.fontWeights.semibold,
    fontSize: Theme.typography.fontSizes.base,
  },
  emptyState: {
    alignItems: 'center',
    padding: Theme.spacing.xxl,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: Theme.borderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  emptyText: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.semibold,
  },
  emptySubtext: {
    fontSize: Theme.typography.fontSizes.sm,
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: Theme.sizes.fab.size,
    height: Theme.sizes.fab.size,
    borderRadius: Theme.sizes.fab.size / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerLoader: {
    paddingVertical: Theme.spacing.xl,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  loadingMoreText: {
    fontSize: Theme.typography.fontSizes.sm,
  },
});
