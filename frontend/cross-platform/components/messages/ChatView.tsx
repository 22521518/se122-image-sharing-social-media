/**
 * ChatView Component
 *
 * Full-featured chat view with:
 * - Infinite scroll (load older messages on scroll up)
 * - Image sending
 * - Voice recording
 * - Message search
 * - Media gallery
 */

import { API_BASE_URL } from '@/services/api.service';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { io, Socket } from 'socket.io-client';

import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/hooks/usePlatform';
import { mediaService } from '@/services/media.service';
import {
    Conversation,
    ConversationParticipant,
    Message,
    messagingService,
    SharedMediaItem,
} from '@/services/messaging.service';

interface ChatViewProps {
  conversationId: string;
  onClose?: () => void;
  onBack?: () => void;
  showHeader?: boolean;
}

type TabType = 'chat' | 'media' | 'search';

export function ChatView({ conversationId, onClose, onBack, showHeader = true }: ChatViewProps) {
  const { isWeb } = usePlatform();
  const socketRef = useRef<Socket | null>(null);

  /* useEffect moved down */
  // Force light theme for consistency
  const colors = Colors['light'];
  const { accessToken, user } = useAuth();

  // Web file input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  // Real-time Update Logic
  useEffect(() => {
    if (!accessToken || !user?.id) return;

    const baseUrl = API_BASE_URL.replace(/\/$/, '');
    const socket = io(`${baseUrl}/messages`, {
      auth: { userId: user.id },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket /messages connected');
      socket.emit('join_conversation', conversationId);
    });

    socket.on('new_message', (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [message, ...prev];
        });

        // Scroll to bottom
        setTimeout(scrollToBottom, 50);

        // Auto mark as read if from other user
        if (message.senderId !== user?.id) {
          messagingService
            .markAsRead(conversationId, accessToken)
            .catch((err) => console.error('Failed to mark as read:', err));
        }
      }
    });

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.disconnect();
    };
  }, [conversationId, accessToken, user?.id]);

  // Mark as read when entering conversation
  useEffect(() => {
    if (conversationId && accessToken) {
      messagingService
        .markAsRead(conversationId, accessToken)
        .catch((err) => console.error('Failed to mark initial read:', err));
    }
  }, [conversationId, accessToken]);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [seenMap, setSeenMap] = useState<Record<string, ConversationParticipant[]>>({});

  // Calculate seen status
  useEffect(() => {
    if (!conversation?.participants || messages.length === 0) return;

    const newSeenMap: Record<string, ConversationParticipant[]> = {};
    const otherParticipants = conversation.participants.filter((p) => p.userId !== user?.id);

    otherParticipants.forEach((p) => {
      if (!p.lastReadAt) return;
      const readTime = new Date(p.lastReadAt).getTime();

      // Find the latest message that is <= readTime (messages are inverted, so first match is latest)
      const seenMsg = messages.find((m) => new Date(m.createdAt).getTime() <= readTime);

      if (seenMsg) {
        if (!newSeenMap[seenMsg.id]) newSeenMap[seenMsg.id] = [];
        newSeenMap[seenMsg.id].push(p);
      }
    });
    setSeenMap(newSeenMap);
  }, [messages, conversation?.participants, user?.id]);
  const [sending, setSending] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  // Media gallery state
  const [sharedMedia, setSharedMedia] = useState<SharedMediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searching, setSearching] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Image preview state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioSound, setAudioSound] = useState<Audio.Sound | null>(null);

  // FlatList ref for scrolling
  const flatListRef = useRef<FlatList>(null);

  // Load initial chat data
  useEffect(() => {
    loadChat();
    return () => {
      // Cleanup recording on unmount
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      // Cleanup audio playback on unmount
      if (audioSound) {
        audioSound.unloadAsync();
      }
    };
  }, [conversationId]);

  const loadChat = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [convData, msgData] = await Promise.all([
        messagingService.getConversation(conversationId, accessToken),
        messagingService.getMessages(conversationId, accessToken),
      ]);
      setConversation(convData);
      setMessages(msgData.messages);
      setCursor(msgData.nextCursor);
      setHasMore(msgData.hasMore);
    } catch (error) {
      console.error('Failed to load chat:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load older messages (infinite scroll)
  const loadMoreMessages = useCallback(async () => {
    if (!accessToken || !hasMore || loadingMore || !cursor) return;

    setLoadingMore(true);
    try {
      const response = await messagingService.getMessages(conversationId, accessToken, cursor);
      setMessages((prev) => [...prev, ...response.messages]);
      setCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [accessToken, conversationId, cursor, hasMore, loadingMore]);

  // Send text message
  const handleSend = async () => {
    if (!inputText.trim() || !accessToken || sending || !user?.id) return;

    setSending(true);
    const content = inputText.trim();

    // Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      conversationId,
      content,
      type: 'TEXT',
      senderId: user.id,
      createdAt: new Date().toISOString(),
      status: 'sending',
      media: [],
      isEdited: false,
    };

    setMessages((prev) => [tempMessage, ...prev]);
    setInputText('');
    scrollToBottom();

    try {
      const newMessage = await messagingService.sendMessage(
        conversationId,
        { content, type: 'TEXT' },
        accessToken,
      );

      // Replace temp message with real one
      setMessages((prev) => {
        // Check if socket already added this message (Race Condition Fix)
        const exists = prev.some((m) => m.id === newMessage.id);
        if (exists) {
          // Socket beat us to it, just remove the temp message
          return prev.filter((m) => m.id !== tempId);
        }
        // Normal case: replace temp with real
        return prev.map((m) => (m.id === tempId ? { ...newMessage, status: 'sent' } : m));
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Mark failed
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
    } finally {
      setSending(false);
    }
  };

  // Pick and send image
  const handlePickImage = async () => {
    if (!accessToken) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets[0]) return;

    setSending(true);
    try {
      // Upload image first
      const asset = result.assets[0];
      const uploadResult = await mediaService.uploadImage(asset.uri, accessToken, asset.mimeType);

      // Send message with media
      const newMessage = await messagingService.sendMessage(
        conversationId,
        {
          type: 'IMAGE',
          mediaIds: [uploadResult.id],
        },
        accessToken,
      );
      setMessages((prev) => {
        // Check if socket already added this message
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [newMessage, ...prev];
      });
    } catch (error) {
      console.error('Failed to send image:', error);
    } finally {
      setSending(false);
    }
  };

  // Pick and send document/file (Web only - using native file input)
  const handlePickDocument = () => {
    if (!accessToken || !user?.id) return;

    if (Platform.OS === 'web' && fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      // For native platforms, show alert that feature requires installation
      console.log('File picker not available on this platform');
    }
  };

  // Handle web file input change
  const handleWebFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!accessToken || !event.target.files?.[0]) return;

    const file = event.target.files[0];
    setSending(true);

    try {
      // Create a blob URL for upload
      const blobUrl = URL.createObjectURL(file);
      const uploadResult = await mediaService.uploadFile(blobUrl, accessToken, file.type);

      const newMessage = await messagingService.sendMessage(
        conversationId,
        {
          type: 'FILE',
          mediaIds: [uploadResult.id],
        },
        accessToken,
      );
      setMessages((prev) => {
        // Check if socket already added this message
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [newMessage, ...prev];
      });
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to send file:', error);
    } finally {
      setSending(false);
      // Reset input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Start voice recording
  const handleStartRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        console.log('Permission to access microphone denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  // Stop recording and send
  const handleStopRecording = async () => {
    if (!recording || !accessToken) return;

    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    setIsRecording(false);
    setSending(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) return;

      // Upload audio
      const uploadResult = await mediaService.uploadAudio(uri, accessToken);

      // Send message with audio
      const newMessage = await messagingService.sendMessage(
        conversationId,
        {
          type: 'AUDIO',
          mediaIds: [uploadResult.id],
        },
        accessToken,
      );
      setMessages((prev) => {
        // Check if socket already added this message
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [newMessage, ...prev];
      });
    } catch (error) {
      console.error('Failed to send voice message:', error);
    } finally {
      setSending(false);
      setRecordingDuration(0);
    }
  };

  // Cancel recording
  const handleCancelRecording = async () => {
    if (!recording) return;

    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    try {
      await recording.stopAndUnloadAsync();
    } catch (e) {}

    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
  };

  // Load shared media
  const loadSharedMedia = async () => {
    if (!accessToken) return;
    setMediaLoading(true);
    try {
      const response = await messagingService.getSharedMedia(conversationId, accessToken);
      setSharedMedia(response.media);
    } catch (error) {
      console.error('Failed to load shared media:', error);
    } finally {
      setMediaLoading(false);
    }
  };

  // Search messages
  const handleSearch = async () => {
    if (!accessToken || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await messagingService.searchMessages(
        searchQuery,
        accessToken,
        conversationId,
      );
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search messages:', error);
    } finally {
      setSearching(false);
    }
  };

  // Play/stop audio message
  const handlePlayAudio = async (mediaId: string, url: string) => {
    try {
      // If this audio is already playing, stop it
      if (playingAudioId === mediaId && audioSound) {
        await audioSound.stopAsync();
        await audioSound.unloadAsync();
        setAudioSound(null);
        setPlayingAudioId(null);
        return;
      }

      // Stop any currently playing audio
      if (audioSound) {
        await audioSound.stopAsync();
        await audioSound.unloadAsync();
        setAudioSound(null);
        setPlayingAudioId(null);
      }

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      // Load and play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      
      setAudioSound(sound);
      setPlayingAudioId(mediaId);

      // Handle playback completion
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          setAudioSound(null);
          setPlayingAudioId(null);
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      setPlayingAudioId(null);
    }
  };

  // Jump to a specific message from search results
  const jumpToMessage = (messageId: string) => {
    // Find the message index in the main messages list
    const messageIndex = messages.findIndex(m => m.id === messageId);
    
    if (messageIndex !== -1) {
      // Switch to chat tab but keep search state
      setActiveTab('chat');
      setHighlightedMessageId(messageId);
      
      // Scroll to the message (FlatList is inverted, so we need to scroll to offset)
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index: messageIndex,
            animated: true,
            viewPosition: 0.5, // Center the message
          });
        }
      }, 100);
      
      // Clear highlight after 2 seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    }
  };

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get display name for header
  const otherParticipant = conversation?.participants.find((p) => p.userId !== user?.id);
  const displayName = conversation?.isGroup
    ? conversation.name || 'Group Chat'
    : otherParticipant?.user.name || 'Chat';

  // Render message item
  const renderMessage = ({ item }: { item: Message }) => {
    const isSent = item.senderId === user?.id;
    const seenBy = seenMap[item.id] || [];
    const isHighlighted = highlightedMessageId === item.id;

    return (
      <View style={[styles.messageRow, isHighlighted && styles.messageHighlighted]}>
        <View
          style={[
            styles.messageBubble,
            isSent ? styles.messageSent : styles.messageReceived,
            { backgroundColor: isSent ? colors.primary : colors.card },
          ]}
        >
          {/* Media content */}
          {item.media && item.media.length > 0 && (
            <View style={styles.mediaContainer}>
              {item.media.map((media) =>
                media.type === 'image' ? (
                  <Pressable
                    key={media.id}
                    onPress={() => {
                      setSelectedImage(media.url);
                      setImagePreviewVisible(true);
                    }}
                  >
                    <Image
                      source={{ uri: media.url }}
                      style={styles.messageImage}
                      resizeMode="cover"
                    />
                  </Pressable>
                ) : media.type === 'audio' || media.type === 'video' || media.mimeType?.startsWith('audio/') ? (
                  <Pressable
                    key={media.id}
                    style={styles.audioMessage}
                    onPress={() => handlePlayAudio(media.id, media.url)}
                  >
                    <Ionicons
                      name={playingAudioId === media.id ? 'stop-circle' : 'play-circle'}
                      size={32}
                      color={isSent ? '#fff' : colors.primary}
                    />
                    <Text style={[styles.audioDuration, { color: isSent ? '#fff' : colors.text }]}>
                      {media.duration ? formatDuration(Math.floor(media.duration)) : '0:00'}
                    </Text>
                  </Pressable>
                ) : media.type === 'file' ? (
                  <View key={media.id} style={styles.fileMessage}>
                    <Ionicons
                      name="document-outline"
                      size={28}
                      color={isSent ? '#fff' : colors.primary}
                    />
                    <Text
                      style={[styles.fileName, { color: isSent ? '#fff' : colors.text }]}
                      numberOfLines={1}
                    >
                      {media.fileName || 'File'}
                    </Text>
                  </View>
                ) : null,
              )}
            </View>
          )}

          {/* Text content */}
          {item.content && (
            <Text style={[styles.messageText, { color: isSent ? '#fff' : colors.text }]}>
              {item.content}
            </Text>
          )}

          {/* Time */}
          <Text
            style={[
              styles.messageTime,
              { color: isSent ? 'rgba(255,255,255,0.7)' : colors.textSecondary },
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Status & Seen Avatars */}
        {isSent && (
          <View style={styles.statusWrapper}>
            {item.status === 'sending' && <Text style={styles.statusText}>Sending</Text>}
            {item.status === 'sent' && seenBy.length === 0 && (
              <Text style={styles.statusText}>Sent</Text>
            )}
            {seenBy.length > 0 && (
              <View style={styles.seenContainer}>
                {seenBy.map((p) =>
                  p.user.avatarUrl ? (
                    <Image
                      key={p.id}
                      source={{ uri: p.user.avatarUrl }}
                      style={styles.seenAvatar}
                    />
                  ) : (
                    <View key={p.id} style={[styles.seenAvatar, { backgroundColor: '#ccc' }]} />
                  ),
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render search result item (list format with jump action)
  const renderSearchResultItem = ({ item }: { item: Message }) => {
    const isSent = item.senderId === user?.id;
    const senderName = isSent ? 'You' : item.sender?.name || 'Unknown';
    const avatarUrl = item.sender?.avatarUrl;
    
    // Preview Text logic
    const previewText = item.content || (item.media?.length ? (
        item.media[0].type === 'image' ? '📷 Photo' : 
        item.media[0].type === 'audio' ? '🎤 Voice message' : 
        item.media[0].type === 'video' ? '🎥 Video' : '📁 File'
    ) : '');
    
    // Time logic
    const formatTime = (dateStr: string) => {
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
        style={[styles.searchResultItem, { backgroundColor: colors.card }]}
        onPress={() => jumpToMessage(item.id)}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
            {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                    <Text style={styles.avatarText}>
                        {(senderName || '?').charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}
        </View>

        <View style={styles.searchResultContent}>
          <View style={styles.searchResultHeader}>
            <Text style={[styles.searchResultSender, { color: colors.text }]} numberOfLines={1}>
              {senderName}
            </Text>
            <Text style={[styles.searchResultTime, { color: colors.textSecondary }]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
          <Text 
            style={[styles.searchResultText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {previewText}
          </Text>
        </View>
      </Pressable>
    );
  };

  // Render media grid item
  const renderMediaItem = ({ item }: { item: SharedMediaItem }) => (
    <Pressable
      style={styles.mediaGridItem}
      onPress={() => {
        if (item.type === 'image') {
          setSelectedImage(item.url);
          setImagePreviewVisible(true);
        }
      }}
    >
      {item.type === 'image' ? (
        <Image source={{ uri: item.url }} style={styles.mediaGridImage} />
      ) : (
        <View style={[styles.audioGridItem, { backgroundColor: colors.primary }]}>
          <Ionicons name="mic" size={24} color="#fff" />
          <Text style={styles.audioGridDuration}>
            {item.duration ? formatDuration(Math.floor(item.duration)) : '0:00'}
          </Text>
        </View>
      )}
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      {showHeader && (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            {onBack && (
              <Pressable style={styles.headerButton} onPress={onBack}>
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </Pressable>
            )}
            <Text style={[styles.headerTitle, { color: colors.text }]}>{displayName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={styles.headerButton}
              onPress={() => {
                if (activeTab === 'search') {
                  setActiveTab('chat');
                } else {
                  setActiveTab('search');
                }
              }}
            >
              <Ionicons
                name={activeTab === 'search' ? 'chatbubbles' : 'search'}
                size={22}
                color={colors.primary}
              />
            </Pressable>
            <Pressable
              style={styles.headerButton}
              onPress={() => {
                if (activeTab === 'media') {
                  setActiveTab('chat');
                } else {
                  loadSharedMedia();
                  setActiveTab('media');
                }
              }}
            >
              <Ionicons
                name={activeTab === 'media' ? 'chatbubbles' : 'images'}
                size={22}
                color={colors.primary}
              />
            </Pressable>
            {onClose && (
              <Pressable style={styles.headerButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Content based on active tab */}
      {activeTab === 'chat' && (
        <>
          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            inverted
            renderItem={renderMessage}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator style={styles.loadingMore} color={colors.primary} />
              ) : null
            }
            contentContainerStyle={styles.messagesContainer}
          />

          {/* Input Area */}
          <View style={[styles.inputContainer, { borderTopColor: colors.border }]}>
            {isRecording ? (
              // Recording UI
              <View style={styles.recordingContainer}>
                <Pressable style={styles.cancelButton} onPress={handleCancelRecording}>
                  <Ionicons name="trash" size={24} color="#FF3B30" />
                </Pressable>
                <View style={styles.recordingInfo}>
                  <View style={[styles.recordingDot, { backgroundColor: '#FF3B30' }]} />
                  <Text style={styles.recordingText}>{formatDuration(recordingDuration)}</Text>
                </View>
                <Pressable
                  style={[styles.sendButton, { backgroundColor: colors.primary }]}
                  onPress={handleStopRecording}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                </Pressable>
              </View>
            ) : (
              // Normal input UI
              <View style={styles.inputRow}>
                <Pressable style={styles.inputButton} onPress={handlePickImage} disabled={sending}>
                  <Ionicons name="image-outline" size={24} color={colors.primary} />
                </Pressable>
                {/* <Pressable style={styles.inputButton} onPress={handlePickDocument} disabled={sending}>
                  <Ionicons name="attach-outline" size={24} color={colors.primary} />
                </Pressable> */}
                {/* Hidden file input for web */}
                {Platform.OS === 'web' && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleWebFileChange as any}
                    style={{ display: 'none' }}
                  />
                )}
                <Pressable
                  style={styles.inputButton}
                  onPress={handleStartRecording}
                  disabled={sending}
                >
                  <Ionicons name="mic-outline" size={24} color={colors.primary} />
                </Pressable>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.card,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Type a message..."
                  placeholderTextColor={colors.textSecondary}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={2000}
                  onKeyPress={(e: any) => {
                    // Send on Enter (without Shift) for Web/Desktop
                    if (isWeb && e.nativeEvent.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Pressable
                  style={[
                    styles.sendButton,
                    { backgroundColor: inputText.trim() ? colors.primary : colors.border },
                  ]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={20} color="#fff" />
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </>
      )}

      {activeTab === 'media' && (
        <View style={styles.mediaGallery}>
          {mediaLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : sharedMedia.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No shared media yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={sharedMedia}
              keyExtractor={(item) => item.id}
              numColumns={3}
              renderItem={renderMediaItem}
              contentContainerStyle={styles.mediaGridContainer}
            />
          )}
        </View>
      )}

      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search messages..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery !== '' && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {searching ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : searchResults.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? 'No messages found' : 'Enter a search term'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderSearchResultItem}
              contentContainerStyle={styles.searchResultsList}
              ItemSeparatorComponent={() => <View style={styles.searchResultDivider} />}
            />
          )}
        </View>
      )}

      {/* Image Preview Modal */}
      <Modal
        visible={imagePreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreviewVisible(false)}
      >
        <Pressable style={styles.imagePreviewOverlay} onPress={() => setImagePreviewVisible(false)}>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
    gap: 6,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingTop: 32, // Inverted: Visual Bottom (near input)
    paddingBottom: 16, // Inverted: Visual Top (near load more)
  },
  loadingMore: {
    paddingVertical: 16,
  },
  messageRow: {
    marginBottom: 8,
    width: '100%',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderRadius: 18,
    marginVertical: 2,
  },
  messageSent: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  messageReceived: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  mediaContainer: {
    marginBottom: 6,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  audioMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  audioDuration: {
    fontSize: 14,
  },
  fileMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  fileName: {
    fontSize: 14,
    flexShrink: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputButton: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  cancelButton: {
    padding: 8,
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  recordingText: {
    color: '#333',
    fontWeight: '600',
  },
  statusWrapper: {
    alignItems: 'flex-end',
    marginTop: 2,
    marginRight: 4,
    minHeight: 14,
  },
  statusText: {
    fontSize: 10,
    color: '#8e8e93',
  },
  seenContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  seenAvatar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: 2,
    borderWidth: 1,
    borderColor: '#fff',
  },
  mediaGallery: {
    flex: 1,
  },
  mediaGridContainer: {
    padding: 2,
  },
  mediaGridItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 2,
  },
  mediaGridImage: {
    flex: 1,
    borderRadius: 4,
  },
  audioGridItem: {
    flex: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioGridDuration: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  // Search Results Styles
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  searchResultContent: {
    flex: 1,
    gap: 4,
  },
  searchResultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultSender: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  searchResultTime: {
    fontSize: 12,
  },
  searchResultText: {
    fontSize: 14,
  },
  searchResultsList: {
    paddingVertical: 8,
  },
  searchResultDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#eee',
    marginLeft: 68, // Align with content (avatar width + gap + padding)
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8795A',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  messageHighlighted: {
    backgroundColor: 'rgba(232, 121, 90, 0.2)',
    borderRadius: 8,
    marginHorizontal: -8,
    paddingHorizontal: 8,
  },
});

export default ChatView;
