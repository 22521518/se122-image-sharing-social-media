import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { PostCard } from '@/components/social/PostCard';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';
import { Ionicons } from '@expo/vector-icons';
import CreatePostModal from '@/components/social/CreatePostModal';

export default function HomeScreen() {
  const router = useRouter();
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
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Ionicons name="people-outline" size={64} color="#ccc" />
        <ThemedText style={styles.title}>Welcome to Social Feed</ThemedText>
        <ThemedText style={styles.subtitle}>Please sign in to view posts</ThemedText>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <ThemedText style={styles.buttonText}>Sign In</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Feed</ThemedText>
        <TouchableOpacity onPress={() => setShowCreatePost(true)}>
          <Ionicons name="add-circle-outline" size={28} color="#007AFF" />
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
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="create-outline" size={48} color="#ccc" style={{ marginBottom: 16 }} />
            <ThemedText style={styles.emptyText}>No posts yet.</ThemedText>
            <ThemedText style={styles.emptySubtext}>Follow friends or be the first to share!</ThemedText>
            <TouchableOpacity 
              style={[styles.button, { marginTop: 16 }]} 
              onPress={() => setShowCreatePost(true)}
            >
              <ThemedText style={styles.buttonText}>Create Post</ThemedText>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? styles.centerContent : styles.listContent}
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCard: {
    marginBottom: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
