import { PageHeader } from '@/components/layout';
import { ActionMenu, EmptyState, ReportModal, UserAvatar } from '@/components/shared';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
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
const GRID_ITEM_SIZE = (width - 8) / 3;

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
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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

  const renderPostItem = ({ item }: { item: PostDetail }) => (
    <Pressable
      style={styles.gridItem}
      onPress={() => router.push({ pathname: '/(tabs)/post/[id]', params: { id: item.id } })}
    >
      {item.imageUrls && item.imageUrls.length > 0 ? (
        <Image source={{ uri: item.imageUrls[0] }} style={styles.gridImage} />
      ) : (
        <View style={styles.gridTextContainer}>
          <Text style={styles.gridText} numberOfLines={3}>
            {item.content}
          </Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <PageHeader
        showBack
        title={profile.username || profile.name || 'Profile'}
        rightAction={
          <Pressable style={styles.moreButton} onPress={() => setShowMenu(true)}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#171717" />
          </Pressable>
        }
      />

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <UserAvatar src={profile.avatarUrl} name={profile.name || 'User'} size="xl" />

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile.name}</Text>
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
                      style={[styles.followButtonText, isFollowing && styles.followingButtonText]}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </>
                )}
              </Pressable>
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
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatCount(profile.friendCount)}</Text>
                <Text style={styles.statLabel}>Friends</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatCount(profile.followerCount)}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatCount(profile.followingCount)}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
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
        {activeTab === 'posts' ? (
          posts.length === 0 ? (
            <EmptyState
              icon="grid"
              title="No posts yet"
              description="This user hasn't posted anything yet"
            />
          ) : (
            <View style={styles.postsGrid}>
              {posts.map((post) => renderPostItem({ item: post }))}
            </View>
          )
        ) : memories.length === 0 ? (
          <EmptyState
            icon="location"
            title="No public memories"
            description="This user hasn't shared any public memories"
          />
        ) : (
          <View style={styles.postsGrid}>
            {memories.map((memory) => (
              <Pressable
                key={memory.id}
                style={styles.gridItem}
                onPress={() => router.push({ pathname: '/memory/[id]', params: { id: memory.id } })}
              >
                {memory.mediaUrl && memory.type === 'photo' ? (
                  <Image source={{ uri: memory.mediaUrl }} style={styles.gridImage} />
                ) : (
                  <View
                    style={[
                      styles.gridTextContainer,
                      {
                        backgroundColor:
                          memory.type === 'voice' ? Colors.memory.voice : Colors.memory.text,
                      },
                    ]}
                  >
                    <Ionicons
                      name={memory.type === 'voice' ? 'mic' : 'pin'}
                      size={24}
                      color="#fff"
                    />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Menu */}
      <ActionMenu
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        items={[
          {
            label: 'Report User',
            icon: 'flag-outline',
            onPress: () => setShowReportModal(true),
            destructive: true,
          },
          {
            label: 'Block User',
            icon: 'ban-outline',
            onPress: () => {
              // TODO: Implement block user
            },
            destructive: true,
          },
          {
            label: 'Share Profile',
            icon: 'share-outline',
            onPress: () => {
              // TODO: Share profile link
            },
          },
        ]}
      />

      {/* Report Modal */}
      {profile && (
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="USER"
          targetId={profile.id}
          onReported={() => {
            // Optionally show some UI feedback
          }}
        />
      )}
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
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
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
    paddingHorizontal: 2,
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
});
