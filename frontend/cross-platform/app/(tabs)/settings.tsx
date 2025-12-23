import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useUserSettings } from '@/hooks/useUserSettings';

type PrivacyLevel = 'private' | 'friends' | 'public';

export default function SettingsScreen() {
  const {
    settings,
    isLoading,
    isSaving,
    isDeleting,
    error,
    success,
    updatePrivacy,
    confirmDeleteAccount,
  } = useUserSettings();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Privacy Settings</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <Text style={styles.sectionTitle}>Default Privacy for New Memories</Text>
        <Text style={styles.sectionSubtitle}>
          Choose who can see your new memories by default
        </Text>

        <View style={styles.privacyOptions}>
          {(['private', 'friends', 'public'] as PrivacyLevel[]).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.privacyOption,
                settings?.defaultPrivacy === level && styles.privacyOptionActive,
              ]}
              onPress={() => updatePrivacy(level)}
              disabled={isSaving}
            >
              <Text
                style={[
                  styles.privacyOptionText,
                  settings?.defaultPrivacy === level && styles.privacyOptionTextActive,
                ]}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
              <Text style={styles.privacyOptionDesc}>
                {level === 'private' && 'Only you'}
                {level === 'friends' && 'You and your friends'}
                {level === 'public' && 'Everyone'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Text style={styles.dangerSubtitle}>
            Permanently delete your account and all associated data.
          </Text>
          <TouchableOpacity
            style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
            onPress={confirmDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            )}
          </TouchableOpacity>
        </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  privacyOptions: {
    gap: 12,
    marginBottom: 32,
  },
  privacyOption: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 16,
  },
  privacyOptionActive: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  privacyOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  privacyOptionTextActive: {
    color: '#6366f1',
  },
  privacyOptionDesc: {
    fontSize: 14,
    color: '#888',
  },
  dangerZone: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 24,
    marginTop: 16,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  dangerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
    color: '#fff',
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
});
