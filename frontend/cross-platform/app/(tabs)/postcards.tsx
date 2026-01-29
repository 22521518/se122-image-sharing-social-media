import {
    CreatePostcardModal,
    LockedPostcardModal,
    PostcardDetail,
    PostcardEnvelope,
} from '@/components/postcards';
import { EmptyState, FloatingActionButton } from '@/components/shared';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useIsMobileView, useShouldShowSidebar } from '@/hooks/usePlatform';
import { postcardsService } from '@/services/postcards.service';
import type { CreatePostcardDto, Postcard } from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PostcardsPage() {
  const isMobile = useIsMobileView();
  const showSidebar = useShouldShowSidebar();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { accessToken, isAuthenticated } = useAuth();
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'locked' | 'unlocked'>('all');

  // Modals state
  const [selectedPostcard, setSelectedPostcard] = useState<Postcard | null>(null);
  const [selectedLockedPostcard, setSelectedLockedPostcard] = useState<Postcard | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Responsive Layout Calculation
  const getLayoutSettings = () => {
    // Adjust breakpoints based on available content width (screen width - sidebar)
    const availableSpace = width - (showSidebar ? 256 : 0);

    if (availableSpace < 600) return { numColumns: 2, gap: 12, padding: 16 };
    if (availableSpace < 900) return { numColumns: 3, gap: 16, padding: 24 };
    if (availableSpace < 1200) return { numColumns: 4, gap: 20, padding: 32 };
    return { numColumns: 5, gap: 24, padding: 40 };
  };

  const { numColumns, gap, padding } = getLayoutSettings();

  // Subtract scrollbar width (20px) on desktop to prevent horizontal overflow
  // Also subtract sidebar width if visible
  const availableWidth = width - (showSidebar ? 256 : 0) - (isMobile ? 0 : 20);
  const itemWidth = (availableWidth - padding * 2 - gap * (numColumns - 1)) / numColumns;

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && accessToken) {
        loadPostcards();
      }
    }, [isAuthenticated, accessToken])
  );

  const loadPostcards = async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      // Load both received and sent postcards
      const [received, sent] = await Promise.all([
        postcardsService.getReceivedPostcards(accessToken),
        postcardsService.getSentPostcards(accessToken),
      ]);

      // Deduplicate postcards
      const uniquePostcards = Array.from(
        new Map([...received, ...sent].map((p) => [p.id, p])).values(),
      );

      // Store all postcards, filtering happens in render
      setPostcards(uniquePostcards);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPostcards = useMemo(() => {
    if (activeTab === 'locked') return postcards.filter((p) => p.status === 'LOCKED');
    if (activeTab === 'unlocked') return postcards.filter((p) => p.status === 'UNLOCKED');
    return postcards;
  }, [postcards, activeTab]);

  const handlePostcardOpen = useCallback(
    async (postcard: Postcard) => {
      if (postcard.status === 'LOCKED') {
        // Fetch fresh data from API - this triggers on-demand unlock check
        try {
          const freshPostcard = await postcardsService.getPostcard(postcard.id, accessToken);

          // Update the postcard in local state
          setPostcards((prev) => prev.map((p) => (p.id === freshPostcard.id ? freshPostcard : p)));

          // Show appropriate modal based on fresh status
          if (freshPostcard.status === 'UNLOCKED') {
            setSelectedPostcard(freshPostcard);
          } else {
            setSelectedLockedPostcard(freshPostcard);
          }
        } catch (error) {
          console.error('Failed to fetch postcard:', error);
          // Fallback to cached data
          setSelectedLockedPostcard(postcard);
        }
      } else {
        setSelectedPostcard(postcard);
      }
    },
    [accessToken],
  );

  const handlePostcardFlip = async (postcard: Postcard) => {
    // Note: unlockPostcard method needs to be added to service if needed
    // For now, just open the postcard detail
    handlePostcardOpen(postcard);
  };

  const handleCreatePostcard = async (data: CreatePostcardDto) => {
    try {
      const newPostcard = await postcardsService.createPostcard(data, accessToken);
      setPostcards((prev) => [newPostcard, ...prev]);
      setCreateModalOpen(false);
    } catch {
      console.error('Failed to create postcard');
    }
  };

  const lockedCount = postcards.filter((p) => p.status === 'LOCKED').length;
  const unlockedCount = postcards.filter((p) => p.status === 'UNLOCKED').length;

  const renderPostcard = ({ item }: { item: Postcard }) => (
    <View style={{ width: itemWidth, marginBottom: gap }}>
      <PostcardEnvelope postcard={item} onOpen={handlePostcardOpen} onFlip={handlePostcardFlip} />
    </View>
  );

  const handleTestGeoUnlock = async () => {
    try {
      // Hardcoded testing coords (Saigon)
      await postcardsService.checkGeoLock(10.7769, 106.7009, accessToken);
      loadPostcards();
      alert('Checked Geo Unlock!');
    } catch (e) {
      console.error(e);
      alert('Geo Check Failed');
    }
  };

  const handleTestTimeUnlock = async () => {
    try {
      await postcardsService.triggerTimeUnlock(accessToken);
      loadPostcards();
      alert('Triggered Time Unlock!');
    } catch (e) {
      console.error(e);
      alert('Time Trigger Failed');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Postcards</Text>
          <Text style={styles.headerSubtitle}>
            {postcards.length} postcards • {lockedCount} locked
          </Text>
        </View>
        {!isMobile && (
          <Pressable style={styles.addButtonMobile} onPress={() => setCreateModalOpen(true)}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.newPostCardButtonText}>New Card</Text>
          </Pressable>
        )}
      </View>

      {/* Debug Controls */}
      {/* {!isMobile && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug / Test Controls</Text>
          <View style={styles.debugButtons}>
            <Pressable style={styles.debugBtn} onPress={handleTestGeoUnlock}>
              <Text style={styles.debugBtnText}>Check Geo (Saigon)</Text>
            </Pressable>
            <Pressable style={styles.debugBtn} onPress={handleTestTimeUnlock}>
              <Text style={styles.debugBtnText}>Trigger Time Unlock</Text>
            </Pressable>
          </View>
        </View>
      )} */}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Ionicons
            name="mail"
            size={16}
            color={activeTab === 'all' ? Colors.light.primary : '#737373'}
          />
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'locked' && styles.activeTab]}
          onPress={() => setActiveTab('locked')}
        >
          <Ionicons
            name="lock-closed"
            size={16}
            color={activeTab === 'locked' ? Colors.light.primary : '#737373'}
          />
          <Text style={[styles.tabText, activeTab === 'locked' && styles.activeTabText]}>
            Locked ({lockedCount})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'unlocked' && styles.activeTab]}
          onPress={() => setActiveTab('unlocked')}
        >
          <Ionicons
            name="lock-open"
            size={16}
            color={activeTab === 'unlocked' ? Colors.light.primary : '#737373'}
          />
          <Text style={[styles.tabText, activeTab === 'unlocked' && styles.activeTabText]}>
            Opened ({unlockedCount})
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : filteredPostcards.length === 0 ? (
          <EmptyState
            icon="mail"
            title={
              activeTab === 'locked'
                ? 'No locked postcards'
                : activeTab === 'unlocked'
                  ? 'No opened postcards'
                  : 'No postcards yet'
            }
            description="Create your first time-locked postcard to yourself or a friend."
            action={{
              label: 'Create Postcard',
              onPress: () => setCreateModalOpen(true),
            }}
          />
        ) : (
          <FlatList
            key={numColumns} // Force re-render when columns change
            data={filteredPostcards}
            keyExtractor={(item) => item.id}
            renderItem={renderPostcard}
            numColumns={numColumns}
            columnWrapperStyle={{ gap }}
            contentContainerStyle={[styles.listContent, { paddingHorizontal: padding }]}
          />
        )}
      </View>

      {/* FAB */}
      {isMobile && (
        <FloatingActionButton
          onPress={() => setCreateModalOpen(true)}
          icon={<Ionicons name="add" size={24} color="#fff" />}
        />
      )}

      {/* Postcard Detail */}
      {selectedPostcard && (
        <PostcardDetail
          postcard={selectedPostcard}
          visible={!!selectedPostcard}
          onClose={() => setSelectedPostcard(null)}
        />
      )}

      {/* Locked Postcard Modal */}
      {selectedLockedPostcard && (
        <LockedPostcardModal
          postcard={selectedLockedPostcard}
          visible={!!selectedLockedPostcard}
          onClose={() => setSelectedLockedPostcard(null)}
          onRefresh={async () => {
            // Re-fetch the postcard to trigger on-demand unlock
            const fresh = await postcardsService.getPostcard(
              selectedLockedPostcard.id,
              accessToken,
            );

            // Update local state
            setPostcards((prev) => prev.map((p) => (p.id === fresh.id ? fresh : p)));

            // If unlocked, switch to detail view
            if (fresh.status === 'UNLOCKED') {
              setSelectedLockedPostcard(null);
              setSelectedPostcard(fresh);
            } else {
              // Update the modal's postcard
              setSelectedLockedPostcard(fresh);
            }
          }}
        />
      )}

      {/* Create Modal */}
      <CreatePostcardModal
        visible={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreatePostcard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#171717',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  addButtonMobile: {
    // padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  newPostCardButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 8,
    paddingBottom: 80,
  },

  debugContainer: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    marginTop: 10,
    borderRadius: 8,
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  debugBtn: {
    backgroundColor: Colors.light.primary,
    padding: 8,
    borderRadius: 4,
  },
  debugBtnText: {
    color: '#fff',
    fontSize: 12,
  },
});
