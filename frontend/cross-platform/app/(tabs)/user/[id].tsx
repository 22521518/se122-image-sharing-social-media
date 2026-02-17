import { PageHeader } from '@/components/layout'; // Force refresh
import { EmptyState, UserAvatar } from '@/components/shared';
import { UserListModal } from '@/components/social/UserListModal';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { friendshipService, FriendshipStatusType } from '@/services/friendship.service';
import { socialService } from '@/services/social.service';
import { usersService } from '@/services/users.service';
import type { PostDetail, Profile } from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function UserProfilePage() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accessToken, user: currentUser } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostDetail[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'memories'>('posts');

  // Friendship state
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatusType>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [isFriendLoading, setIsFriendLoading] = useState(false);

  // User List Modal state
  const [showUserList, setShowUserList] = useState(false);
  const [listType, setListType] = useState<'followers' | 'following' | 'friends'>('followers');
  const [listTitle, setListTitle] = useState('');

  const openList = (type: 'followers' | 'following' | 'friends', title: string) => {
    if (!profile) return;
    setListType(type);
    setListTitle(title);
    setShowUserList(true);
  };

  const loadProfile = useCallback(async () => {
    if (!userId || !accessToken) {
      setIsLoading(false);
      return;
    }

    // If viewing own profile, redirect to tabs/profile
    if (currentUser && userId === currentUser.id) {
      router.replace('/(tabs)/profile');
      return;
    }

    setIsLoading(true);
    try {
      const [profileData, postsData, memoriesData] = await Promise.all([
        usersService.getUserProfile(userId, accessToken),
        usersService.getUserPosts(userId, accessToken),
        usersService.getUserMemories(userId, accessToken),
      ]);

      if (profileData) {
        setProfile(profileData);
        // isFollowing comes from the public-profile endpoint
        setIsFollowing(profileData.isFollowing || false);
      }
      setPosts(postsData);
      setMemories(memoriesData || []);

      // Load friendship status
      try {
        const friendStatus = await friendshipService.getFriendshipStatus(userId, accessToken);
        setFriendshipStatus(friendStatus.status);
        setFriendshipId(friendStatus.friendshipId || null);
      } catch (err) {
        console.error('Failed to load friendship status:', err);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, router, accessToken, currentUser]);

  // Use isFocused as a more reliable trigger for refetching data
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadProfile();
    }
  }, [isFocused, loadProfile]);

  const handleFollow = async () => {
    if (!profile || !accessToken) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await socialService.unfollowUser(profile.id, accessToken);
        setIsFollowing(false);
        setProfile((prev) =>
          prev ? { ...prev, followerCount: (prev.followerCount || 0) - 1 } : null,
        );
      } else {
        await socialService.followUser(profile.id, accessToken);
        setIsFollowing(true);
        setProfile((prev) =>
          prev ? { ...prev, followerCount: (prev.followerCount || 0) + 1 } : null,
        );
      }
    } catch (error) {
      console.error('Failed to follow/unfollow:', error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleFriendAction = useCallback(async () => {
    if (!profile || !accessToken) return;

    setIsFriendLoading(true);
    try {
      switch (friendshipStatus) {
        case 'none':
          // Send friend request
          const result = await friendshipService.sendFriendRequest(profile.id, accessToken);
          setFriendshipStatus('pending_sent');
          setFriendshipId(result.id);
          break;

        case 'pending_sent':
          // Cancel friend request
          if (friendshipId) {
            await friendshipService.cancelFriendRequest(friendshipId, accessToken);
            setFriendshipStatus('none');
            setFriendshipId(null);
          }
          break;

        case 'pending_received':
          // Accept friend request
          if (friendshipId) {
            await friendshipService.acceptFriendRequest(friendshipId, accessToken);
            setFriendshipStatus('friends');
            // Auto-follow: Update UI state
            setIsFollowing(true);
            setProfile((prev) =>
              prev
                ? {
                    ...prev,
                    friendCount: ((prev as any).friendCount || 0) + 1,
                    followerCount: (prev.followerCount || 0) + 1, // Me following them
                    followingCount: (prev.followingCount || 0) + 1, // They following me
                  }
                : null,
            );
          }
          break;

        case 'friends':
          // Remove friend
          await friendshipService.removeFriend(profile.id, accessToken);
          setFriendshipStatus('none');
          setFriendshipId(null);
          // Auto-unfollow: Update UI state
          setIsFollowing(false);
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  friendCount: Math.max(0, ((prev as any).friendCount || 0) - 1),
                  followerCount: Math.max(0, (prev.followerCount || 0) - 1),
                  followingCount: Math.max(0, (prev.followingCount || 0) - 1),
                }
              : null,
          );
          break;
      }
    } catch (error) {
      console.error('Failed to update friendship:', error);
    } finally {
      setIsFriendLoading(false);
    }
  }, [profile, accessToken, friendshipStatus, friendshipId]);

  const getFriendButtonText = () => {
    switch (friendshipStatus) {
      case 'pending_sent':
        return 'Pending';
      case 'pending_received':
        return 'Accept';
      case 'friends':
        return 'Friends';
      default:
        return 'Add Friend';
    }
  };

  const getFriendButtonIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (friendshipStatus) {
      case 'pending_sent':
        return 'time-outline';
      case 'pending_received':
        return 'checkmark';
      case 'friends':
        return 'people';
      default:
        return 'person-add';
    }
  };

  const formatCount = (count: number | undefined) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <PageHeader showBack title="Profile" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <PageHeader showBack title="Profile" />
        <EmptyState
          title="User not found"
          description="This user doesn't exist or has been removed"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        showBack
        title={profile.username || profile.name || 'Profile'}
        rightAction={
          <Pressable style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#171717" />
          </Pressable>
        }
      />

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <UserAvatar src={profile.avatarUrl} name={profile.name || 'User'} size="xl" />

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profile.name}</Text>
                <View style={styles.actionButtons}>
                  {/* Add Friend Button */}
                  <Pressable
                    style={[
                      styles.friendButton,
                      friendshipStatus === 'friends' && styles.friendsButton,
                      friendshipStatus === 'pending_sent' && styles.pendingButton,
                      friendshipStatus === 'pending_received' && styles.acceptButton,
                    ]}
                    onPress={handleFriendAction}
                    disabled={isFriendLoading || friendshipStatus === 'blocked'}
                  >
                    {isFriendLoading ? (
                      <ActivityIndicator
                        size="small"
                        color={friendshipStatus === 'friends' ? '#171717' : '#fff'}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name={getFriendButtonIcon()}
                          size={16}
                          color={
                            friendshipStatus === 'friends' || friendshipStatus === 'pending_sent'
                              ? '#171717'
                              : '#fff'
                          }
                        />
                        <Text
                          style={[
                            styles.friendButtonText,
                            (friendshipStatus === 'friends' ||
                              friendshipStatus === 'pending_sent') &&
                              styles.friendsButtonText,
                          ]}
                        >
                          {getFriendButtonText()}
                        </Text>
                      </>
                    )}
                  </Pressable>

                  {/* Follow Button */}
                  <Pressable
                    style={[styles.followButton, isFollowing && styles.followingButton]}
                    onPress={handleFollow}
                    disabled={isFollowLoading}
                  >
                    {isFollowLoading ? (
                      <ActivityIndicator size="small" color={isFollowing ? '#171717' : '#fff'} />
                    ) : (
                      <>
                        <Ionicons
                          name={isFollowing ? 'person-remove' : 'person-add'}
                          size={16}
                          color={isFollowing ? '#171717' : '#fff'}
                        />
                        <Text
                          style={[
                            styles.followButtonText,
                            isFollowing && styles.followingButtonText,
                          ]}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>

              <Text style={styles.username}>
                @{profile.username || profile.email?.split('@')[0] || 'user'}
              </Text>

              {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

              {profile.createdAt && (
                <View style={styles.joinedRow}>
                  <Ionicons name="calendar-outline" size={14} color="#737373" />
                  <Text style={styles.joinedText}>
                    Joined {format(new Date(profile.createdAt), 'MMMM yyyy')}
                  </Text>
                </View>
              )}

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{formatCount(profile.postCount)}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <Pressable style={styles.stat} onPress={() => openList('friends', 'Friends')}>
                  <Text style={styles.statValue}>{formatCount((profile as any).friendCount)}</Text>
                  <Text style={styles.statLabel}>Friends</Text>
                </Pressable>
                <Pressable style={styles.stat} onPress={() => openList('followers', 'Followers')}>
                  <Text style={styles.statValue}>{formatCount(profile.followerCount)}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </Pressable>
                <Pressable style={styles.stat} onPress={() => openList('following', 'Following')}>
                  <Text style={styles.statValue}>{formatCount(profile.followingCount)}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <Pressable
              style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
              onPress={() => setActiveTab('posts')}
            >
              <Ionicons
                name="grid"
                size={18}
                color={activeTab === 'posts' ? Colors.light.primary : '#737373'}
              />
              <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
                Posts
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'memories' && styles.activeTab]}
              onPress={() => setActiveTab('memories')}
            >
              <Ionicons
                name="location"
                size={18}
                color={activeTab === 'memories' ? Colors.light.primary : '#737373'}
              />
              <Text style={[styles.tabText, activeTab === 'memories' && styles.activeTabText]}>
                Memories
              </Text>
            </Pressable>
          </View>

          {/* Content */}
          {activeTab === 'posts' && (
            <PostsGrid
              posts={posts}
              onPostClick={(id) => router.push({ pathname: '/(tabs)/post/[id]', params: { id } })}
            />
          )}

          {activeTab === 'memories' && (
            <MemoriesGrid
              memories={memories}
              onMemoryClick={(id) => router.push({ pathname: '/memory/[id]', params: { id } })}
            />
          )}
        </View>
      </ScrollView>

      {/* User List Modal */}
      <UserListModal
        visible={showUserList}
        onClose={() => setShowUserList(false)}
        userId={profile.id}
        type={listType}
        title={listTitle}
      />
    </View>
  );
}

// Posts Grid Component
function PostsGrid({
  posts,
  onPostClick,
}: {
  posts: PostDetail[];
  onPostClick: (id: string) => void;
}) {
  const { width } = Dimensions.get('window');
  // Logic:
  // Mobile (< 768px): 3 columns (user requested 2-3, maintaining 3 is safe)
  // Desktop (> 768px): 5 columns (user requested 4-6, 5 is a good median)
  const isDesktop = width > 768;
  const numColumns = isDesktop ? 5 : 3;

  // Calculate size based on container maxWidth (700) or screen width
  // In profile.tsx, we have a maxWidth of 700 for the container
  // So effectively the grid width is min(width, 700)
  const containerWidth = Math.min(width, 700);
  const gap = 2;
  const itemSize = (containerWidth - (numColumns - 1) * gap) / numColumns;

  if (posts.length === 0) {
    return (
      <EmptyState
        icon="grid"
        title="No posts yet"
        description="This user hasn't posted anything yet"
      />
    );
  }

  return (
    <View style={[styles.postsGrid, { gap }]}>
      {posts.map((post) => (
        <Pressable
          key={post.id}
          style={{ width: itemSize, height: itemSize }}
          onPress={() => onPostClick(post.id)}
        >
          {post.imageUrls && post.imageUrls.length > 0 ? (
            <Image source={{ uri: post.imageUrls[0] }} style={styles.gridImage} />
          ) : (
            <View style={styles.gridTextContainer}>
              <Text style={styles.gridText} numberOfLines={3}>
                {post.content}
              </Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

// Memories Grid Component
function MemoriesGrid({
  memories,
  onMemoryClick,
}: {
  memories: any[];
  onMemoryClick: (id: string) => void;
}) {
  const { width } = Dimensions.get('window');
  const isDesktop = width > 768;
  const numColumns = isDesktop ? 5 : 3;
  const containerWidth = Math.min(width, 700);
  const gap = 2;
  const itemSize = (containerWidth - (numColumns - 1) * gap) / numColumns;

  if (memories.length === 0) {
    return (
      <EmptyState
        icon="location"
        title="No public memories"
        description="This user hasn't shared any public memories"
      />
    );
  }

  // Helper to get background color based on memory type/feeling
  const getMemoryColor = (memory: any) => {
    if (memory.type === 'voice') return Colors.memory.voice;
    if (memory.type === 'photo') return Colors.memory.photo;
    if (
      memory.feeling &&
      Colors.memory.feeling[memory.feeling as keyof typeof Colors.memory.feeling]
    ) {
      return Colors.memory.feeling[memory.feeling as keyof typeof Colors.memory.feeling];
    }
    return Colors.memory.text;
  };

  return (
    <View style={[styles.postsGrid, { gap }]}>
      {memories.map((memory) => (
        <Pressable
          key={memory.id}
          style={{ width: itemSize, height: itemSize }}
          onPress={() => onMemoryClick(memory.id)}
        >
          {memory.mediaUrl && memory.type === 'photo' ? (
            <Image source={{ uri: memory.mediaUrl }} style={styles.gridImage} />
          ) : (
            <View style={[styles.memoryGridItem, { backgroundColor: getMemoryColor(memory) }]}>
              <Ionicons
                name={memory.type === 'voice' ? 'mic' : memory.type === 'photo' ? 'image' : 'pin'}
                size={24}
                color="#fff"
              />
              {memory.title && (
                <Text style={styles.memoryGridTitle} numberOfLines={2}>
                  {memory.title}
                </Text>
              )}
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButton: {
    padding: 8,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  profileInfo: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#171717',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  friendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  friendsButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  pendingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  friendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  friendsButtonText: {
    color: '#171717',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#171717',
  },
  username: {
    fontSize: 14,
    color: '#737373',
  },
  bio: {
    fontSize: 14,
    color: '#171717',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  joinedText: {
    fontSize: 12,
    color: '#737373',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#171717',
  },
  statLabel: {
    fontSize: 12,
    color: '#737373',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373',
  },
  activeTabText: {
    color: Colors.light.primary,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  memoryGridItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 4,
  },
  memoryGridTitle: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
});
