import { PageHeader } from '@/components/layout';
import { EmptyState, UserAvatar } from '@/components/shared';
import { Colors } from '@/constants/Colors';
import { socialService, TrendingResponse } from '@/services/social.service';
import type {
  HashtagResult,
  PostDetail,
  SearchResponse,
  UserSearchResult,
} from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const GRID_COLUMNS = 5;
const GRID_ITEM_SIZE = (width - 16 - (GRID_COLUMNS - 1) * 2) / GRID_COLUMNS; // 16 = horizontal padding, 2 = gap between items

export default function ExplorePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [trending, setTrending] = useState<TrendingResponse | null>(null);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts' | 'hashtags'>('all');

  // Load trending content on focus
  const loadTrending = useCallback(async () => {
    setIsLoadingTrending(true);
    try {
      const data = await socialService.getTrending();
      setTrending(data);
    } finally {
      setIsLoadingTrending(false);
    }
  }, []);

  // Use isFocused as a more reliable trigger for refetching data
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadTrending();
    }
  }, [isFocused, loadTrending]);

  // Debounced search
  useEffect(() => {
    const formattedQuery = query.trim();
    if (!formattedQuery || formattedQuery.length < 2) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await socialService.search(formattedQuery);
        setSearchResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const clearSearch = () => {
    setQuery('');
    setSearchResults(null);
  };

  const goToPost = (postId: string) =>
    router.push({ pathname: '/(tabs)/post/[id]', params: { id: postId } });
  const goToUser = (userId: string) =>
    router.push({ pathname: '/(tabs)/user/[id]', params: { id: userId } });
  const goToHashtag = (tag: string) => setQuery(`#${tag}`);

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const renderPostItem = ({ item }: { item: PostDetail }) => (
    <Pressable style={styles.gridItem} onPress={() => goToPost(item.id)}>
      {item.imageUrls && item.imageUrls.length > 0 ? (
        <Image source={{ uri: item.imageUrls[0] }} style={styles.gridImage} />
      ) : (
        <View style={styles.gridTextContainer}>
          <Text style={styles.gridText} numberOfLines={3}>
            {item.content}
          </Text>
        </View>
      )}
      {item.imageUrls && item.imageUrls.length > 1 && (
        <View style={styles.multipleIndicator}>
          <Text style={styles.multipleText}>+{item.imageUrls.length - 1}</Text>
        </View>
      )}
    </Pressable>
  );

  const renderUserItem = (user: UserSearchResult) => (
    <Pressable key={user.id} style={styles.userItem} onPress={() => goToUser(user.id)}>
      <UserAvatar src={user.avatarUrl} name={user.name || 'User'} size="md" />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userUsername}>{user.bio || ''}</Text>
      </View>
      <Pressable style={styles.followSmallButton}>
        <Text style={styles.followSmallText}>Follow</Text>
      </Pressable>
    </Pressable>
  );

  const renderHashtagItem = (hashtag: HashtagResult) => (
    <Pressable
      key={hashtag.tag}
      style={styles.hashtagItem}
      onPress={() => goToHashtag(hashtag.tag)}
    >
      <View style={styles.hashtagIcon}>
        <Ionicons name="pricetag" size={20} color="#737373" />
      </View>
      <View style={styles.hashtagInfo}>
        <Text style={styles.hashtagName}>#{hashtag.tag}</Text>
        <Text style={styles.hashtagCount}>{formatCount(hashtag.postCount)} posts</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <PageHeader title="Explore" />

      <View style={styles.content}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color="#737373" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search users, posts, or hashtags..."
            placeholderTextColor="#a3a3a3"
          />
          {query.length > 0 && (
            <Pressable onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#737373" />
            </Pressable>
          )}
        </View>

        {/* Content */}
        <ScrollView showsVerticalScrollIndicator={false}>
          {query.trim().length >= 2 ? (
            isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
              </View>
            ) : searchResults ? (
              <View style={styles.resultsContainer}>
                {/* Tabs */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.tabsScroll}
                >
                  {(['all', 'users', 'posts', 'hashtags'] as const).map((tab) => (
                    <Pressable
                      key={tab}
                      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                      onPress={() => setActiveTab(tab)}
                    >
                      <Text
                        style={[styles.tabButtonText, activeTab === tab && styles.activeTabText]}
                      >
                        {tab === 'all'
                          ? 'All'
                          : tab === 'users'
                            ? `Users (${searchResults.users.length})`
                            : tab === 'posts'
                              ? `Posts (${searchResults.posts.length})`
                              : `Tags (${searchResults.hashtags.length})`}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Results */}
                {(activeTab === 'all' || activeTab === 'users') &&
                  searchResults.users.length > 0 && (
                    <View style={styles.section}>
                      {activeTab === 'all' && <Text style={styles.sectionTitle}>Users</Text>}
                      {(activeTab === 'all'
                        ? searchResults.users.slice(0, 3)
                        : searchResults.users
                      ).map(renderUserItem)}
                    </View>
                  )}

                {(activeTab === 'all' || activeTab === 'posts') &&
                  searchResults.posts.length > 0 && (
                    <View style={styles.section}>
                      {activeTab === 'all' && <Text style={styles.sectionTitle}>Posts</Text>}
                      <View style={styles.postsGrid}>
                        {(activeTab === 'all'
                          ? searchResults.posts.slice(0, 6)
                          : searchResults.posts
                        ).map((post) => renderPostItem({ item: post }))}
                      </View>
                    </View>
                  )}

                {(activeTab === 'all' || activeTab === 'hashtags') &&
                  searchResults.hashtags.length > 0 && (
                    <View style={styles.section}>
                      {activeTab === 'all' && <Text style={styles.sectionTitle}>Hashtags</Text>}
                      {(activeTab === 'all'
                        ? searchResults.hashtags.slice(0, 5)
                        : searchResults.hashtags
                      ).map(renderHashtagItem)}
                    </View>
                  )}

                {searchResults.users.length === 0 &&
                  searchResults.posts.length === 0 &&
                  searchResults.hashtags.length === 0 && (
                    <EmptyState
                      icon="search"
                      title="No results found"
                      description={`We couldn't find anything for "${query}"`}
                    />
                  )}
              </View>
            ) : null
          ) : /* Trending Content */
          isLoadingTrending ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
          ) : trending ? (
            <View style={styles.trendingContainer}>
              {/* Discover Posts */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="trending-up" size={20} color={Colors.light.primary} />
                  <Text style={styles.sectionTitle}>Trending</Text>
                </View>
                <View style={styles.postsGrid}>
                  {trending.posts.map((post) => renderPostItem({ item: post }))}
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    marginVertical: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#171717',
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  resultsContainer: {
    flex: 1,
  },
  tabsScroll: {
    marginBottom: 16,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  activeTabButton: {
    backgroundColor: Colors.light.primary,
  },
  tabButtonText: {
    fontSize: 14,
    color: '#737373',
  },
  activeTabText: {
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  userUsername: {
    fontSize: 12,
    color: '#737373',
  },
  followSmallButton: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  followSmallText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#171717',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    margin: 1,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridTextContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  gridText: {
    fontSize: 10,
    color: '#737373',
    textAlign: 'center',
  },
  multipleIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  multipleText: {
    color: '#fff',
    fontSize: 10,
  },
  hashtagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  hashtagIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hashtagInfo: {
    marginLeft: 12,
  },
  hashtagName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  hashtagCount: {
    fontSize: 12,
    color: '#737373',
  },
  trendingContainer: {
    flex: 1,
  },
  hashtagsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  trendingTag: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendingTagText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  trendingTagCount: {
    fontSize: 12,
    color: '#737373',
  },
});
