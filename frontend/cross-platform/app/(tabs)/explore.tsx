import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/Colors';
import { Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { HashtagResult, PostDetail, SearchResponse, socialService, TrendingResponse, UserSearchResult } from '@/services/social.service';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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
      Alert.alert('Error', 'Failed to load trending posts. Please try again.');
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
      Alert.alert('Search Error', 'Failed to search. Please try again.');
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
    setActiveTab('posts');
  };

  // Render trending grid (AC 3)
  const renderTrendingItem = ({ item }: { item: PostDetail }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => handlePostPress(item.id)}
      activeOpacity={0.8}
    >
      <View style={StyleSheet.flatten([styles.gridPlaceholder, { backgroundColor: colors.muted }])}>
        <ThemedText style={StyleSheet.flatten([styles.gridLikes, { color: colors.textSecondary }])}>
          ❤️ {item.likeCount}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  // Render user result
  const renderUserItem = ({ item }: { item: UserSearchResult }) => (
    <TouchableOpacity 
      style={StyleSheet.flatten([styles.userItem, { borderBottomColor: colors.border }])} 
      onPress={() => handleUserPress(item.id)}
    >
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={StyleSheet.flatten([styles.avatarPlaceholder, { backgroundColor: colors.primary }])}>
          <ThemedText style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || '?'}
          </ThemedText>
        </View>
      )}
      <View style={styles.userInfo}>
        <ThemedText style={StyleSheet.flatten([styles.userName, { color: colors.text }])}>{item.name || 'Anonymous'}</ThemedText>
        {item.bio && (
          <ThemedText style={StyleSheet.flatten([styles.userBio, { color: colors.textSecondary }])} numberOfLines={1}>
            {item.bio}
          </ThemedText>
        )}
      </View>
    </TouchableOpacity>
  );

  // Render hashtag result
  const renderHashtagItem = ({ item }: { item: HashtagResult }) => (
    <TouchableOpacity 
      style={StyleSheet.flatten([styles.hashtagItem, { borderBottomColor: colors.border }])} 
      onPress={() => handleHashtagPress(item.tag)}
    >
      <View style={StyleSheet.flatten([styles.hashtagIcon, { backgroundColor: colors.muted }])}>
        <ThemedText style={StyleSheet.flatten([styles.hashIcon, { color: colors.primary }])}>#</ThemedText>
      </View>
      <View style={styles.hashtagInfo}>
        <ThemedText style={StyleSheet.flatten([styles.hashtagName, { color: colors.text }])}>#{item.tag}</ThemedText>
        <ThemedText style={StyleSheet.flatten([styles.hashtagCount, { color: colors.textSecondary }])}>
          {item.postCount} posts
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  // Render post result
  const renderPostItem = ({ item }: { item: PostDetail }) => (
    <TouchableOpacity 
      style={StyleSheet.flatten([styles.postItem, { borderBottomColor: colors.border }])} 
      onPress={() => handlePostPress(item.id)}
    >
      <ThemedText style={StyleSheet.flatten([styles.postContent, { color: colors.text }])} numberOfLines={2}>
        {item.content}
      </ThemedText>
      <View style={styles.postMeta}>
        <ThemedText style={StyleSheet.flatten([styles.postAuthor, { color: colors.textSecondary }])}>
          {item.author.name || 'Anonymous'}
        </ThemedText>
        <ThemedText style={StyleSheet.flatten([styles.postLikes, { color: colors.textSecondary }])}>
          ❤️ {item.likeCount}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );

  // Render search results based on active tab
  const renderSearchContent = () => {
    if (!searchResults) return null;

    if (activeTab === 'top') {
      return (
        <View>
          {searchResults.users.length > 0 && (
            <View style={StyleSheet.flatten([styles.section, { borderBottomColor: colors.border }])}>
              <ThemedText style={StyleSheet.flatten([styles.sectionTitle, { color: colors.text }])}>Accounts</ThemedText>
              {searchResults.users.slice(0, 3).map(user => (
                <TouchableOpacity 
                  key={user.id} 
                  style={StyleSheet.flatten([styles.userItem, { borderBottomColor: colors.border }])} 
                  onPress={() => handleUserPress(user.id)}
                >
                  <View style={StyleSheet.flatten([styles.avatarPlaceholder, { backgroundColor: colors.primary }])}>
                    <ThemedText style={styles.avatarText}>
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </ThemedText>
                  </View>
                  <ThemedText style={StyleSheet.flatten([styles.userName, { color: colors.text, marginLeft: 12 }])}>
                    {user.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {searchResults.hashtags.length > 0 && (
            <View style={StyleSheet.flatten([styles.section, { borderBottomColor: colors.border }])}>
              <ThemedText style={StyleSheet.flatten([styles.sectionTitle, { color: colors.text }])}>Tags</ThemedText>
              {searchResults.hashtags.slice(0, 3).map(tag => (
                <TouchableOpacity 
                  key={tag.id} 
                  style={StyleSheet.flatten([styles.hashtagItem, { borderBottomColor: colors.border }])} 
                  onPress={() => handleHashtagPress(tag.tag)}
                >
                  <ThemedText style={StyleSheet.flatten([styles.hashtagName, { color: colors.text }])}>#{tag.tag}</ThemedText>
                  <ThemedText style={StyleSheet.flatten([styles.hashtagCount, { color: colors.textSecondary }])}>
                    {tag.postCount} posts
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {searchResults.posts.length > 0 && (
            <View style={StyleSheet.flatten([styles.section, { borderBottomColor: colors.border }])}>
              <ThemedText style={StyleSheet.flatten([styles.sectionTitle, { color: colors.text }])}>Posts</ThemedText>
              {searchResults.posts.slice(0, 5).map(post => (
                <TouchableOpacity 
                  key={post.id} 
                  style={StyleSheet.flatten([styles.postItem, { borderBottomColor: colors.border }])} 
                  onPress={() => handlePostPress(post.id)}
                >
                  <ThemedText style={StyleSheet.flatten([styles.postContent, { color: colors.text }])} numberOfLines={2}>
                    {post.content}
                  </ThemedText>
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
              <ThemedText style={StyleSheet.flatten([styles.emptyText, { color: colors.textSecondary }])}>No accounts found</ThemedText>
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
              <ThemedText style={StyleSheet.flatten([styles.emptyText, { color: colors.textSecondary }])}>No tags found</ThemedText>
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
              <ThemedText style={StyleSheet.flatten([styles.emptyText, { color: colors.textSecondary }])}>No posts found</ThemedText>
            </View>
          }
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }])}>
      {/* Header */}
      <View style={StyleSheet.flatten([styles.header, { borderBottomColor: colors.border }])}>
        <ThemedText style={StyleSheet.flatten([styles.headerTitle, { color: colors.text }])}>Explore</ThemedText>
      </View>

      {/* Search Bar */}
      <View style={StyleSheet.flatten([styles.searchContainer, { borderBottomColor: colors.border }])}>
        <View style={StyleSheet.flatten([styles.searchBar, { backgroundColor: colors.muted }])}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={StyleSheet.flatten([styles.searchInput, { color: colors.text }])}
            placeholder="Search users, hashtags, posts..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs (AC 1: Search bar and tabs) */}
      {isSearchMode && (
        <View style={StyleSheet.flatten([styles.tabs, { borderBottomColor: colors.border }])}>
          {(['top', 'accounts', 'tags', 'posts'] as TabType[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={StyleSheet.flatten([styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }])}
              onPress={() => setActiveTab(tab)}
            >
              <ThemedText style={StyleSheet.flatten([
                styles.tabText, 
                { color: activeTab === tab ? colors.primary : colors.textSecondary },
                activeTab === tab && { fontWeight: '600' }
              ])}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
              <ThemedText style={StyleSheet.flatten([styles.trendingTitle, { color: colors.text }])}>Trending</ThemedText>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={StyleSheet.flatten([styles.emptyIconContainer, { backgroundColor: colors.muted }])}>
                  <Ionicons name="flame-outline" size={40} color={colors.primary} />
                </View>
                <ThemedText style={StyleSheet.flatten([styles.emptyText, { color: colors.textSecondary }])}>
                  No trending posts yet
                </ThemedText>
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
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: Theme.typography.fontSizes.xxl,
    fontWeight: Theme.typography.fontWeights.bold,
  },
  searchContainer: {
    padding: Theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
    fontSize: Theme.typography.fontSizes.base,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
  },
  tabText: {
    fontSize: Theme.typography.fontSizes.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    paddingBottom: Theme.spacing.xl,
  },
  trendingTitle: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
    padding: Theme.spacing.lg,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    padding: 1,
  },
  gridPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.sm,
  },
  gridLikes: {
    fontSize: Theme.typography.fontSizes.xs,
  },
  section: {
    padding: Theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontSize: Theme.typography.fontSizes.base,
    fontWeight: Theme.typography.fontWeights.semibold,
    marginBottom: Theme.spacing.md,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  userInfo: {
    marginLeft: Theme.spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: Theme.typography.fontSizes.base,
    fontWeight: Theme.typography.fontWeights.semibold,
  },
  userBio: {
    fontSize: Theme.typography.fontSizes.sm,
    marginTop: 2,
  },
  hashtagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hashtagIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hashIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  hashtagInfo: {
    marginLeft: Theme.spacing.md,
  },
  hashtagName: {
    fontSize: Theme.typography.fontSizes.base,
    fontWeight: Theme.typography.fontWeights.semibold,
  },
  hashtagCount: {
    fontSize: Theme.typography.fontSizes.sm,
    marginTop: 2,
  },
  postItem: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  postContent: {
    fontSize: Theme.typography.fontSizes.sm,
    lineHeight: 20,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.sm,
  },
  postAuthor: {
    fontSize: Theme.typography.fontSizes.xs,
  },
  postLikes: {
    fontSize: Theme.typography.fontSizes.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xxxl,
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
    fontSize: Theme.typography.fontSizes.base,
    marginTop: Theme.spacing.md,
  },
});
