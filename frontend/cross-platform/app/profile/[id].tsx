import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { FollowButton } from '../../components/social/FollowButton';
import { LoginPromptModal } from '../../components/common/LoginPromptModal';
import { ApiService } from '../../services/api.service';

interface PublicProfile {
  id: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isAuthenticated?: boolean;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const isAuthenticated = !!accessToken;
  const isOwnProfile = user?.id === id;

  // Redirect to own profile tab if viewing self
  useEffect(() => {
    if (isOwnProfile && !isLoading) {
      router.replace('/(tabs)/profile');
    }
  }, [isOwnProfile, isLoading]);

  useEffect(() => {
    if (id && !isOwnProfile) {
      loadProfile(id, accessToken || undefined);
    } else if (isOwnProfile) {
      setIsLoading(false);
    }
  }, [id, accessToken, isOwnProfile]);

  const loadProfile = async (userId: string, token?: string) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await ApiService.get<PublicProfile>(`/api/users/${userId}/public-profile`, token);
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginRequired = () => {
    setShowLoginPrompt(true);
  };

  // Show loading while redirecting to own profile
  if (isOwnProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.redirectText}>Redirecting to your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.error}>{error || 'User not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: profile.name || 'User Profile', headerBackTitle: 'Back' }} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
            <View style={styles.avatarContainer}>
              {profile.avatarUrl ? (
                <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {profile.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.name}>{profile.name || 'Anonymous'}</Text>
            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

            <View style={styles.stats}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{profile.followerCount}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{profile.followingCount}</Text>
                    <Text style={styles.statLabel}>Following</Text>
                </View>
            </View>

            {/* Only show follow button for other users */}
            <View style={styles.actionButton}>
                <FollowButton 
                    key={`follow-${profile.id}-${profile.isFollowing}`}
                    userId={profile.id} 
                    initialIsFollowing={profile.isFollowing}
                    isAuthenticated={isAuthenticated}
                    accessToken={accessToken || undefined}
                    onLoginRequired={handleLoginRequired}
                    onFollowChange={(isFollowing) => {
                        setProfile(prev => prev ? ({
                            ...prev,
                            isFollowing,
                            followerCount: isFollowing ? prev.followerCount + 1 : prev.followerCount - 1
                        }) : null);
                    }}
                />
            </View>
        </View>
      </ScrollView>

      <LoginPromptModal
        visible={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        message="Log in to follow users and see their latest updates in your feed."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
  },
  actionButton: {
    minWidth: 150,
  },
  error: {
    color: '#ef4444',
    fontSize: 16,
  },
  redirectText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
});
