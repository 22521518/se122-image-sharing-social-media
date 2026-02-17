import { Feeling } from '@/components/FeelingSelector';
import { Colors } from '@/constants/Colors';
import { usePlatform } from '@/hooks/usePlatform';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CreateMemoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { 
    title: string; 
    content: string; 
    feeling: Feeling;
    privacy: 'private' | 'friends' | 'public';
    type: 'text_only' | 'voice' | 'photo' | 'mixed';
    mediaUrl?: string;
    audioUrl?: string;
  }) => Promise<void> | void;
  initialData?: {
    title: string;
    content: string;
    feeling: Feeling;
  };
}

type PrivacyLevel = 'private' | 'friends' | 'public';
const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string; icon: string }[] = [
  { value: 'private', label: 'Only Me', icon: 'lock-closed' },
  { value: 'friends', label: 'Friends', icon: 'people' },
  { value: 'public', label: 'Public', icon: 'globe-outline' },
];

const FEELINGS: Feeling[] = ['JOY', 'CALM', 'ENERGETIC', 'INSPIRED', 'MELANCHOLY'];
const FEELING_EMOJIS: Record<Feeling, string> = {
  JOY: '😊',
  CALM: '😌',
  ENERGETIC: '⚡',
  INSPIRED: '✨',
  MELANCHOLY: '😢',
};

export function CreateMemoryModal({
  visible,
  onClose,
  onSubmit,
  initialData = { title: '', content: '', feeling: 'JOY' },
}: CreateMemoryModalProps) {
  const { isDesktop } = usePlatform();
  const screenHeight = Dimensions.get('window').height;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState(initialData.title);
  const [content, setContent] = useState(initialData.content);
  const [feeling, setFeeling] = useState<Feeling>(initialData.feeling);
  const [privacy, setPrivacy] = useState<PrivacyLevel>('private');
  
  // Media state
  const [image, setImage] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Update local state when initialData changes (or when modal opens)
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [durationLeft, setDurationLeft] = useState(5);
  const timerRef = React.useRef<any>(null);

  // Update local state when initialData changes (or when modal opens)
  React.useEffect(() => {
    if (visible) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setFeeling(initialData.feeling);
      setPrivacy('private'); // Reset to private on open
      // Reset media
      setImage(null);
      setAudioUri(null);
      setRecording(null);
      setIsRecording(false);
      setRecordingDuration(0);
      setDurationLeft(5);
    } else {
      // Cleanup on close
      cleanupAudio();
    }
    return () => {
      cleanupAudio();
    };
  }, [visible, initialData]);

  const cleanupAudio = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {
        // ignore
      }
    }
    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setDurationLeft(5);
  };

  // Image Picker Logic
  const pickImage = async () => {
    if (isRecording) return; // Block during recording
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, // Allow cropping on phones, maybe not needed on desktop but good for square aspect
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Audio Logic
  async function startRecording() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HighQuality
        );
        setRecording(recording);
        setIsRecording(true);
        setRecordingDuration(0);
        setDurationLeft(5);

        // Countdown Timer
        timerRef.current = setInterval(() => {
          setDurationLeft((prev) => {
            if (prev <= 1) {
              stopRecording();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  // Modified stopRecording to be used manually or by cleanup
  async function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!recording) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI(); 
      setRecording(null);
      if (uri) {
        setAudioUri(uri);
      }
    } catch (error) {
       console.error('Failed to stop recording', error);
    }
  }

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const determineMemoryType = (): 'text_only' | 'voice' | 'photo' | 'mixed' => {
    if (image && audioUri) return 'mixed';
    if (image) return 'photo';
    if (audioUri) return 'voice';
    return 'text_only';
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // If recording, stop it first
    if (isRecording && recording) {
        await stopRecording();
    }
    
    setIsSubmitting(true);
    try {
      // Re-check state after stop? audioUri needs to be grabbed. 
      // Actually, `stopRecording` sets `audioUri`. State update is async. 
      // Ideally we return the uri from stopRecording.
      
      // Let's refactor stopRecording to return URI
      let finalAudioUri = audioUri;
      if (isRecording && recording) {
          try {
              await recording.stopAndUnloadAsync();
              finalAudioUri = recording.getURI();
              setRecording(null);
              setIsRecording(false);
              if (finalAudioUri) setAudioUri(finalAudioUri);
          } catch (e) {}
      }
  
      const type = image && finalAudioUri ? 'mixed' : (image ? 'photo' : (finalAudioUri ? 'voice' : 'text_only'));
      
      await onSubmit({ 
        title, 
        content, 
        feeling, 
        privacy,
        type,
        mediaUrl: image || undefined,
        audioUrl: finalAudioUri || undefined,
      });
    } catch (error) {
      console.error('Submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Create a Memory</Text>
        <Pressable onPress={onClose} disabled={isRecording}>
          <Ionicons name="close" size={24} color={isRecording ? "#a3a3a3" : "#171717"} />
        </Pressable>
      </View>

      <ScrollView style={styles.formScroll}>
        {/* Title */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={[styles.input, isRecording && styles.disabledInput]}
            placeholder="What's this memory about?"
            placeholderTextColor="#a3a3a3"
            value={title}
            onChangeText={setTitle}
            editable={!isRecording}
          />
        </View>

        {/* Content */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Content</Text>
          <TextInput
            style={[styles.input, styles.textArea, isRecording && styles.disabledInput]}
            placeholder="Describe your memory..."
            placeholderTextColor="#a3a3a3"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={!isRecording}
          />
        </View>

        {/* Media Attachments */}
        <View style={styles.formGroup}>
           <Text style={styles.label}>Attachments</Text>
           <View style={styles.mediaButtons}>
             {/* Photo Button */}
             <Pressable 
                style={[styles.mediaButton, isRecording && styles.disabledButton]} 
                onPress={pickImage}
                disabled={isRecording}
             >
               <Ionicons name="image-outline" size={24} color={isRecording ? "#a3a3a3" : Colors.light.primary} />
               <Text style={[styles.mediaButtonText, isRecording && styles.disabledText]}>Add Photo</Text>
             </Pressable>

             {/* Voice Button */}
             <Pressable 
                style={[styles.mediaButton, isRecording && styles.mediaButtonRecording]} 
                onPress={handleToggleRecording}
             >
               <Ionicons name={isRecording ? "stop-circle-outline" : "mic-outline"} size={24} color={isRecording ? "#ef4444" : Colors.light.primary} />
               <Text style={[styles.mediaButtonText, isRecording && styles.textRed]}>
                 {isRecording ? `Stop (${durationLeft}s)` : "Record Voice"}
               </Text>
             </Pressable>
           </View>

           {/* Previews */}
           <View style={styles.previewsContainer}>
              {image && (
                <View style={styles.previewItem}>
                  <Image source={{ uri: image }} style={styles.imagePreview} />
                  <Pressable 
                    style={styles.removeMediaButton} 
                    onPress={() => !isRecording && setImage(null)}
                    disabled={isRecording}
                  >
                    <Ionicons name="close-circle" size={20} color={isRecording ? "#a3a3a3" : "#ef4444"} />
                  </Pressable>
                </View>
              )}
              {audioUri && !isRecording && (
                <View style={styles.previewItem}>
                  <View style={styles.audioPreview}>
                    <Ionicons name="musical-note" size={20} color={Colors.light.primary} />
                    <Text style={styles.audioText}>Voice Note Recorded</Text>
                  </View>
                   <Pressable style={styles.removeMediaButton} onPress={() => setAudioUri(null)}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </Pressable>
                </View>
              )}
           </View>
        </View>

        {/* Feeling Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Feeling</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.feelingSelector}
            scrollEnabled={!isRecording}
          >
            {FEELINGS.map((f) => (
              <Pressable
                key={f}
                style={[
                  styles.feelingOption,
                  feeling === f && styles.feelingOptionActive,
                  isRecording && styles.disabledButton
                ]}
                onPress={() => !isRecording && setFeeling(f)}
                disabled={isRecording}
              >
                <Text style={styles.feelingEmoji}>{FEELING_EMOJIS[f]}</Text>
                <Text
                  style={[
                    styles.feelingLabel,
                    feeling === f && styles.feelingLabelActive,
                    isRecording && styles.disabledText
                  ]}
                >
                  {f.charAt(0) + f.slice(1).toLowerCase()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Privacy Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Privacy</Text>
          <View style={styles.privacySelector}>
            {PRIVACY_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.privacyOption,
                  privacy === option.value && styles.privacyOptionActive,
                  isRecording && styles.disabledButton
                ]}
                onPress={() => !isRecording && setPrivacy(option.value)}
                disabled={isRecording}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={18} 
                  color={privacy === option.value ? Colors.light.primary : '#737373'} 
                />
                <Text
                  style={[
                    styles.privacyLabel,
                    privacy === option.value && styles.privacyLabelActive,
                    isRecording && styles.disabledText
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
            style={[styles.submitButton, (isRecording || isSubmitting) && styles.disabledButton]} 
            onPress={handleSubmit}
            disabled={isRecording || isSubmitting}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isSubmitting ? (
             <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.submitButtonText, (isRecording || isSubmitting) && styles.disabledText]}>
               {isRecording ? "Finish Recording..." : "Create Memory"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const isWindowsOrMac = Platform.OS === 'windows' || Platform.OS === 'macos';
  const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';
  const showDesktopModal = isDesktop || isWindowsOrMac;

  return (
    <Modal
      visible={visible}
      transparent={showDesktopModal || !isNativeMobile}
      animationType={showDesktopModal ? 'fade' : 'slide'}
      presentationStyle={isNativeMobile ? 'pageSheet' : 'overFullScreen'}
      onRequestClose={onClose}
    >
      {showDesktopModal ? (
        <View style={styles.desktopOverlay}>
          <Pressable style={styles.desktopBackdrop} onPress={onClose} />
          <View style={[styles.desktopContainer, { maxHeight: screenHeight * 0.8, maxWidth: 500 }]}>
            {renderContent()}
          </View>
        </View>
      ) : isNativeMobile ? (
        // Native mobile: pageSheet handles safe areas, simpler structure
        <SafeAreaView style={styles.nativeMobileContainer}>
          {renderContent()}
        </SafeAreaView>
      ) : (
        // Mobile web: bottom sheet style with overlay
        <Pressable style={styles.mobileOverlay} onPress={onClose}>
            <Pressable style={styles.mobileContent} onPress={(e) => e.stopPropagation()}>
                {renderContent()}
            </Pressable>
        </Pressable>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
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
    paddingVertical: 16,
  },
  // Mobile Styles
  mobileOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
  },
  mobileContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  nativeMobileContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // Common Form Styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#171717',
  },
  formScroll: {
    paddingHorizontal: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
    marginBottom: 8,
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
    height: 80,
    textAlignVertical: 'top',
  },
  feelingSelector: {
    flexDirection: 'row',
  },
  feelingOption: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  feelingOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: Colors.light.primary,
  },
  feelingEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  feelingLabel: {
    fontSize: 12,
    color: '#737373',
  },
  feelingLabelActive: {
    color: Colors.light.primary,
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  mediaButtonRecording: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.primary,
  },
  textRed: {
    color: '#ef4444',
  },
  previewsContainer: {
    marginTop: 12,
    gap: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  previewItem: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  imagePreview: {
    width: 80,
    height: 80,
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    height: 48,
  },
  audioText: {
    fontSize: 12,
    color: '#171717',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#a3a3a3',
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
    borderColor: '#e5e5e5',
  },
  disabledText: {
    color: '#a3a3a3',
  },
  privacySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  privacyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  privacyOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: Colors.light.primary,
  },
  privacyLabel: {
    fontSize: 12,
    color: '#737373',
    fontWeight: '500',
  },
  privacyLabelActive: {
    color: Colors.light.primary,
  },
});
