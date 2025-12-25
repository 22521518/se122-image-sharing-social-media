import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useSocial } from '../../context/SocialContext';
import { socialService } from '../../services/social.service';
import { mediaService, Media } from '../../services/media.service';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageGalleryEditor, { ImageWithMetadata } from '../../components/social/ImageGalleryEditor';

export default function CreatePostScreen() {
  const router = useRouter();
  const { accessToken: token, user } = useAuth();
  const { createPost } = useSocial();
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('friends');
  const [images, setImages] = useState<ImageWithMetadata[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const DRAFT_KEY = `post_draft_${user?.id}`;

  useEffect(() => {
    loadDraft();
    const interval = setInterval(saveDraft, 30000); // 30s auto-save
    return () => clearInterval(interval);
  }, []);

  const loadDraft = async () => {
    try {
      const savedDraft = await AsyncStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const { content: savedContent, privacy: savedPrivacy } = JSON.parse(savedDraft);
        if (savedContent) setContent(savedContent);
        if (savedPrivacy) setPrivacy(savedPrivacy);
      }
    } catch (e) {
      console.log('Failed to load draft');
    }
  };

  const saveDraft = async () => {
    try {
      if (!content && images.length === 0) return;
      await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ content, privacy }));
    } catch (e) {
      console.log('Failed to save draft');
    }
  };

  const clearDraft = async () => {
    await AsyncStorage.removeItem(DRAFT_KEY);
  };

  const pickImage = async () => {
    // AC 2: Validate max 10 images client-side
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
      
      if (result.assets.length > remainingSlots) {
        Alert.alert('Limit Reached', `Only ${remainingSlots} image(s) can be added`);
      }

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
    setImages(newImages);
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
      
      // Upload images with metadata
      let mediaMetadata: Array<{ mediaId: string; caption?: string; sortOrder: number }> = [];
      
      if (images.length > 0) {
        setUploading(true);
        const uploadPromises = images.map(img => 
          mediaService.uploadMedia(img.uri, img.mimeType || 'image/jpeg', token)
        );
        const uploadedMedia = await Promise.all(uploadPromises);
        mediaIds = uploadedMedia.map(m => m.id);
        
        // AC 5: Build metadata with caption and sortOrder
        mediaMetadata = uploadedMedia.map((media, index) => ({
          mediaId: media.id,
          caption: images[index].caption,
          sortOrder: images[index].sortOrder,
        }));
        
        setUploading(false);
      }

      // Optimistic creation via Context with mediaMetadata
      createPost(content, privacy, mediaIds, mediaMetadata).catch((err: any) => {
        console.error("Background create post failed", err);
      });

      await clearDraft();
      router.back();
    } catch (error) {
      console.error('Failed to create post:', error);
      Alert.alert('Error', 'Failed to upload media');
      setUploading(false);
      setSubmitting(false);
    } 
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={submitting || uploading}>
          {submitting ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={[styles.postButton, (!content.trim() && images.length === 0) && styles.disabled]}>Post</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.userRow}>
          {/* Avatar placeholder or user avatar if available */}
          <View style={styles.avatar}>
             <Text>{user?.name?.[0] || 'U'}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <TouchableOpacity 
              style={styles.privacySelector} 
              onPress={() => {
                // Cycle through: friends -> public -> private -> friends
                setPrivacy(prev => {
                  if (prev === 'friends') return 'public';
                  if (prev === 'public') return 'private';
                  return 'friends';
                });
              }}
            >
              <Text style={styles.privacyText}>
                {privacy === 'friends' ? 'Friends' : privacy === 'public' ? 'Public' : 'Private'} ▼
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Input Area with Hashtag Highlighting */}
        <View style={styles.inputContainer}>
          <Text style={[styles.input, styles.overlayText]} suppressHighlighting>
             {content.split(/(#\w+)/).map((part, index) => {
               if (part.match(/^#\w+$/)) {
                 return <Text key={index} style={styles.hashtag}>{part}</Text>;
               }
               return <Text key={index}>{part}</Text>;
             })}
          </Text>
          <TextInput
            style={[styles.input, styles.transparentInput]}
            multiline
            placeholder="What's on your mind?"
            placeholderTextColor="#999"
            value={content}
            onChangeText={setContent}
            maxLength={2000}
          />
        </View>
        <Text style={styles.charCount}>{content.length}/2000</Text>

        {/* AC 3: Image Gallery with Drag/Drop and Caption Editing */}
        <ImageGalleryEditor
          images={images}
          onImagesChange={setImages}
          onRemoveImage={removeImage}
          maxImages={10}
        />

        <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
          <Ionicons name="images-outline" size={24} color="#007AFF" />
          <Text style={styles.addImageText}>Add Image ({images.length}/10)</Text>
        </TouchableOpacity>
      </ScrollView>

      {uploading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Uploading media...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelText: {
    fontSize: 16,
    color: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  postButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
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
    alignSelf: 'flex-start',
  },
  privacyText: {
    fontSize: 12,
    color: '#666',
  },
  inputContainer: {
    minHeight: 100,
    position: 'relative',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    textAlignVertical: 'top',
    paddingTop: 0, 
    paddingBottom: 0,
    color: '#000',
  },
  overlayText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    color: 'transparent', 
  },
  transparentInput: {
    color: 'transparent',
  },
  hashtag: {
    color: '#007AFF',
    fontWeight: '600',
  },
  charCount: {
    textAlign: 'right',
    color: '#999',
    fontSize: 12,
    marginBottom: 10,
  },
  mediaRow: {
    flexDirection: 'row',
    marginTop: 10,
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
    top: -5,
    right: -5,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  addImageText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
  },
  loadingText: {
    color: '#fff',
  },
});
