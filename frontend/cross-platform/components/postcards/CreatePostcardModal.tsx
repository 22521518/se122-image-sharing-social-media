import { MapComponent } from '@/components/map/MapComponent';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import type { MapRegion } from '@/hooks/useMapViewport';
import { usePlatform } from '@/hooks/usePlatform';
import { friendshipService, type FriendInfo } from '@/services/friendship.service';
import type { CreatePostcardRequest, RecipientType, UnlockType } from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from './DateTimePicker';

interface CreatePostcardModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePostcardRequest) => void;
}

export function CreatePostcardModal({ visible, onClose, onSubmit }: CreatePostcardModalProps) {
  const { user, accessToken } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [recipientType, setRecipientType] = useState<RecipientType>('SELF');
  const [unlockType, setUnlockType] = useState<UnlockType>('DATE');
  const [message, setMessage] = useState('');
  // Initialize date to today
  const [unlockDate, setUnlockDate] = useState(() => new Date());
  const [unlockPlace, setUnlockPlace] = useState('');
  const [manualPinLocation, setManualPinLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const regionRef = React.useRef<MapRegion>({
    latitude: 10.7769,
    longitude: 106.7009,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Friend picker state
  const [friendsList, setFriendsList] = useState<FriendInfo[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendInfo | null>(null);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [showFriendPicker, setShowFriendPicker] = useState(false);

  // Fetch friends list when modal opens and user selects FRIEND
  useEffect(() => {
    if (visible && recipientType === 'FRIEND' && accessToken && friendsList.length === 0) {
      fetchFriends();
    }
  }, [visible, recipientType, accessToken]);

  const fetchFriends = async () => {
    if (!accessToken) return;
    setIsLoadingFriends(true);
    try {
      const list = await friendshipService.getFriends(accessToken);
      setFriendsList(list);
    } catch (error) {
      console.error('Failed to fetch friends list:', error);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as 2 | 3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2);
    }
  };

  const handleSubmit = () => {
    // Get recipientId based on type
    let recipientId = user?.id || '';
    if (recipientType === 'FRIEND' && selectedFriend) {
      recipientId = selectedFriend.id;
    }

    const data: CreatePostcardRequest = {
      recipientId,
      recipientType,
      message: message || undefined,
      imageUrl: imagePreview || undefined,
      unlockType,
      ...(unlockType === 'DATE' && { unlockDate: unlockDate.toISOString() }),
      ...(unlockType === 'LOCATION' && {
        unlockPlace: unlockPlace,
        unlockLatitude: unlockPlace.includes(',') ? parseFloat(unlockPlace.split(',')[0]) : 0,
        unlockLongitude: unlockPlace.includes(',') ? parseFloat(unlockPlace.split(',')[1]) : 0,
      }),
    };
    onSubmit(data);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setStep(1);
    setRecipientType('SELF');
    setUnlockType('DATE');
    setMessage('');
    // Reset date to today
    setUnlockDate(new Date());
    setUnlockPlace('');
    setManualPinLocation(null);
    setImagePreview(null);
    setSelectedFriend(null);
  };

  const handleImageSelect = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImagePreview(result.assets[0].uri);
    }
  };

  const canProceed = () => {
    if (step === 1) {
      // Must select a friend if sending to friend
      if (recipientType === 'FRIEND' && !selectedFriend) return false;
      return true;
    }
    if (step === 2) {
      if (unlockType === 'DATE') return !!unlockDate;
      if (unlockType === 'LOCATION') return !!unlockPlace;
    }
    return true;
  };

  const { isDesktop } = usePlatform();
  const screenHeight = Dimensions.get('window').height;

  // ... existing hooks ...

  const renderImageSection = () => (
    <View style={isDesktop ? styles.desktopImageSection : styles.imagePreviewContainer}>
      {imagePreview ? (
        <View style={styles.imagePreviewWrapper}>
          <Image source={{ uri: imagePreview }} style={styles.imagePreview} resizeMode="cover" />
          <Pressable style={styles.removeImageButton} onPress={() => setImagePreview(null)}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={isDesktop ? styles.desktopAddImageButton : styles.addImageButton}
          onPress={handleImageSelect}
        >
          <Ionicons name="image-outline" size={isDesktop ? 48 : 32} color="#737373" />
          <Text style={styles.addImageText}>Add a photo (optional)</Text>
        </Pressable>
      )}
    </View>
  );

  const renderFormContent = () => (
    <View style={styles.formContentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose}>
          <Ionicons name="close" size={24} color="#171717" />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Create Postcard</Text>
          <Text style={styles.stepIndicator}>Step {step} of 3</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.progressBar, s <= step && styles.progressBarActive]} />
        ))}
      </View>

      <ScrollView style={styles.content}>
        {/* Step 1: Recipient */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepDescription}>Who is this postcard for?</Text>
            <View style={styles.optionsGrid}>
              <Pressable
                onPress={() => setRecipientType('SELF')}
                style={[styles.optionCard, recipientType === 'SELF' && styles.optionCardActive]}
              >
                <View
                  style={[styles.optionIcon, recipientType === 'SELF' && styles.optionIconActive]}
                >
                  <Ionicons
                    name="person"
                    size={24}
                    color={recipientType === 'SELF' ? Colors.light.primary : '#737373'}
                  />
                </View>
                <Text style={styles.optionTitle}>Future Me</Text>
                <Text style={styles.optionSubtitle}>Send to yourself</Text>
              </Pressable>

              <Pressable
                onPress={() => setRecipientType('FRIEND')}
                style={[styles.optionCard, recipientType === 'FRIEND' && styles.optionCardActive]}
              >
                <View
                  style={[styles.optionIcon, recipientType === 'FRIEND' && styles.optionIconActive]}
                >
                  <Ionicons
                    name="people"
                    size={24}
                    color={recipientType === 'FRIEND' ? Colors.light.primary : '#737373'}
                  />
                </View>
                <Text style={styles.optionTitle}>A Friend</Text>
                <Text style={styles.optionSubtitle}>Send to someone</Text>
              </Pressable>
            </View>

            {/* Show friend picker when FRIEND is selected */}
            {recipientType === 'FRIEND' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select a Friend</Text>
                {isLoadingFriends ? (
                  <ActivityIndicator size="small" color={Colors.light.primary} />
                ) : friendsList.length === 0 ? (
                  <Text style={styles.hint}>
                    Bạn chưa có bạn bè nào. Hãy kết bạn để gửi postcard cho họ!
                  </Text>
                ) : (
                  <View style={{ maxHeight: 200 }}>
                    <FlatList
                      data={friendsList}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <Pressable
                          style={[
                            styles.friendItem,
                            selectedFriend?.id === item.id && styles.friendItemSelected,
                          ]}
                          onPress={() => setSelectedFriend(item)}
                        >
                          {item.avatarUrl ? (
                            <Image source={{ uri: item.avatarUrl }} style={styles.friendAvatar} />
                          ) : (
                            <View
                              style={[
                                styles.friendAvatar,
                                {
                                  backgroundColor: '#e5e5e5',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                },
                              ]}
                            >
                              <Ionicons name="person" size={16} color="#737373" />
                            </View>
                          )}
                          <Text style={styles.friendName}>{item.name || 'Unknown User'}</Text>
                          {selectedFriend?.id === item.id && (
                            <Ionicons name="checkmark-circle" size={20} color={Colors.light.primary} />
                          )}
                        </Pressable>
                      )}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Step 2: Unlock Condition */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepDescription}>When should this postcard be unlocked?</Text>

            <View style={styles.optionsGrid}>
              <Pressable
                onPress={() => setUnlockType('DATE')}
                style={[styles.smallOptionCard, unlockType === 'DATE' && styles.optionCardActive]}
              >
                <Ionicons
                  name="calendar"
                  size={20}
                  color={unlockType === 'DATE' ? Colors.light.primary : '#737373'}
                />
                <Text
                  style={[styles.smallOptionTitle, unlockType === 'DATE' && { color: Colors.light.primary }]}
                >
                  On a Date
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setUnlockType('LOCATION')}
                style={[
                  styles.smallOptionCard,
                  unlockType === 'LOCATION' && styles.optionCardActive,
                ]}
              >
                <Ionicons
                  name="location"
                  size={20}
                  color={unlockType === 'LOCATION' ? Colors.light.primary : '#737373'}
                />
                <Text
                  style={[
                    styles.smallOptionTitle,
                    unlockType === 'LOCATION' && { color: Colors.light.primary },
                  ]}
                >
                  At a Place
                </Text>
              </Pressable>
            </View>

            {unlockType === 'DATE' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Unlock Date</Text>
                <DateTimePicker
                  value={unlockDate}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_event: unknown, date?: Date) => {
                    if (date) setUnlockDate(date);
                  }}
                />
                <Text style={styles.hint}>The postcard will be unlocked on this date</Text>
              </View>
            )}

            {unlockType === 'LOCATION' && (
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Pick a Location (Long press to pin)</Text>

                <View
                  style={{
                    height: 300,
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#e5e5e5',
                  }}
                >
                  <MapComponent
                    initialRegion={regionRef.current}
                    onRegionChangeComplete={(region) => {
                      regionRef.current = region;
                    }}
                    onLongPress={(coord) => {
                      setManualPinLocation(coord);
                      setUnlockPlace(`${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)}`);
                    }}
                    onMemoryPress={() => {}}
                    memories={[]}
                    manualPinLocation={manualPinLocation}
                    showTempPin={true}
                    isLoading={false}
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                <Text style={styles.label}>Selected Location</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#f5f5f5' }]}
                  placeholder="No location selected"
                  value={unlockPlace}
                  editable={false}
                />
                <Text style={styles.hint}>
                  The recipient will unlock this when they visit this location
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 3: Content */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepDescription}>What would you like to say?</Text>

            {/* Image - Only show here on mobile */}
            {!isDesktop &&
              (imagePreview ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
                  <Pressable style={styles.removeImageButton} onPress={() => setImagePreview(null)}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.addImageButton} onPress={handleImageSelect}>
                  <Ionicons name="image-outline" size={32} color="#737373" />
                  <Text style={styles.addImageText}>Add a photo (optional)</Text>
                </Pressable>
              ))}

            {/* Message */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write your message..."
                placeholderTextColor="#737373"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.footer}>
        {step > 1 && (
          <Pressable style={styles.secondaryButton} onPress={handleBack}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        )}
        {step < 3 ? (
          <Pressable
            style={[styles.primaryButton, !canProceed() && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!canProceed()}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryButton} onPress={handleSubmit}>
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Send Postcard</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const isWindowsOrMac = Platform.OS === 'windows' || Platform.OS === 'macos';
  // Show desktop modal style (centered card) if it's a desktop OS OR if we have enough width (e.g. iPad landscape or heavy web)
  const showDesktopModal = isDesktop || isWindowsOrMac;

  return (
    <Modal
      visible={visible}
      animationType={showDesktopModal ? 'fade' : 'slide'}
      presentationStyle={showDesktopModal ? 'overFullScreen' : 'pageSheet'}
      transparent={showDesktopModal}
      onRequestClose={onClose}
    >
      {showDesktopModal ? (
        <View style={styles.desktopOverlay}>
          {/* Center the modal using flexbox on the overlay */}
          <Pressable style={styles.desktopOverlayBackdrop} onPress={onClose} />
          <View 
            style={[
              styles.desktopModalContainer, 
              { 
                maxHeight: screenHeight * 0.85,
                // If we have desktop width, allow wider for split view. 
                // If we are on desktop OS but small window, constrain width to look like a phone-in-card.
                maxWidth: isDesktop ? 850 : 500,
                width: isDesktop ? '90%' : '100%',
              }
            ]}
          >
            {isDesktop ? (
               /* Split Layout for Wide Screens */
              <View style={styles.desktopSplitLayout}>
                {/* Left Side: Image */}
                <View style={styles.desktopLeftColumn}>{renderImageSection()}</View>

                {/* Right Side: Form */}
                <View style={styles.desktopRightColumn}>{renderFormContent()}</View>
              </View>
            ) : (
               /* Single Column for Narrow Desktop Screens */
               <View style={{ flex: 1 }}>
                  {renderFormContent()}
               </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.container}>{renderFormContent()}</View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Desktop Styles
  desktopOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  desktopModalContainer: {
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
    flexDirection: 'row',
  },
  desktopSplitLayout: {
    flex: 1,
    flexDirection: 'row',
    height: 600, // Fixed height or max height controlled by container
  },
  desktopLeftColumn: {
    width: '40%', // Or fixed width like 350
    backgroundColor: '#f9faFb',
    borderRightWidth: 1,
    borderRightColor: '#e5e5e5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  desktopRightColumn: {
    flex: 1,
    backgroundColor: '#fff',
  },
  desktopImageSection: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopAddImageButton: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#fff',
  },
  formContentContainer: {
    flex: 1,
  },
  // Existing Styles ...
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
  },
  stepIndicator: {
    fontSize: 12,
    color: '#737373',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e5e5',
  },
  progressBarActive: {
    backgroundColor: Colors.light.primary,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepContent: {
    gap: 16,
  },
  stepDescription: {
    fontSize: 14,
    color: '#737373',
  },
  optionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  optionCardActive: {
    borderColor: Colors.light.primary,
    backgroundColor: 'rgba(232, 121, 90, 0.05)',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  optionIconActive: {
    backgroundColor: 'rgba(232, 121, 90, 0.2)',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#737373',
  },
  smallOptionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e5e5',
  },
  smallOptionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  inputGroup: {
    gap: 8,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#171717',
  },
  textArea: {
    minHeight: 100,
  },
  hint: {
    fontSize: 12,
    color: '#737373',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateText: {
    fontSize: 14,
    color: '#171717',
  },
  imagePreviewContainer: {
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreviewWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    aspectRatio: 16 / 9,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addImageText: {
    fontSize: 14,
    color: '#737373',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#171717',
    fontWeight: '500',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Friend picker styles
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  friendItemSelected: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  friendName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
});
