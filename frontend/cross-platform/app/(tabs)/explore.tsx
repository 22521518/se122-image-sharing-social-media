import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { socialService, PostDetail, UserSearchResult, HashtagResult, SearchResponse, TrendingResponse } from '@/services/social.service';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_COLUMNS = 3;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 4) / GRID_COLUMNS;

// AC 4: Debounced search (300ms delay)
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

type TabType = 'top' | 'accounts' | 'tags' | 'posts';

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('top');
  const [isLoading, setIsLoading] = useState(false);
  const [trending, setTrending] = useState<PostDetail[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);

  // AC 4: Min 2 chars for search
  const debouncedQuery = useDebounce(searchQuery, 300);
  const isSearchMode = debouncedQuery.length >= 2;

  // AC 2, 3: Load trending on mount
  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setIsLoading(true);
    try {
      const result: TrendingResponse = await socialService.getTrending();
      setTrending(result.posts);
    } catch (error) {
      console.error('Failed to load trending', error);
    } finally {
      setIsLoading(false);
    }
  };

  // AC 4, 5: Search when query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch();
    } else {
      setSearchResults(null);
    }
  }, [debouncedQuery]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const type = activeTab === 'top' ? 'all' : 
                   activeTab === 'accounts' ? 'users' :
                   activeTab === 'tags' ? 'hashtags' : 'posts';
      const result = await socialService.search(debouncedQuery, type);
      setSearchResults(result);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Re-search when tab changes
  useEffect(() => {
    if (isSearchMode) {
      performSearch();
    }
  }, [activeTab]);

  // AC 7: Navigate to results
  const handleUserPress = (userId: string) => {
    router.push({ pathname: '/profile/[id]', params: { id: userId } } as any);
  };

  const handlePostPress = (postId: string) => {
    router.push({ pathname: '/post/[id]', params: { id: postId } } as any);
  };

  const handleHashtagPress = (tag: string) => {
    setSearchQuery(`#${tag}`);
  };

  // Render trending grid (AC 3)
  const renderTrendingItem = ({ item }: { item: PostDetail }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => handlePostPress(item.id)}
      activeOpacity={0.8}
    >
      <View style={styles.gridPlaceholder}>
        <ThemedText style={styles.gridLikes}>
          ❤️ {item.likeCount}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  // Render user result
  const renderUserItem = ({ item }: { item: UserSearchResult }) => (
    <TouchableOpacity style={styles.userItem} onPress={() => handleUserPress(item.id)}>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <ThemedText style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </ThemedText>
        </View>
      )}
      <View style={styles.userInfo}>
        <ThemedText style={styles.userName}>{item.name || 'Anonymous'}</ThemedText>
        {item.bio && (
          <ThemedText style={styles.userBio} numberOfLines={1}>{item.bio}</ThemedText>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render hashtag result
  const renderHashtagItem = ({ item }: { item: HashtagResult }) => (
    <TouchableOpacity style={styles.hashtagItem} onPress={() => handleHashtagPress(item.tag)}>
      <View style={styles.hashtagIcon}>
        <ThemedText style={styles.hashIcon}>#</ThemedText>
      </View>
      <View style={styles.hashtagInfo}>
        <ThemedText style={styles.hashtagName}>#{item.tag}</ThemedText>
        <ThemedText style={styles.hashtagCount}>{item.postCount} posts</ThemedText>
      </View>
    </TouchableOpacity>
  );

  // Render post result
  const renderPostItem = ({ item }: { item: PostDetail }) => (
    <TouchableOpacity style={styles.postItem} onPress={() => handlePostPress(item.id)}>
      <ThemedText style={styles.postContent} numberOfLines={2}>
        {item.content}
      </ThemedText>
      <View style={styles.postMeta}>
        <ThemedText style={styles.postAuthor}>
          {item.author.name || 'Anonymous'}
        </ThemedText>
        <ThemedText style={styles.postLikes}>❤️ {item.likeCount}</ThemedText>
      </View>
    </TouchableOpacity>
  );

  // Render search results based on active tab
  const renderSearchContent = () => {
    if (!searchResults) return null;

    if (activeTab === 'top') {
      // Show mixed results
      return (
        <View>
          {searchResults.users.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Accounts</ThemedText>
              {searchResults.users.slice(0, 3).map(user => (
                <TouchableOpacity key={user.id} style={styles.userItem} onPress={() => handleUserPress(user.id)}>
                  <View style={styles.avatarPlaceholder}>
                    <ThemedText style={styles.avatarText}>
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.userName}>{user.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {searchResults.hashtags.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Tags</ThemedText>
              {searchResults.hashtags.slice(0, 3).map(tag => (
                <TouchableOpacity key={tag.id} style={styles.hashtagItem} onPress={() => handleHashtagPress(tag.tag)}>
                  <ThemedText style={styles.hashtagName}>#{tag.tag}</ThemedText>
                  <ThemedText style={styles.hashtagCount}>{tag.postCount} posts</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {searchResults.posts.length > 0 && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Posts</ThemedText>
              {searchResults.posts.slice(0, 5).map(post => (
                <TouchableOpacity key={post.id} style={styles.postItem} onPress={() => handlePostPress(post.id)}>
                  <ThemedText style={styles.postContent} numberOfLines={2}>{post.content}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );
    }

    if (activeTab === 'accounts') {
      return (
        <FlatList
          data={searchResults.users}
          renderItem={renderUserItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No accounts found</ThemedText>
            </View>
          }
        />
      );
    }

    if (activeTab === 'tags') {
      return (
        <FlatList
          data={searchResults.hashtags}
          renderItem={renderHashtagItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No tags found</ThemedText>
            </View>
          }
        />
      );
    }

    if (activeTab === 'posts') {
      return (
        <FlatList
          data={searchResults.posts}
          renderItem={renderPostItem}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No posts found</ThemedText>
            </View>
          }
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users, hashtags, posts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs (AC 1: Search bar and tabs) */}
      {isSearchMode && (
        <View style={styles.tabs}>
          {(['top', 'accounts', 'tags', 'posts'] as TabType[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <ThemedText style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}

      {/* Content */}
      {!isLoading && (
        isSearchMode ? (
          renderSearchContent()
        ) : (
          /* AC 3: Trending grid */
          <FlatList
            data={trending}
            renderItem={renderTrendingItem}
            keyExtractor={item => item.id}
            numColumns={GRID_COLUMNS}
            contentContainerStyle={styles.gridContainer}
            ListHeaderComponent={
              <ThemedText style={styles.trendingTitle}>Trending</ThemedText>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="flame-outline" size={48} color="#ccc" />
                <ThemedText style={styles.emptyText}>No trending posts yet</ThemedText>
              </View>
            }
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    paddingBottom: 20,
  },
  trendingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 16,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    padding: 1,
  },
  gridPlaceholder: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLikes: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  userBio: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  hashtagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  hashtagIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hashIcon: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  hashtagInfo: {
    marginLeft: 12,
  },
  hashtagName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  hashtagCount: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  postItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  postContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  postAuthor: {
    fontSize: 12,
    color: '#888',
  },
  postLikes: {
    fontSize: 12,
    color: '#888',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 12,
  },
});
