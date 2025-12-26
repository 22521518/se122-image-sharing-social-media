import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/Colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { accessToken, logout } = useAuth();
  const { 
    profile, 
    isLoading, 
    isSaving, 
    error, 
    success, 
    updateProfile 
  } = useUserProfile();
  
  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [isEditing, setIsEditing] = useState(false);

  // Sync local state when profile loads
  React.useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSave = async () => {
    await updateProfile({ 
      name: name || undefined, 
      bio: bio || undefined 
    });
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const formatCount = (count: number = 0) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={StyleSheet.flatten([styles.loadingContainer, { backgroundColor: colors.background }])}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={StyleSheet.flatten([styles.loadingText, { color: colors.textSecondary }])}>
          Loading profile...
        </ThemedText>
      </SafeAreaView>
    );
  }

  // Not logged in
  if (!accessToken) {
    return (
      <SafeAreaView style={StyleSheet.flatten([styles.loadingContainer, { backgroundColor: colors.background }])}>
        <View style={StyleSheet.flatten([styles.iconContainer, { backgroundColor: colors.muted }])}>
          <Ionicons name="person-outline" size={48} color={colors.primary} />
        </View>
        <ThemedText style={StyleSheet.flatten([styles.errorText, { color: colors.textSecondary }])}>
          Please log in to view your profile
        </ThemedText>
        <TouchableOpacity 
          style={StyleSheet.flatten([styles.primaryButton, { backgroundColor: colors.primary }])}
          onPress={() => router.replace('/(auth)/login')}
        >
          <ThemedText style={styles.primaryButtonText}>Go to Login</ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }])}>
      {/* Header */}
      <View style={StyleSheet.flatten([styles.header, { borderBottomColor: colors.border }])}>
        <ThemedText style={StyleSheet.flatten([styles.headerTitle, { color: colors.text }])}>Profile</ThemedText>
        <TouchableOpacity 
          style={StyleSheet.flatten([styles.headerButton, { backgroundColor: colors.muted }])}
          onPress={() => router.push('/settings' as any)}
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header - Instagram style */}
        <View style={styles.profileHeader}>
          {/* Avatar */}
          <View style={StyleSheet.flatten([styles.avatarRing, { borderColor: colors.primary }])}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={StyleSheet.flatten([styles.avatarPlaceholder, { backgroundColor: colors.primary }])}>
                <ThemedText style={styles.avatarText}>
                  {profile?.name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Name & Username */}
          <ThemedText style={StyleSheet.flatten([styles.profileName, { color: colors.text }])}>
            {profile?.name || 'User'}
          </ThemedText>
          <ThemedText style={StyleSheet.flatten([styles.email, { color: colors.textSecondary }])}>
            @{profile?.email?.split('@')[0] || 'username'}
          </ThemedText>

          {/* Bio */}
          {profile?.bio && (
            <ThemedText style={StyleSheet.flatten([styles.bioText, { color: colors.text }])}>
              {profile.bio}
            </ThemedText>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={StyleSheet.flatten([styles.statNumber, { color: colors.text }])}>
                {formatCount(0)}
              </ThemedText>
              <ThemedText style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }])}>
                Posts
              </ThemedText>
            </View>
            <View style={StyleSheet.flatten([styles.statDivider, { backgroundColor: colors.border }])} />
            <View style={styles.statItem}>
              <ThemedText style={StyleSheet.flatten([styles.statNumber, { color: colors.text }])}>
                {formatCount(0)}
              </ThemedText>
              <ThemedText style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }])}>
                Followers
              </ThemedText>
            </View>
            <View style={StyleSheet.flatten([styles.statDivider, { backgroundColor: colors.border }])} />
            <View style={styles.statItem}>
              <ThemedText style={StyleSheet.flatten([styles.statNumber, { color: colors.text }])}>
                {formatCount(0)}
              </ThemedText>
              <ThemedText style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }])}>
                Following
              </ThemedText>
            </View>
            <View style={StyleSheet.flatten([styles.statDivider, { backgroundColor: colors.border }])} />
            <View style={styles.statItem}>
              <ThemedText style={StyleSheet.flatten([styles.statNumber, { color: colors.text }])}>
                {formatCount(0)}
              </ThemedText>
              <ThemedText style={StyleSheet.flatten([styles.statLabel, { color: colors.textSecondary }])}>
                Memories
              </ThemedText>
            </View>
          </View>

          {/* Edit Profile Button */}
          <TouchableOpacity 
            style={StyleSheet.flatten([styles.editButton, { borderColor: colors.border }])}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Ionicons name={isEditing ? "close" : "create-outline"} size={18} color={colors.text} />
            <ThemedText style={StyleSheet.flatten([styles.editButtonText, { color: colors.text }])}>
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Edit Form */}
        {isEditing && (
          <View style={StyleSheet.flatten([styles.editForm, { backgroundColor: colors.card, borderColor: colors.border }])}>
            {/* Error/Success Messages */}
            {error && (
              <View style={StyleSheet.flatten([styles.messageBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }])}>
                <ThemedText style={{ color: colors.destructive }}>{error}</ThemedText>
              </View>
            )}
            {success && (
              <View style={StyleSheet.flatten([styles.messageBox, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }])}>
                <ThemedText style={{ color: colors.success }}>{success}</ThemedText>
              </View>
            )}

            {/* Display Name Input */}
            <ThemedText style={StyleSheet.flatten([styles.label, { color: colors.textSecondary }])}>Display Name</ThemedText>
            <TextInput
              style={StyleSheet.flatten([styles.input, { 
                backgroundColor: colors.muted, 
                borderColor: colors.border,
                color: colors.text 
              }])}
              placeholder="Enter your display name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
              maxLength={50}
              editable={!isSaving}
            />

            {/* Bio Input */}
            <ThemedText style={StyleSheet.flatten([styles.label, { color: colors.textSecondary }])}>Bio</ThemedText>
            <TextInput
              style={StyleSheet.flatten([styles.input, styles.bioInput, { 
                backgroundColor: colors.muted, 
                borderColor: colors.border,
                color: colors.text 
              }])}
              placeholder="Tell us about yourself"
              placeholderTextColor={colors.textSecondary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              editable={!isSaving}
            />

            {/* Save Button */}
            <TouchableOpacity
              style={StyleSheet.flatten([
                styles.primaryButton, 
                { backgroundColor: colors.primary },
                isSaving && styles.buttonDisabled
              ])}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>Save Changes</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity 
          style={StyleSheet.flatten([styles.logoutButton, { borderColor: colors.destructive }])} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <ThemedText style={StyleSheet.flatten([styles.logoutButtonText, { color: colors.destructive }])}>
            Log Out
          </ThemedText>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  loadingText: {
    marginTop: Theme.spacing.md,
    fontSize: Theme.typography.fontSizes.sm,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  errorText: {
    fontSize: Theme.typography.fontSizes.base,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
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
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: Theme.typography.fontWeights.bold,
    color: '#fff',
  },
  profileName: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
  },
  email: {
    fontSize: Theme.typography.fontSizes.sm,
    marginTop: Theme.spacing.xs,
  },
  bioText: {
    fontSize: Theme.typography.fontSizes.sm,
    textAlign: 'center',
    marginTop: Theme.spacing.md,
    maxWidth: 280,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
  },
  statLabel: {
    fontSize: Theme.typography.fontSizes.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    gap: Theme.spacing.sm,
  },
  editButtonText: {
    fontSize: Theme.typography.fontSizes.sm,
    fontWeight: Theme.typography.fontWeights.medium,
  },
  editForm: {
    marginHorizontal: Theme.spacing.lg,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
  },
  messageBox: {
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.md,
  },
  label: {
    fontSize: Theme.typography.fontSizes.sm,
    marginBottom: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    fontSize: Theme.typography.fontSizes.base,
    marginBottom: Theme.spacing.md,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  primaryButton: {
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: Theme.typography.fontSizes.base,
    fontWeight: Theme.typography.fontWeights.semibold,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.xl,
    borderWidth: 1,
    gap: Theme.spacing.sm,
  },
  logoutButtonText: {
    fontSize: Theme.typography.fontSizes.base,
    fontWeight: Theme.typography.fontWeights.semibold,
  },
});