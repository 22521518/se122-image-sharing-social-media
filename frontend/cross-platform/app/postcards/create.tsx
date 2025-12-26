import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import postcardsService, { CreatePostcardData } from '../../services/postcards.service';
import * as ImagePicker from 'expo-image-picker';
import { mediaService } from '../../services/media.service';
import { socialService, UserSearchResult } from '../../services/social.service';

type UnlockType = 'date' | 'location';

export default function PostcardComposerScreen() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  
  // Form state
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  
  // Recipient selection
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState<string>('Yourself');
  const [showFriendPicker, setShowFriendPicker] = useState(false);
  const [following, setFollowing] = useState<UserSearchResult[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  
  // Unlock condition
  const [unlockType, setUnlockType] = useState<UnlockType>('date');
  
  // Date picker (simplified - using days from now)
  const [daysFromNow, setDaysFromNow] = useState(30);
  
  // Location picker
  const [unlockLatitude, setUnlockLatitude] = useState<number | null>(null);
  const [unlockLongitude, setUnlockLongitude] = useState<number | null>(null);
  const [unlockRadius, setUnlockRadius] = useState(50);
  
  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Load following list when friend picker is opened
  useEffect(() => {
    if (showFriendPicker && following.length === 0 && !isLoadingFriends) {
      loadFollowing();
    }
  }, [showFriendPicker]);

  const loadFollowing = async () => {
    try {
      setIsLoadingFriends(true);
      if (!accessToken) return;
      const users = await socialService.getFollowing(accessToken);
      setFollowing(users);
    } catch (error) {
      Alert.alert('Error', 'Failed to load friends list');
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const getUnlockDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  };

  const handleSelectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        await uploadImage(result.assets[0].uri, result.assets[0].mimeType || 'image/jpeg');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const uploadImage = async (uri: string, mimeType: string) => {
    try {
      setIsUploading(true);
      const media = await mediaService.uploadMedia(uri, mimeType, accessToken);
      setMediaUrl(media.url);
    } catch (error) {
      Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
      setSelectedImage(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    // For MVP: Use a placeholder location - in production, use expo-location
    Alert.alert(
      'Location Selection',
      'Select an unlock location for your postcard.',
      [
        {
          text: 'Ho Chi Minh City',
          onPress: () => {
            setUnlockLatitude(10.7769);
            setUnlockLongitude(106.7009);
          },
        },
        {
          text: 'Hanoi',
          onPress: () => {
            setUnlockLatitude(21.0285);
            setUnlockLongitude(105.8542);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const validateForm = (): boolean => {
    if (!message && !mediaUrl) {
      Alert.alert('Error', 'Please add a message or image to your postcard');
      return false;
    }

    if (unlockType === 'location') {
      if (unlockLatitude === null || unlockLongitude === null) {
        Alert.alert('Error', 'Please select an unlock location');
        return false;
      }
    }

    return true;
  };

  const handleSend = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const data: CreatePostcardData = {
        message: message || undefined,
        mediaUrl: mediaUrl || undefined,
        recipientId: recipientId || undefined, // null = self
      };

      if (unlockType === 'date') {
        data.unlockDate = getUnlockDate().toISOString();
      } else {
        data.unlockLatitude = unlockLatitude!;
        data.unlockLongitude = unlockLongitude!;
        data.unlockRadius = unlockRadius;
      }

      await postcardsService.createPostcard(data, accessToken);

      Alert.alert(
        '🎉 Postcard Sent!',
        `Your postcard to ${recipientName} has been locked and will be delivered ${
          unlockType === 'date' 
            ? `in ${daysFromNow} days` 
            : 'when they arrive at the location'
        }.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send postcard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setIsSubmitting(true);

      const data: CreatePostcardData = {
        message: message || undefined,
        mediaUrl: mediaUrl || undefined,
      };

      if (unlockType === 'date') {
        data.unlockDate = getUnlockDate().toISOString();
      } else if (unlockLatitude !== null && unlockLongitude !== null) {
        data.unlockLatitude = unlockLatitude;
        data.unlockLongitude = unlockLongitude;
        data.unlockRadius = unlockRadius;
      }

      await postcardsService.saveDraft(data, accessToken);
      Alert.alert('Draft Saved', 'Your postcard draft has been saved.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectFriend = (friend: UserSearchResult) => {
    setRecipientId(friend.id);
    setRecipientName(friend.name || 'Friend');
    setShowFriendPicker(false);
  };

  const handleSelectSelf = () => {
    setRecipientId(null);
    setRecipientName('Yourself');
    setShowFriendPicker(false);
  };

  // Friend Picker Modal
  const renderFriendPicker = () => {
    if (!showFriendPicker) return null;

    return (
      <Modal
        visible={showFriendPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFriendPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.friendPickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Recipient</Text>
              <TouchableOpacity onPress={() => setShowFriendPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Self option */}
            <TouchableOpacity
              style={StyleSheet.flatten([styles.friendItem, !recipientId && styles.friendItemSelected])}
              onPress={handleSelectSelf}
            >
              <View style={styles.friendAvatar}>
                {(user as any)?.avatarUrl ? (
                  <Image source={{ uri: (user as any).avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={24} color="#999" />
                )}
              </View>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{user?.name || 'You'} (Self)</Text>
                <Text style={styles.friendBio}>Send to your future self</Text>
              </View>
              {!recipientId && (
                <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            {isLoadingFriends ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading friends...</Text>
              </View>
            ) : following.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No friends yet</Text>
                <Text style={styles.emptySubtext}>Follow users to send them postcards!</Text>
              </View>
            ) : (
              <FlatList
                data={following}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={StyleSheet.flatten([styles.friendItem, recipientId === item.id && styles.friendItemSelected])}
                    onPress={() => handleSelectFriend(item)}
                  >
                    <View style={styles.friendAvatar}>
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                      ) : (
                        <Ionicons name="person" size={24} color="#999" />
                      )}
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{item.name || 'Anonymous'}</Text>
                      {item.bio && <Text style={styles.friendBio}>{item.bio}</Text>}
                    </View>
                    {recipientId === item.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // Preview Modal
  const renderPreview = () => {
    if (!showPreview) return null;

    return (
      <View style={styles.previewOverlay}>
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>📬 Locked Postcard</Text>
          <Text style={styles.previewSubtitle}>
            This is what you will see before unlock:
          </Text>
          
          <View style={styles.lockedContent}>
            <Ionicons name="lock-closed" size={48} color="#666" />
            <Text style={styles.lockedText}>
              {unlockType === 'date' 
                ? `Opens on ${getUnlockDate().toLocaleDateString()}`
                : 'Opens when you arrive at the location'
              }
            </Text>
          </View>
          
          <Text style={styles.previewNote}>
            From: {user?.name || 'You'}
          </Text>
          
          <TouchableOpacity
            style={styles.previewCloseButton}
            onPress={() => setShowPreview(false)}
          >
            <Text style={styles.previewCloseText}>Close Preview</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Postcard</Text>
        <TouchableOpacity onPress={handleSaveDraft} disabled={isSubmitting}>
          <Text style={styles.draftButton}>Save Draft</Text>
        </TouchableOpacity>
      </View>

      {/* Image Selection */}
      <TouchableOpacity style={styles.imageSection} onPress={handleSelectImage}>
        {selectedImage ? (
          <View style={styles.imagePreview}>
            <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={48} color="#999" />
            <Text style={styles.imagePlaceholderText}>Add a photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Message Input */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Message to Your Future Self</Text>
        <TextInput
          style={styles.messageInput}
          placeholder="Write a message for when you open this postcard..."
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
        />
        <Text style={styles.charCount}>{message.length}/1000</Text>
      </View>

      {/* Unlock Type Toggle */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Unlock When</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={StyleSheet.flatten([styles.toggleButton, unlockType === 'date' && styles.toggleActive])}
            onPress={() => setUnlockType('date')}
          >
            <Ionicons 
              name="calendar" 
              size={20} 
              color={unlockType === 'date' ? '#fff' : '#666'} 
            />
            <Text style={StyleSheet.flatten([styles.toggleText, unlockType === 'date' && styles.toggleTextActive])}>
              By Date
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={StyleSheet.flatten([styles.toggleButton, unlockType === 'location' && styles.toggleActive])}
            onPress={() => setUnlockType('location')}
          >
            <Ionicons 
              name="location" 
              size={20} 
              color={unlockType === 'location' ? '#fff' : '#666'} 
            />
            <Text style={StyleSheet.flatten([styles.toggleText, unlockType === 'location' && styles.toggleTextActive])}>
              By Location
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker (Simplified) */}
      {unlockType === 'date' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Opens in how many days?</Text>
          <View style={styles.daysContainer}>
            {[7, 30, 90, 180, 365].map(days => (
              <TouchableOpacity
                key={days}
                style={StyleSheet.flatten([styles.daysButton, daysFromNow === days && styles.daysButtonActive])}
                onPress={() => setDaysFromNow(days)}
              >
                <Text style={StyleSheet.flatten([styles.daysButtonText, daysFromNow === days && styles.daysButtonTextActive])}>
                  {days < 30 ? `${days}d` : days < 365 ? `${days / 30}mo` : '1yr'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.datePreview}>
            Opens on: {getUnlockDate().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      )}

      {/* Location Picker */}
      {unlockType === 'location' && (
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={handleUseCurrentLocation}
          >
            <Ionicons name="navigate" size={24} color="#007AFF" />
            <Text style={styles.locationText}>
              {unlockLatitude !== null 
                ? `📍 Location Selected`
                : 'Select unlock location'
              }
            </Text>
          </TouchableOpacity>
          
          <View style={styles.radiusContainer}>
            <Text style={styles.radiusLabel}>Unlock radius: {unlockRadius}m</Text>
            <View style={styles.radiusButtons}>
              {[50, 100, 200, 500].map(r => (
                <TouchableOpacity
                  key={r}
                  style={StyleSheet.flatten([styles.radiusButton, unlockRadius === r && styles.radiusButtonActive])}
                  onPress={() => setUnlockRadius(r)}
                >
                  <Text style={StyleSheet.flatten([styles.radiusButtonText, unlockRadius === r && styles.radiusButtonTextActive])}>
                    {r}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Recipient Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Send To</Text>
        <TouchableOpacity
          style={styles.recipientSelector}
          onPress={() => setShowFriendPicker(true)}
        >
          <Ionicons name="person" size={20} color="#007AFF" />
          <Text style={styles.recipientText}>{recipientName}</Text>
          <Ionicons name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.previewButton}
          onPress={() => setShowPreview(true)}
        >
          <Ionicons name="eye-outline" size={20} color="#007AFF" />
          <Text style={styles.previewButtonText}>Preview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={StyleSheet.flatten([styles.sendButton, isSubmitting && styles.sendButtonDisabled])}
          onPress={handleSend}
          disabled={isSubmitting || isUploading}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>Send Postcard</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {renderFriendPicker()}
      {renderPreview()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  draftButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  imageSection: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    minHeight: 200,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#999',
    fontSize: 16,
  },
  imagePreview: {
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  messageInput: {
    minHeight: 100,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    color: '#999',
    fontSize: 12,
    marginTop: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  daysButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  daysButtonActive: {
    backgroundColor: '#007AFF',
  },
  daysButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  daysButtonTextActive: {
    color: '#fff',
  },
  datePreview: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
  },
  radiusContainer: {
    marginTop: 16,
  },
  radiusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  radiusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  radiusButtonActive: {
    backgroundColor: '#007AFF',
  },
  radiusButtonText: {
    fontSize: 14,
    color: '#666',
  },
  radiusButtonTextActive: {
    color: '#fff',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    margin: 16,
    marginBottom: 32,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  previewButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 32,
    width: '85%',
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  lockedContent: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
  },
  lockedText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  previewNote: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
  previewCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  previewCloseText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Friend Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  friendPickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendItemSelected: {
    backgroundColor: '#f0f7ff',
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  friendBio: {
    fontSize: 13,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  recipientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  recipientText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});
