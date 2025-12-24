import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ActivityIndicator, 
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';
import { mediaService } from '@/services/media.service';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ImageWithMetadata {
  uri: string;
  caption?: string;
  sortOrder: number;
  mimeType?: string;
}

export default function CreatePostModal({ visible, onClose }: CreatePostModalProps) {
  const { user } = useAuth();
  const { createPost } = useSocial();
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('friends');
  const [images, setImages] = useState<ImageWithMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setContent('');
      setPrivacy('friends');
      setImages([]);
    }
  }, [visible]);

  const pickImage = async () => {
    if (images.length >= 10) {
      Alert.alert('Limit Reached', 'You can only add up to 10 images per post');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const remainingSlots = 10 - images.length;
      const assetsToAdd = result.assets.slice(0, remainingSlots);

      const newImages: ImageWithMetadata[] = assetsToAdd.map((asset, index) => ({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        sortOrder: images.length + index,
        caption: undefined,
      }));

      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    // Update sortOrder
    setImages(newImages.map((img, i) => ({ ...img, sortOrder: i })));
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) {
      Alert.alert('Error', 'Please add text or images');
      return;
    }

    if (content.length > 2000) {
      Alert.alert('Error', 'Content exceeds 2000 characters');
      return;
    }

    setSubmitting(true);
    try {
      let mediaIds: string[] = [];
      let mediaMetadata: Array<{ mediaId: string; caption?: string; sortOrder: number }> = [];

      if (images.length > 0) {
        setUploading(true);
        const uploadPromises = images.map(img =>
          mediaService.uploadMedia(img.uri, img.mimeType || 'image/jpeg')
        );
        const uploadedMedia = await Promise.all(uploadPromises);
        mediaIds = uploadedMedia.map(m => m.id);
        mediaMetadata = uploadedMedia.map((media, index) => ({
          mediaId: media.id,
          caption: images[index].caption,
          sortOrder: images[index].sortOrder,
        }));
        setUploading(false);
      }

      createPost(content, privacy, mediaIds, mediaMetadata).catch((err: any) => {
        console.error('Background create post failed', err);
      });

      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
      Alert.alert('Error', 'Failed to upload media');
      setUploading(false);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={Platform.OS !== 'web'}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Post</Text>
            <TouchableOpacity 
              onPress={handleSubmit} 
              disabled={submitting || uploading || (!content.trim() && images.length === 0)}
              style={styles.headerButton}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={[
                  styles.postButtonText, 
                  (!content.trim() && images.length === 0) && styles.disabled
                ]}>
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* User row */}
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Text>{user?.name?.[0] || 'U'}</Text>
              </View>
              <View>
                <Text style={styles.userName}>{user?.name || 'User'}</Text>
                <TouchableOpacity 
                  style={styles.privacySelector}
                  onPress={() => {
                    setPrivacy(prev => {
                      if (prev === 'friends') return 'public';
                      if (prev === 'public') return 'private';
                      return 'friends';
                    });
                  }}
                >
                  <Text style={styles.privacyText}>
                    {privacy === 'friends' ? '👥 Friends' : privacy === 'public' ? '🌍 Public' : '🔒 Private'} ▼
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Content Input */}
            <TextInput
              style={styles.input}
              multiline
              placeholder="What's on your mind?"
              placeholderTextColor="#999"
              value={content}
              onChangeText={setContent}
              maxLength={2000}
              autoFocus
            />
            <Text style={styles.charCount}>{content.length}/2000</Text>

            {/* Image previews */}
            {images.length > 0 && (
              <ScrollView horizontal style={styles.imageRow} showsHorizontalScrollIndicator={false}>
                {images.map((img, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: img.uri }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(index)}>
                      <Ionicons name="close-circle" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Add image button */}
            <TouchableOpacity style={styles.addMediaButton} onPress={pickImage}>
              <Ionicons name="images-outline" size={24} color="#007AFF" />
              <Text style={styles.addMediaText}>Add Images ({images.length}/10)</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Loading overlay */}
          {uploading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Uploading images...</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? 'rgba(0,0,0,0.5)' : '#fff',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-start',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
  },
  modalContent: {
    flex: Platform.OS === 'web' ? undefined : 1,
    backgroundColor: '#fff',
    borderRadius: Platform.OS === 'web' ? 16 : 0,
    width: Platform.OS === 'web' ? '90%' : '100%',
    maxWidth: Platform.OS === 'web' ? 600 : undefined,
    maxHeight: Platform.OS === 'web' ? '90%' : undefined,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  headerButton: {
    minWidth: 60,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  disabled: {
    opacity: 0.5,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  privacySelector: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  privacyText: {
    fontSize: 12,
    color: '#666',
  },
  input: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#000',
  },
  charCount: {
    textAlign: 'right',
    color: '#999',
    fontSize: 12,
    marginBottom: 16,
  },
  imageRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imageContainer: {
    marginRight: 10,
    position: 'relative',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginTop: 8,
  },
  addMediaText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
});
