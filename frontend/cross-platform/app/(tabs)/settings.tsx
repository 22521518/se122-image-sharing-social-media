import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/Colors';
import { Theme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type PrivacyLevel = 'private' | 'friends' | 'public';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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
      <SafeAreaView style={StyleSheet.flatten([styles.loadingContainer, { backgroundColor: colors.background }])}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }])}>
      {/* Header */}
      <View style={StyleSheet.flatten([styles.header, { borderBottomColor: colors.border }])}>
        <ThemedText style={StyleSheet.flatten([styles.headerTitle, { color: colors.text }])}>Settings</ThemedText>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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

        {/* Privacy Section */}
        <View style={styles.section}>
           <ThemedText style={StyleSheet.flatten([styles.sectionTitle, { color: colors.text }])}>
            Privacy
          </ThemedText>
           <ThemedText style={StyleSheet.flatten([styles.sectionSubtitle, { color: colors.textSecondary }])}>
            Choose who can see your new memories by default
          </ThemedText>

          <View style={styles.privacyOptions}>
            {(['private', 'friends', 'public'] as PrivacyLevel[]).map((level) => {
              const isActive = settings?.defaultPrivacy === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={StyleSheet.flatten([
                    styles.privacyOption,
                    { 
                      backgroundColor: colors.card, 
                      borderColor: isActive ? colors.primary : colors.border 
                    },
                    isActive && { backgroundColor: `${colors.primary}15` },
                  ])}
                  onPress={() => updatePrivacy(level)}
                  disabled={isSaving}
                >
                  <View style={styles.privacyOptionHeader}>
                    <View style={StyleSheet.flatten([
                      styles.privacyIcon, 
                      { backgroundColor: isActive ? colors.primary : colors.muted }
                    ])}>
                      <Ionicons 
                        name={
                          level === 'private' ? 'lock-closed' : 
                          level === 'friends' ? 'people' : 'globe'
                        } 
                        size={18} 
                        color={isActive ? '#fff' : colors.textSecondary} 
                      />
                    </View>
                    <ThemedText
                      style={StyleSheet.flatten([
                        styles.privacyOptionText,
                        { color: isActive ? colors.primary : colors.text },
                      ])}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </ThemedText>
                    {isActive && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </View>
                  <ThemedText style={StyleSheet.flatten([styles.privacyOptionDesc, { color: colors.textSecondary }])}>
                    {level === 'private' && 'Only you can see'}
                    {level === 'friends' && 'You and your friends'}
                    {level === 'public' && 'Everyone can see'}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={StyleSheet.flatten([styles.dangerZone, { borderTopColor: colors.border }])}>
          <ThemedText style={StyleSheet.flatten([styles.dangerTitle, { color: colors.destructive }])}>
            Danger Zone
          </ThemedText>
          <ThemedText style={StyleSheet.flatten([styles.dangerSubtitle, { color: colors.textSecondary }])}>
            Permanently delete your account and all associated data.
          </ThemedText>
          <TouchableOpacity
            style={StyleSheet.flatten([
              styles.deleteButton, 
              { backgroundColor: colors.destructive },
              isDeleting && styles.buttonDisabled
            ])}
            onPress={confirmDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <ThemedText style={styles.deleteButtonText}>Delete Account</ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>

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
  scrollView: {
    flex: 1,
  },
  messageBox: {
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  section: {
    padding: Theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.semibold,
    marginBottom: Theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Theme.typography.fontSizes.sm,
    marginBottom: Theme.spacing.lg,
  },
  privacyOptions: {
    gap: Theme.spacing.md,
  },
  privacyOption: {
    borderWidth: 1,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
  },
  privacyOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
  },
  privacyIcon: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyOptionText: {
    fontSize: Theme.typography.fontSizes.base,
    fontWeight: Theme.typography.fontWeights.semibold,
    flex: 1,
  },
  privacyOptionDesc: {
    fontSize: Theme.typography.fontSizes.sm,
    marginLeft: 52,
  },
  dangerZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Theme.spacing.lg,
    marginTop: Theme.spacing.lg,
  },
  dangerTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.semibold,
    marginBottom: Theme.spacing.xs,
  },
  dangerSubtitle: {
    fontSize: Theme.typography.fontSizes.sm,
    marginBottom: Theme.spacing.lg,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: Theme.typography.fontSizes.base,
    fontWeight: Theme.typography.fontWeights.semibold,
  },
});
