import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function ProfileScreen() {
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
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // Not logged in
  if (!accessToken) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Please log in to view your profile</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.buttonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {profile?.name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>

        {/* Email */}
        <Text style={styles.email}>{profile?.email || 'No email'}</Text>

        {/* Error/Success Messages */}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        {/* Display Name Input */}
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your display name"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
          maxLength={50}
          editable={!isSaving}
        />

        {/* Bio Input */}
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Tell us about yourself"
          placeholderTextColor="#888"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          editable={!isSaving}
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        {/* Debug Info (only in development) */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              Debug Info:{'\n'}
              Has Token: {String(!!accessToken)}{'\n'}
              Has Profile: {String(!!profile)}{'\n'}
              Profile Email: {profile?.email || 'N/A'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    padding: 24,
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
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
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  success: {
    color: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  debugContainer: {
    marginTop: 32,
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  debugText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});