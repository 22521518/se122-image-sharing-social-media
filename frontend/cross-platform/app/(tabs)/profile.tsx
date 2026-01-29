import { PageHeader } from '@/components/layout'; // Force refresh
import { EmptyState, LoadingSpinner, UserAvatar } from '@/components/shared';
import { UserListModal } from '@/components/social/UserListModal';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Memory, useMemories } from '@/context/MemoriesContext';
import { useIsMobileView } from '@/hooks/usePlatform';
import { usersService } from '@/services/users.service';
import type { PostDetail, Profile } from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function SelfProfilePage() {
  const router = useRouter();
  const { user, logout, accessToken } = useAuth();
  const { memories, fetchMemories } = useMemories();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PostDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'memories'>('posts');

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

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        if (!accessToken || !user?.id) {
          setIsLoading(false);
          return;
        }

        try {
          const [profileData, postsData] = await Promise.all([
            usersService.getCurrentUserProfile(accessToken),
            usersService.getUserPosts(user.id, accessToken),
          ]);
          setProfile(profileData);
          setPosts(postsData);

          // Also fetch user's memories
          await fetchMemories();
        } catch (error) {
          console.error('Failed to load profile:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadProfile();
    }, [user?.id, accessToken, fetchMemories]),
  );

  const handleLogout = async () => {
    await logout();
    setSettingsModalOpen(false);
    router.replace('/(auth)/login');
  };

  const formatCount = (count: number | undefined) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const goToPost = (postId: string) =>
    router.push({ pathname: '/(tabs)/post/[id]', params: { id: postId } });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <PageHeader title="Profile" />
        <LoadingSpinner fullScreen />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <PageHeader title="Profile" />
        <EmptyState title="Profile not found" description="We couldn't load your profile" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Profile"
        rightAction={
          <Pressable onPress={() => setSettingsModalOpen(true)} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={24} color="#171717" />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <UserAvatar src={profile.avatarUrl} name={profile.name || 'User'} size="xl" />

            <View style={styles.profileInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Pressable style={styles.editButton} onPress={() => setEditModalOpen(true)}>
                  <Ionicons name="create-outline" size={16} color="#737373" />
                  <Text style={styles.editButtonText}>Edit</Text>
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
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCount(profile.postCount)}</Text>
                  <Text style={styles.statLabel}>Posts</Text>
                </View>
                <Pressable style={styles.statItem} onPress={() => openList('friends', 'Friends')}>
                  <Text style={styles.statValue}>{formatCount(profile.friendCount)}</Text>
                  <Text style={styles.statLabel}>Friends</Text>
                </Pressable>
                <Pressable
                  style={styles.statItem}
                  onPress={() => openList('followers', 'Followers')}
                >
                  <Text style={styles.statValue}>{formatCount(profile.followerCount)}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </Pressable>
                <Pressable
                  style={styles.statItem}
                  onPress={() => openList('following', 'Following')}
                >
                  <Text style={styles.statValue}>{formatCount(profile.followingCount)}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Content Tabs */}
          <View style={styles.tabsContainer}>
            <Pressable
              style={[styles.tabButton, activeTab === 'posts' && styles.activeTab]}
              onPress={() => setActiveTab('posts')}
            >
              <Ionicons
                name="grid-outline"
                size={18}
                color={activeTab === 'posts' ? Colors.light.primary : '#737373'}
              />
              <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
                Posts ({profile.postCount})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabButton, activeTab === 'memories' && styles.activeTab]}
              onPress={() => setActiveTab('memories')}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={activeTab === 'memories' ? Colors.light.primary : '#737373'}
              />
              <Text style={[styles.tabText, activeTab === 'memories' && styles.activeTabText]}>
                Memories ({memories.length})
              </Text>
            </Pressable>
          </View>

          {/* Tab Content */}
          {activeTab === 'posts' && <PostsGrid posts={posts} onPostClick={goToPost} />}
          {activeTab === 'memories' &&
            (memories.length === 0 ? (
              <EmptyState
                icon="location-outline"
                title="No memories yet"
                description="Your memories will appear here"
                action={{
                  label: 'Go to Map',
                  onPress: () => router.push('/(tabs)/map'),
                }}
              />
            ) : (
              <MemoriesGrid
                memories={memories}
                onMemoryClick={(id) => router.push(`/memory/${id}` as any)}
              />
            ))}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editModalOpen}
        profile={profile}
        onSave={(updated) => {
          setProfile(updated);
          setEditModalOpen(false);
        }}
        onClose={() => setEditModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsModalOpen}
        onLogout={handleLogout}
        onClose={() => setSettingsModalOpen(false)}
      />

      {/* User List Modal */}
      <UserListModal
        visible={showUserList}
        onClose={() => setShowUserList(false)}
        userId={user?.id || ''}
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
        icon="grid-outline"
        title="No posts yet"
        description="Your posts will appear here"
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
  memories: Memory[];
  onMemoryClick: (id: string) => void;
}) {
  const { width } = Dimensions.get('window');
  const isDesktop = width > 768;
  const numColumns = isDesktop ? 5 : 3;
  const containerWidth = Math.min(width, 700);
  const gap = 2;
  const itemSize = (containerWidth - (numColumns - 1) * gap) / numColumns;

  const getMemoryIcon = (type: Memory['type']) => {
    switch (type) {
      case 'voice':
        return 'mic';
      case 'photo':
        return 'image';
      case 'mixed':
        return 'layers';
      case 'text_only':
        return 'text';
      default:
        return 'location';
    }
  };

  const getFeelingColor = (feeling?: string) => {
    switch (feeling) {
      case 'JOY':
        return '#f59e0b';
      case 'MELANCHOLY':
        return '#6366f1';
      case 'ENERGETIC':
        return '#ef4444';
      case 'CALM':
        return '#10b981';
      case 'INSPIRED':
        return '#8b5cf6';
      default:
        return Colors.light.primary;
    }
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
            <View
              style={[styles.memoryGridItem, { backgroundColor: getFeelingColor(memory.feeling) }]}
            >
              <Ionicons name={getMemoryIcon(memory.type) as any} size={28} color="#fff" />
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

// Edit Profile Modal Wrapper
function EditProfileModal({
  visible,
  profile,
  onSave,
  onClose,
}: {
  visible: boolean;
  profile: Profile;
  onSave: (updated: Profile) => void;
  onClose: () => void;
}) {
  const isMobileView = useIsMobileView();

  return (
    <Modal
      visible={visible}
      animationType={isMobileView ? 'slide' : 'fade'}
      presentationStyle="pageSheet"
      transparent={!isMobileView}
      onRequestClose={onClose}
    >
      <EditProfileForm
        profile={profile}
        onSave={onSave}
        onClose={onClose}
        isMobileView={isMobileView}
      />
    </Modal>
  );
}

// Edit Profile Form
function EditProfileForm({
  profile,
  onSave,
  onClose,
  isMobileView,
}: {
  profile: Profile;
  onSave: (updated: Profile) => void;
  onClose: () => void;
  isMobileView: boolean;
}) {
  const { accessToken } = useAuth();
  const isDesktop = !isMobileView;
  const [name, setName] = useState(profile.name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarUrl ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to change your avatar!');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarPreview(result.assets[0].uri);
    }
  };

  const removeAvatar = async () => {
    if (!accessToken) return;

    setIsSubmitting(true);
    try {
      await usersService.removeAvatar(accessToken);
      setAvatarUri(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error('Failed to remove avatar:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!accessToken) return;

    setIsSubmitting(true);
    try {
      const updated = await usersService.updateProfileWithAvatar(
        { name: name || undefined, bio: bio || undefined },
        avatarUri,
        accessToken,
      );
      onSave(updated);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <View style={[styles.modalContainer, isDesktop && styles.modalContainerDesktop]}>
      <View style={styles.modalHeader}>
        <Pressable onPress={onClose}>
          <Ionicons name="close" size={24} color="#171717" />
        </Pressable>
        <Text style={styles.modalTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.formContent}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <Pressable onPress={pickImage} style={styles.avatarEditContainer}>
            {avatarPreview ? (
              <Image source={{ uri: avatarPreview }} style={styles.avatarEditImage} />
            ) : (
              <View style={styles.avatarEditPlaceholder}>
                <Ionicons name="person" size={40} color="#a3a3a3" />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </Pressable>
          <View style={styles.avatarActions}>
            <Pressable style={styles.avatarActionButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={18} color={Colors.light.primary} />
              <Text style={styles.avatarActionText}>Change Photo</Text>
            </Pressable>
            {avatarPreview && (
              <Pressable style={styles.avatarActionButton} onPress={removeAvatar}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={[styles.avatarActionText, { color: '#ef4444' }]}>Remove</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Bio</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={3}
          />
        </View>

        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Save Changes</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {modalContent}
      </View>
    );
  }

  return modalContent;
}

// Settings Modal Wrapper
function SettingsModal({
  visible,
  onLogout,
  onClose,
}: {
  visible: boolean;
  onLogout: () => void;
  onClose: () => void;
}) {
  const isMobileView = useIsMobileView();

  return (
    <Modal
      visible={visible}
      animationType={isMobileView ? 'slide' : 'fade'}
      presentationStyle="pageSheet"
      transparent={!isMobileView}
      onRequestClose={onClose}
    >
      <SettingsContent onLogout={onLogout} onClose={onClose} isMobileView={isMobileView} />
    </Modal>
  );
}

// Settings Content
function SettingsContent({
  onLogout,
  onClose,
  isMobileView,
}: {
  onLogout: () => void;
  onClose: () => void;
  isMobileView: boolean;
}) {
  const isDesktop = !isMobileView;
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [privateAccount, setPrivateAccount] = useState(false);

  const modalContent = (
    <View style={[styles.modalContainer, isDesktop && styles.modalContainerDesktop]}>
      <View style={styles.modalHeader}>
        <Pressable onPress={onClose}>
          <Ionicons name="close" size={24} color="#171717" />
        </Pressable>
        <Text style={styles.modalTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.settingsContent}>
        {/* Notification Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Notifications</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive push notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#e5e5e5', true: Colors.light.primary }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDescription}>Receive email updates</Text>
            </View>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              trackColor={{ false: '#e5e5e5', true: Colors.light.primary }}
            />
          </View>
        </View>

        <View style={styles.separator} />

        {/* Privacy */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Privacy</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Private Account</Text>
              <Text style={styles.settingDescription}>Only followers can see your posts</Text>
            </View>
            <Switch
              value={privateAccount}
              onValueChange={setPrivateAccount}
              trackColor={{ false: '#e5e5e5', true: Colors.light.primary }}
            />
          </View>
        </View>

        <View style={styles.separator} />

        {/* Account Actions */}
        <View style={styles.settingsSection}>
          <Pressable style={styles.logoutButton} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {modalContent}
      </View>
    );
  }

  return modalContent;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#171717',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 12,
    color: '#737373',
  },
  username: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#171717',
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 280,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  joinedText: {
    fontSize: 12,
    color: '#737373',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
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
    marginVertical: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    color: '#737373',
  },
  activeTabText: {
    color: Colors.light.primary,
    fontWeight: '500',
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
    gap: 6,
  },
  memoryGridTitle: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContainerDesktop: {
    width: 500,
    maxWidth: '90%',
    maxHeight: '85%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
  },
  formContent: {
    padding: 16,
    flexGrow: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#171717',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsContent: {
    flexGrow: 1,
  },
  settingsSection: {
    padding: 16,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  settingDescription: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Avatar edit styles
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarEditContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarEditImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarEditPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 16,
  },
  avatarActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  avatarActionText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '500',
  },
});
