/**
 * Messages Tab Page
 *
 * Responsive messaging layout:
 * - Desktop: Split-view with ConversationList (left) + ChatView (right)
 * - Mobile: ConversationList only, tap to navigate to individual chat
 */

import { API_BASE_URL } from '@/services/api.service';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';

import { PageHeader } from '@/components/layout';
import { ChatView } from '@/components/messages';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/hooks/usePlatform';
import {
    Conversation,
    messagingService,
} from '@/services/messaging.service';
import { socialService, UserSearchResult } from '@/services/social.service';

// ===== CONVERSATION LIST ITEM =====
interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  onPress: () => void;
  isSelected?: boolean;
}

function ConversationItem({ conversation, currentUserId, onPress, isSelected }: ConversationItemProps) {
  // Force light theme for consistency
  const colors = Colors['light'];
  // For 1-1 chats, show the other participant's info
  const otherParticipant = conversation.participants.find(p => p.userId !== currentUserId);
  const displayName = conversation.isGroup 
    ? conversation.name || 'Group Chat'
    : otherParticipant?.user.name || 'Unknown User';
  const avatarUrl = conversation.isGroup 
    ? null 
    : otherParticipant?.user.avatarUrl;

  // Messages list item logic
  const isSelf = conversation.lastMessage?.senderId === currentUserId;
  const senderProfile = conversation.participants.find(p => p.userId === conversation.lastMessage?.senderId)?.user;
  const senderName = isSelf ? 'You' : (senderProfile?.name?.split(' ')[0] || 'User'); // First name only for brevity

  let previewText = '';
  if (conversation.unreadCount > 1) {
    previewText = `${conversation.unreadCount} new messages`;
  } else {
    const content = conversation.lastMessage?.content || 
      (conversation.lastMessage?.type === 'IMAGE' ? '📷 Photo' : 
       conversation.lastMessage?.type === 'AUDIO' ? '🎤 Voice message' : '');
    previewText = `${senderName}: ${content}`;
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <Pressable 
      onPress={onPress}
      style={[
        styles.conversationItem,
        isSelected && { backgroundColor: '#E8795A20' },
      ]}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {conversation.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.conversationTime}>
            {formatTime(conversation.lastMessageAt)}
          </Text>
        </View>
        <Text 
          style={[
            styles.conversationPreview, 
            conversation.unreadCount > 0 && { fontWeight: '700', color: colors.text }
          ]} 
          numberOfLines={1}
        >
          {previewText}
        </Text>
      </View>
    </Pressable>
  );
}




// ===== MAIN MESSAGES PAGE =====
export default function MessagesPage() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const { isDesktop, isWeb } = usePlatform();
  // Force light theme for consistency
  const colors = Colors['light'];

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  // Ref to track selected conversation without causing re-renders/re-connects in socket
  const selectedConvRef = React.useRef<string | null>(null);

  useEffect(() => {
    selectedConvRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Load conversations
  const loadConversations = useCallback(async (refresh = false) => {
    if (!accessToken) return;
    
    try {
      if (refresh) {
        setRefreshing(true);
        setCursor(null);
      }
      
      const response = await messagingService.getConversations(
        accessToken, 
        refresh ? undefined : cursor ?? undefined
      );
      
      if (refresh) {
        setConversations(response.conversations);
      } else {
        setConversations(prev => [...prev, ...response.conversations]);
      }
      
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, cursor]);

  useFocusEffect(
    useCallback(() => {
    loadConversations(true);
    loadFriends();
  }, [accessToken])
  );

  // Friends list for suggestions
  const [friends, setFriends] = useState<UserSearchResult[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const loadFriends = async () => {
  };

  // User search
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setUserResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setUserResults([]);
        return;
      }

      setSearching(true);
      try {
        const results = await socialService.search(searchQuery, 'users');
        // Filter out current user from results
        const filteredResults = results.users.filter(u => u.id !== user?.id);
        setUserResults(filteredResults);
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setSearching(false);
      }
    }, 300);


    return () => clearTimeout(timer);
  }, [searchQuery, user?.id]);

  // Real-time Updates & Badge
  useEffect(() => {
    if (!accessToken || !user?.id) return;

    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    const socket = io(`${baseUrl}/messages`, {
      auth: { userId: user.id },
      transports: ['websocket'],
    });

    socket.on('conversation_updated', (data: { conversationId: string, lastMessage: any }) => {
      setConversations(prev => {
        const index = prev.findIndex(c => c.id === data.conversationId);
        if (index === -1) {
          loadConversations(true); // New conversation, refresh the entire list
          return prev;
        }

        const updated = { ...prev[index] };

        updated.lastMessage = data.lastMessage;
        updated.lastMessageAt = data.lastMessage.createdAt;
        
        // Only increment unread if NOT from me AND NOT currently open
        if (data.lastMessage.senderId !== user.id && data.conversationId !== selectedConvRef.current) {
          updated.unreadCount = (updated.unreadCount || 0) + 1;
        }

        const newList = [...prev];
        newList.splice(index, 1);
        return [updated, ...newList];
      });
    });

    socket.on('messages_read', (data: { conversationId: string, userId: string }) => {
      if (data.userId === user.id) {
        setConversations(prev => {
          return prev.map(c => {
            if (c.id === data.conversationId) {
              return { ...c, unreadCount: 0 };
            }
            return c;
          });
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, user?.id]);

  // Update Tab Badge
  useEffect(() => {
    const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
    navigation.setOptions({
      tabBarBadge: totalUnread > 0 ? totalUnread : null,
    });
    // Also update generic title badge if web?
    if (isWeb && totalUnread > 0) {
      document.title = `(${totalUnread}) Messages`;
    } else if (isWeb) {
      document.title = 'Messages';
    }
  }, [conversations, navigation, isWeb]);

  // Start conversation with user


  const handleConversationPress = (conversationId: string) => {
    if (isWeb && isDesktop) {
      // On desktop, show chat in split view
      setSelectedConversationId(conversationId);
    } else {
      // On mobile, navigate to chat page
      router.push(`/messages/${conversationId}` as any);
    }
  };

  // Start conversation with user
  const handleUserPress = async (userId: string) => {
    if (!accessToken) return;
    try {
      const conversation = await messagingService.getOrCreateDirectConversation(userId, accessToken);
      setSearchQuery('');
      setUserResults([]);
      handleConversationPress(conversation.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading && !refreshing) {
      loadConversations();
    }
  };

  // Render conversation list
  const renderConversationList = () => (
    <View style={[
      styles.listContainer,
      isWeb && isDesktop && styles.listContainerDesktop,
    ]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search users..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* User Search Results */}
      {searchQuery.trim() !== '' ? (
        searching ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color="#E8795A" />
          </View>
        ) : userResults.length > 0 ? (
          <FlatList
            data={userResults}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Pressable 
                style={styles.conversationItem}
                onPress={() => handleUserPress(item.id)}
              >
                <View style={styles.avatarContainer}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {item.name?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.conversationContent}>
                  <Text style={styles.conversationName}>{item.name || 'User'}</Text>
                  {item.bio && <Text style={styles.conversationPreview}>{item.bio}</Text>}
                </View>
              </Pressable>
            )}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          <View style={styles.centerContainer}>
            <Ionicons name="person-outline" size={48} color="#d4d4d4" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )
      ) : (
        <>
          {/* Friends Suggestions */}
          {friends.length > 0 && (
            <View style={styles.friendsSection}>
              <Text style={styles.sectionTitle}>Start a conversation</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={friends}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <Pressable 
                    style={styles.friendItem}
                    onPress={() => handleUserPress(item.id)}
                  >
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.friendAvatar} />
                    ) : (
                      <View style={[styles.friendAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.friendAvatarText}>
                          {item.name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.friendName} numberOfLines={1}>
                      {item.name?.split(' ')[0] || 'User'}
                    </Text>
                  </Pressable>
                )}
                contentContainerStyle={styles.friendsList}
              />
            </View>
          )}

          {/* Conversation List */}
          {loading && conversations.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#E8795A" />
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#d4d4d4" />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Search for users to start a conversation</Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <ConversationItem
                  conversation={item}
                  currentUserId={user?.id || ''}
                  onPress={() => handleConversationPress(item.id)}
                  isSelected={selectedConversationId === item.id}
                />
              )}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              refreshing={refreshing}
              onRefresh={() => loadConversations(true)}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </View>
  );

  // Render chat view placeholder (for desktop split view)
  const renderChatView = () => {
    if (!selectedConversationId) {
      return (
        <View style={styles.chatPlaceholder}>
          <Ionicons name="chatbubble-ellipses-outline" size={80} color="#e5e5e5" />
          <Text style={styles.chatPlaceholderText}>
            Select a conversation to start messaging
          </Text>
        </View>
      );
    }

    // Embedded ChatView component
    return (
      <View style={styles.chatContainer}>
        <ChatView 
          conversationId={selectedConversationId} 
          onClose={() => setSelectedConversationId(null)}
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Header */}
      <PageHeader title='Messages' style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]} />

      {/* Content */}
      <View style={styles.content}>
        {isWeb && isDesktop ? (
          // Desktop: Split view
          <View style={styles.splitView}>
            <View style={[styles.listContainerDesktop, { borderRightColor: colors.border }]}>
             {renderConversationList()}
            </View>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
             {renderChatView()}
            </View>
          </View>
        ) : (
          // Mobile: List only
          <View style={{ flex: 1, backgroundColor: colors.background }}>
           {renderConversationList()}
          </View>
        )}
      </View>
    </View>
  );
}

// ===== STYLES =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#171717',
  },
  headerButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  splitView: {
    flex: 1,
    flexDirection: 'row',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContainerDesktop: {
    maxWidth: 360,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#e5e5e5',
  },
  searchContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 100,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f5f5f5',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8795A',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
    gap: 2,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#171717',
    flex: 1,
  },
  conversationTime: {
    fontSize: 12,
    color: '#737373',
    marginLeft: 8,
  },
  conversationPreview: {
    fontSize: 14,
    color: '#737373',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#737373',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 4,
    textAlign: 'center',
  },
  chatPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatPlaceholderText: {
    fontSize: 16,
    marginTop: 16,
  },
  chatContainer: {
    flex: 1,
  },
  chatViewContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  messagesContainer: {
    padding: 16,
    gap: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 2,
  },
  messageSent: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  messageReceived: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Friends suggestions
  friendsSection: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#737373',
    paddingHorizontal: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  friendsList: {
    paddingHorizontal: 12,
    gap: 4,
  },
  friendItem: {
    alignItems: 'center',
    width: 72,
    paddingHorizontal: 4,
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
  },
  friendAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  friendName: {
    fontSize: 12,
    color: '#171717',
    textAlign: 'center',
  },
});
