import { UserAvatar } from '@/components/shared';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/hooks/usePlatform';
import type { PrivacyLevel } from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    content: string;
    imageUrls: string[];
    privacy: PrivacyLevel;
  }) => Promise<void>;
}

const privacyOptions = [
  { value: 'public' as const, label: 'Public', icon: 'globe-outline' as const },
  { value: 'friends' as const, label: 'Friends', icon: 'people-outline' as const },
  { value: 'private' as const, label: 'Only me', icon: 'lock-closed-outline' as const },
];

export function CreatePostModal({ visible, onClose, onSubmit }: CreatePostModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDesktop } = usePlatform();
  const screenHeight = Dimensions.get('window').height;
  
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyLevel>('public');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrivacyPicker, setShowPrivacyPicker] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ content: content.trim(), imageUrls: images, privacy });
      setContent('');
      setImages([]);
      setPrivacy('public');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageSelect = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const canSubmit = (content.trim() || images.length > 0) && !isSubmitting;
  const currentPrivacyOption = privacyOptions.find((o) => o.value === privacy) || privacyOptions[0];

  const renderContent = () => (
    <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color="#171717" />
          </Pressable>
          <Text style={styles.headerTitle}>Create Post</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[styles.shareButton, !canSubmit && styles.shareButtonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.shareButtonText}>Share</Text>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          {/* User info */}
          <View style={styles.userInfo}>
            <UserAvatar name={user?.email?.charAt(0).toUpperCase() || 'U'} size="md" />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{user?.email || 'User'}</Text>
              <Pressable
                style={styles.privacySelector}
                onPress={() => setShowPrivacyPicker(!showPrivacyPicker)}
              >
                <Ionicons name={currentPrivacyOption.icon} size={14} color="#737373" />
                <Text style={styles.privacyText}>{currentPrivacyOption.label}</Text>
                <Ionicons name="chevron-down" size={14} color="#737373" />
              </Pressable>
            </View>
          </View>

          {/* Privacy picker dropdown */}
          {showPrivacyPicker && (
            <View style={styles.privacyPicker}>
              {privacyOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.privacyOption,
                    privacy === option.value && styles.privacyOptionActive,
                  ]}
                  onPress={() => {
                    setPrivacy(option.value);
                    setShowPrivacyPicker(false);
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={16}
                    color={privacy === option.value ? Colors.light.primary : '#737373'}
                  />
                  <Text
                    style={[
                      styles.privacyOptionText,
                      privacy === option.value && styles.privacyOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Content */}
          <TextInput
            placeholder="What's on your mind?"
            placeholderTextColor="#737373"
            value={content}
            onChangeText={setContent}
            style={styles.textInput}
            multiline
            textAlignVertical="top"
          />

          {/* Image previews */}
          {images.length > 0 && (
            <View style={styles.imageGrid}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image source={{ uri }} style={styles.previewImage} />
                  <Pressable style={styles.removeImageButton} onPress={() => removeImage(index)}>
                    <Ionicons name="close" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Footer actions */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable style={styles.addPhotoButton} onPress={handleImageSelect}>
            <Ionicons name="image-outline" size={20} color={Colors.light.primary} />
            <Text style={styles.addPhotoText}>Photo</Text>
          </Pressable>
        </View>
      </View>
  );

  return (
    <Modal
      visible={visible}
      animationType={isDesktop ? "fade" : "slide"}
      presentationStyle={isDesktop ? "overFullScreen" : "pageSheet"}
      transparent={isDesktop}
      onRequestClose={onClose}
    >
      {isDesktop ? (
        <View style={styles.desktopOverlay}>
            <Pressable style={styles.desktopBackdrop} onPress={onClose} />
            <View style={[styles.desktopContainer, { maxHeight: screenHeight * 0.8 }]}>
                {renderContent()}
            </View>
        </View>
      ) : (
        <SafeAreaView style={styles.container}>
          {renderContent()}
        </SafeAreaView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Desktop Styles
  desktopOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  desktopContainer: {
    width: '90%',
    maxWidth: 600,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  // Existing Styles
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
  },
  shareButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  userDetails: {
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#171717',
  },
  privacySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privacyText: {
    fontSize: 12,
    color: '#737373',
  },
  privacyPicker: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  privacyOptionActive: {
    backgroundColor: '#e5e5e5',
  },
  privacyOptionText: {
    fontSize: 14,
    color: '#737373',
  },
  privacyOptionTextActive: {
    color: Colors.light.primary,
    fontWeight: '500',
  },
  textInput: {
    fontSize: 16,
    color: '#171717',
    minHeight: 120,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  imageContainer: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  addPhotoText: {
    fontSize: 14,
    color: Colors.light.primary,
  },
});
