import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Memory } from '@/context/MemoriesContext';
import { LikeButton } from '@/components/social/LikeButton';
import { CommentList } from '@/components/social/CommentList';
import { CommentInput } from '@/components/social/CommentInput';
import { DoubleTapLike } from '@/components/social/DoubleTapLike';
import { useAuth } from '@/context/AuthContext';
import { socialService } from '@/services/social.service';
import { useAudioPlayer } from 'expo-audio';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MemoryDetailModalProps {
  visible: boolean;
  memory: Memory | null;
  onClose: () => void;
  onLoginRequired?: () => void;
  autoPlay?: boolean;
}

export function MemoryDetailModal({
  visible,
  memory,
  onClose,
  onLoginRequired,
  autoPlay = false,
}: MemoryDetailModalProps) {
  const { isAuthenticated, accessToken, user } = useAuth();
  const [commentCount, setCommentCount] = useState(memory?.commentCount || 0);
  const [likeCount, setLikeCount] = useState(memory?.likeCount || 0);
  const [liked, setLiked] = useState(memory?.liked || false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [commentListKey, setCommentListKey] = useState(0);

  // Audio player for voice memories
  const audioUrl = memory?.type === 'voice' && memory?.mediaUrl ? memory.mediaUrl : undefined;
  const audioPlayer = useAudioPlayer(audioUrl);

  // Stop audio when modal closes
  useEffect(() => {
    if (!visible && audioPlayer) {
      audioPlayer.pause();
      setIsPlaying(false);
    }
  }, [visible, audioPlayer]);

  // Auto-play audio if requested
  useEffect(() => {
    if (visible && autoPlay && audioPlayer && memory?.type === 'voice') {
      audioPlayer.play();
      setIsPlaying(true);
    }
  }, [visible, autoPlay, audioPlayer, memory]);

  useEffect(() => {
    if (memory) {
      setCommentCount(memory.commentCount);
      setLikeCount(memory.likeCount);
      setLiked(memory.liked || false);
    }
  }, [memory]);

  // IMPORTANT: All useCallback hooks MUST be before any early returns (Rules of Hooks)
  
  // DoubleTapLike handler - trigger like action
  const handleDoubleTapLike = useCallback(async () => {
    if (!memory) return; // Guard inside callback instead
    if (!isAuthenticated || !accessToken) {
      onLoginRequired?.();
      return;
    }
    if (liked) return; // Already liked, no action needed
    
    try {
      const response = await socialService.toggleLikeMemory(memory.id, accessToken);
      setLiked(response.liked);
      setLikeCount(response.likeCount);
    } catch (error) {
      console.error('Failed to like memory:', error);
    }
  }, [memory, isAuthenticated, accessToken, liked, onLoginRequired]);

  // Audio playback toggle
  const handleToggleAudio = useCallback(() => {
    if (!audioPlayer) return;
    if (isPlaying) {
      audioPlayer.pause();
      setIsPlaying(false);
    } else {
      audioPlayer.play();
      setIsPlaying(true);
    }
  }, [audioPlayer, isPlaying]);

  // Handle close - stop audio first
  const handleClose = useCallback(() => {
    if (audioPlayer) {
      audioPlayer.pause();
      setIsPlaying(false);
    }
    onClose();
  }, [audioPlayer, onClose]);

  const handleLikeChange = useCallback((newLiked: boolean, newCount: number) => {
    setLiked(newLiked);
    setLikeCount(newCount);
  }, []);

  const handleCommentCountChange = useCallback((count: number) => {
    setCommentCount(count);
  }, []);

  const handleSubmitComment = useCallback(async (content: string) => {
    if (!accessToken || !memory) return;

    try {
      const response = await socialService.createCommentOnMemory(memory.id, content, accessToken);
      setCommentCount(response.commentCount);
      // Force CommentList to refresh by changing key
      setCommentListKey((prev) => prev + 1);
    } catch (error) {
       console.error("Failed to post comment", error);
    }
  }, [accessToken, memory]);

  // Early return AFTER all hooks
  if (!memory) return null;
  
  // Format date
  const dateStr = new Date(memory.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.modalBackground}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <ThemedText style={styles.headerTitle}>{memory.title || 'Memory'}</ThemedText>
              <View style={{ width: 40 }} /> 
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Creator Profile */}
              {memory.user && (
                <View style={styles.creatorSection}>
                  <View style={styles.creatorAvatar}>
                    {memory.user.avatarUrl ? (
                      <Image source={{ uri: memory.user.avatarUrl }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="person-circle" size={40} color="#ccc" />
                    )}
                  </View>
                  <ThemedText style={styles.creatorName}>
                    {memory.user.name || 'Anonymous'}
                  </ThemedText>
                </View>
              )}

              {/* Media Content with DoubleTapLike */}
              <DoubleTapLike onDoubleTap={handleDoubleTapLike} disabled={!isAuthenticated}>
                <View style={styles.mediaContainer}>
                  {memory.type === 'photo' && memory.mediaUrl ? (
                    <Image source={{ uri: memory.mediaUrl }} style={styles.photo} resizeMode="cover" />
                  ) : memory.type === 'voice' ? (
                    <View style={[styles.placeholder, { backgroundColor: '#333' }]}>
                      <TouchableOpacity onPress={handleToggleAudio} style={styles.audioPlayButton}>
                        <Ionicons 
                          name={isPlaying ? 'pause-circle' : 'play-circle'} 
                          size={64} 
                          color="#fff" 
                        />
                      </TouchableOpacity>
                      <ThemedText style={styles.audioLabel}>
                        {isPlaying ? 'Playing...' : 'Tap to play voice memory'}
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={[styles.placeholder, { backgroundColor: '#333' }]}>
                      <Ionicons name="text" size={48} color="#fff" />
                    </View>
                  )}
                  
                  {/* Overlay Metadata */}
                  <View style={styles.metaOverlay}>
                    <ThemedText style={styles.dateText}>{dateStr}</ThemedText>
                    <View style={styles.statsRow}>
                      <Ionicons name="heart" size={16} color="#fff" />
                      <ThemedText style={styles.statText}>{likeCount}</ThemedText>
                      <View style={{ width: 12 }} />
                      <Ionicons name="chatbubble" size={16} color="#fff" />
                      <ThemedText style={styles.statText}>{commentCount}</ThemedText>
                    </View>
                  </View>
                </View>
              </DoubleTapLike>

              {/* Interactions */}
              <View style={styles.interactionSection}>
                 <LikeButton 
                   itemId={memory.id} 
                   targetType="memory"
                   initialLiked={liked} 
                   initialCount={likeCount}
                   isAuthenticated={isAuthenticated}
                   accessToken={accessToken || undefined}
                   onLikeChange={handleLikeChange}
                   onLoginRequired={onLoginRequired}
                   size="large"
                   showCount
                   style={styles.likeBtn}
                 />
                 
                 <View style={styles.divider} />
                 
                 <ThemedText style={styles.commentsTitle}>Comments</ThemedText>
                 <CommentList
                   key={commentListKey}
                   itemId={memory.id}
                   targetType="memory"
                   accessToken={accessToken || undefined}
                   isAuthenticated={isAuthenticated}
                   onLoginRequired={onLoginRequired}
                   onCommentCountChange={handleCommentCountChange}
                 />
              </View>
            </ScrollView>

            <View style={styles.inputContainer}>
              <CommentInput 
                onSubmit={handleSubmitComment}
                isAuthenticated={isAuthenticated}
                onLoginRequired={onLoginRequired}
                placeholder="Add a comment..." 
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalBackground: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
    marginBottom: 0,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.3)', // Fallback
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dateText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  interactionSection: {
    backgroundColor: '#fff', // Light theme for comments section? Or dark? Let's go with white for now or card-like.
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20, // Overlap
    padding: 24,
    minHeight: 400,
  },
  likeBtn: {
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  // Creator profile styles
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'transparent',
  },
  creatorAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Audio player styles
  audioPlayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  audioLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
});
