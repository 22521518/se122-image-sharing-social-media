import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { socialService } from '@/services/social.service';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

interface EditPostModalProps {
  visible: boolean;
  postId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function EditPostModal({ visible, postId, onClose, onUpdated }: EditPostModalProps) {
  const { accessToken } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState('friends');

  useEffect(() => {
    if (visible && postId && accessToken) {
      loadPost();
    }
  }, [visible, postId, accessToken]);

  const loadPost = async () => {
    if (!postId || !accessToken) return;
    setIsLoading(true);
    try {
      const post = await socialService.getPost(postId, accessToken);
      setContent(post.content);
      setPrivacy(post.privacy);
    } catch (e) {
      Alert.alert("Error", "Failed to load post");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim() || !postId || !accessToken) return;
    setIsSaving(true);
    try {
      await socialService.updatePost(postId, { content, privacy }, accessToken);
      Alert.alert("Success", "Post updated");
      onUpdated?.();
      onClose();
    } catch (e) {
      Alert.alert("Error", "Failed to update post");
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <View style={[styles.modalContent, isWeb && styles.webModalContent]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </Pressable>
        <Text style={styles.title}>Edit Post</Text>
        <Pressable 
          onPress={handleSave} 
          disabled={isSaving || !content.trim()} 
          style={[styles.saveButton, (isSaving || !content.trim()) && styles.saveButtonDisabled]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </Pressable>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      ) : (
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={styles.input}
            multiline
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Privacy</Text>
          <View style={styles.privacyOptions}>
            {['public', 'friends', 'private'].map(p => (
              <Pressable
                key={p}
                onPress={() => setPrivacy(p)}
                style={[styles.privacyOption, privacy === p && styles.privacyOptionActive]}
              >
                <Ionicons
                  name={p === 'public' ? 'globe-outline' : p === 'friends' ? 'people-outline' : 'lock-closed-outline'}
                  size={18}
                  color={privacy === p ? '#fff' : '#666'}
                />
                <Text style={[styles.privacyText, privacy === p && styles.privacyTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType={isWeb ? "fade" : "slide"}
      transparent={isWeb}
      onRequestClose={onClose}
    >
      {isWeb ? (
        <View style={styles.webOverlay}>
          <Pressable style={styles.webBackdrop} onPress={onClose} />
          {modalContent}
        </View>
      ) : (
        <View style={styles.mobileContainer}>
          {modalContent}
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  mobileContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  webOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: Colors.light.background,
    overflow: 'hidden',
  },
  webModalContent: {
    flexGrow: 0,
    flexShrink: 1,
    maxWidth: 550,
    width: '90%',
    borderRadius: 16,
    maxHeight: '85%',
    minHeight: 400,
    backgroundColor: Colors.light.background,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
      },
      default: {
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 14,
    borderRadius: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#000',
    marginBottom: 20,
  },
  privacyOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  privacyOptionActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  privacyText: {
    color: '#666',
    fontWeight: '500',
  },
  privacyTextActive: {
    color: '#fff',
  },
});
