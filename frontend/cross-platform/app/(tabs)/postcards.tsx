/**
 * Postcards Tab Screen
 * Lists user's sent and received time-locked postcards
 */

import { Colors } from '@/constants/Colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Postcard, postcardsService } from '@/services/postcards.service';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type FilterTab = 'all' | 'locked' | 'unlocked';

export default function PostcardsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, accessToken } = useAuth();

  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const loadPostcards = useCallback(async () => {
    if (!accessToken) return;
    
    try {
      // Fetch both sent and received postcards
      const [received, sent] = await Promise.all([
        postcardsService.getReceivedPostcards(accessToken),
        postcardsService.getSentPostcards(accessToken),
      ]);
      
      // Combine and deduplicate (in case self-sent)
      const allPostcards = [...received, ...sent];
      const uniquePostcards = allPostcards.filter(
        (p, index, arr) => arr.findIndex(x => x.id === p.id) === index
      );
      
      // Filter by status based on active tab
      let filtered = uniquePostcards;
      if (activeTab === 'locked') {
        filtered = uniquePostcards.filter((p) => p.status === 'LOCKED');
      } else if (activeTab === 'unlocked') {
        filtered = uniquePostcards.filter((p) => p.status === 'UNLOCKED');
      }
      
      // Sort by created date, newest first
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setPostcards(filtered);
    } catch (error) {
      console.error('Failed to load postcards:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [accessToken, activeTab]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPostcards();
    }
  }, [isAuthenticated, loadPostcards]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadPostcards();
  };

  const navigateToCreate = () => {
    router.push('/postcards/create');
  };

  const navigateToPostcard = (id: string) => {
    router.push(`/postcards/${id}`);
  };

  const lockedCount = postcards.filter(p => p.status === 'LOCKED').length;
  const unlockedCount = postcards.filter(p => p.status === 'UNLOCKED').length;

  if (!isAuthenticated) {
    return (
      <View style={StyleSheet.flatten([styles.centered, { backgroundColor: colors.background }])}>
        <View style={StyleSheet.flatten([styles.iconContainer, { backgroundColor: colors.muted }])}>
          <Ionicons name="mail-outline" size={48} color={colors.primary} />
        </View>
        <Text style={StyleSheet.flatten([styles.title, { color: colors.text }])}>Time-Locked Postcards</Text>
        <Text style={StyleSheet.flatten([styles.subtitle, { color: colors.textSecondary }])}>
          Sign in to send and receive postcards
        </Text>
        <TouchableOpacity 
          style={StyleSheet.flatten([styles.primaryButton, { backgroundColor: colors.primary }])} 
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderPostcard = ({ item }: { item: Postcard }) => (
    <TouchableOpacity
      style={StyleSheet.flatten([styles.postcardCard, { backgroundColor: colors.card, borderColor: colors.border }])}
      onPress={() => navigateToPostcard(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.postcardHeader}>
        <View style={StyleSheet.flatten([
          styles.statusBadge, 
          { backgroundColor: item.status === 'LOCKED' ? colors.warning + '20' : colors.success + '20' }
        ])}>
          <Ionicons 
            name={item.status === 'LOCKED' ? 'lock-closed' : 'lock-open'} 
            size={14} 
            color={item.status === 'LOCKED' ? colors.warning : colors.success} 
          />
          <Text style={StyleSheet.flatten([
            styles.statusText, 
            { color: item.status === 'LOCKED' ? colors.warning : colors.success }
          ])}>
            {item.status === 'LOCKED' ? 'Locked' : 'Unlocked'}
          </Text>
        </View>
        <Text style={StyleSheet.flatten([styles.dateText, { color: colors.textSecondary }])}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      
      {item.message && (
        <Text style={StyleSheet.flatten([styles.messagePreview, { color: colors.text }])} numberOfLines={2}>
          {item.message}
        </Text>
      )}
      
      <View style={styles.postcardFooter}>
        {item.unlockDate && (
          <Text style={StyleSheet.flatten([styles.unlockText, { color: colors.textSecondary }])}>
            {item.status === 'LOCKED' 
              ? `Unlocks ${new Date(item.unlockDate).toLocaleDateString()}`
              : `Opened ${new Date(item.unlockDate).toLocaleDateString()}`
            }
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }])}>
      {/* Header */}
      <View style={StyleSheet.flatten([styles.header, { borderBottomColor: colors.border }])}>
        <View>
          <Text style={StyleSheet.flatten([styles.headerTitle, { color: colors.text }])}>Postcards</Text>
          <Text style={StyleSheet.flatten([styles.headerSubtitle, { color: colors.textSecondary }])}>
            {postcards.length} postcards • {lockedCount} locked
          </Text>
        </View>
        <TouchableOpacity 
          style={StyleSheet.flatten([styles.headerButton, { backgroundColor: colors.muted }])}
          onPress={navigateToCreate}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={StyleSheet.flatten([styles.tabContainer, { borderBottomColor: colors.border }])}>
        {(['all', 'locked', 'unlocked'] as FilterTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={StyleSheet.flatten([
              styles.tab,
              activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }
            ])}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons 
              name={tab === 'all' ? 'mail' : tab === 'locked' ? 'lock-closed' : 'lock-open'}
              size={16}
              color={activeTab === tab ? colors.primary : colors.textSecondary}
            />
            <Text style={StyleSheet.flatten([
              styles.tabText,
              { color: activeTab === tab ? colors.primary : colors.textSecondary }
            ])}>
              {tab === 'all' ? 'All' : tab === 'locked' ? `Locked (${lockedCount})` : `Opened (${unlockedCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={postcards}
          keyExtractor={(item) => item.id}
          renderItem={renderPostcard}
          contentContainerStyle={postcards.length === 0 ? styles.emptyContent : styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={StyleSheet.flatten([styles.emptyIconContainer, { backgroundColor: colors.muted }])}>
                <Ionicons name="mail-outline" size={40} color={colors.primary} />
              </View>
              <Text style={StyleSheet.flatten([styles.emptyText, { color: colors.text }])}>
                {activeTab === 'locked' ? 'No locked postcards' : 
                 activeTab === 'unlocked' ? 'No opened postcards' : 
                 'No postcards yet'}
              </Text>
              <Text style={StyleSheet.flatten([styles.emptySubtext, { color: colors.textSecondary }])}>
                Create your first time-locked postcard to yourself or a friend.
              </Text>
              <TouchableOpacity 
                style={StyleSheet.flatten([styles.primaryButton, { backgroundColor: colors.primary, marginTop: 20 }])} 
                onPress={navigateToCreate}
              >
                <Text style={styles.primaryButtonText}>Create Postcard</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity 
        style={StyleSheet.flatten([styles.fab, { backgroundColor: colors.primary }, Theme.shadows.lg])} 
        onPress={navigateToCreate}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerSubtitle: {
    fontSize: Theme.typography.fontSizes.xs,
    marginTop: 2,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: Theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Theme.spacing.md,
  },
  tabText: {
    fontSize: Theme.typography.fontSizes.sm,
    fontWeight: Theme.typography.fontWeights.medium,
  },
  listContent: {
    padding: Theme.spacing.lg,
    paddingBottom: 100,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postcardCard: {
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
  },
  postcardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
  },
  statusText: {
    fontSize: Theme.typography.fontSizes.xs,
    fontWeight: Theme.typography.fontWeights.medium,
  },
  dateText: {
    fontSize: Theme.typography.fontSizes.xs,
  },
  messagePreview: {
    fontSize: Theme.typography.fontSizes.base,
    lineHeight: 20,
  },
  postcardFooter: {
    marginTop: Theme.spacing.sm,
  },
  unlockText: {
    fontSize: Theme.typography.fontSizes.xs,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xxl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  title: {
    fontSize: Theme.typography.fontSizes.xxl,
    fontWeight: Theme.typography.fontWeights.bold,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Theme.typography.fontSizes.base,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  primaryButton: {
    paddingHorizontal: Theme.spacing.xxl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: Theme.typography.fontWeights.semibold,
    fontSize: Theme.typography.fontSizes.base,
  },
  emptyState: {
    alignItems: 'center',
    padding: Theme.spacing.xxl,
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
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.semibold,
  },
  emptySubtext: {
    fontSize: Theme.typography.fontSizes.sm,
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: Theme.sizes.fab.size,
    height: Theme.sizes.fab.size,
    borderRadius: Theme.sizes.fab.size / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
