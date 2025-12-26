import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { 
  moderationService, 
  TargetType, 
  ReportReason 
} from '@/services/moderation.service';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: TargetType;
  targetId: string;
  /** Optional: show "Block User" option */
  showBlockOption?: boolean;
}

interface ReasonOption {
  value: ReportReason;
  label: string;
  icon: string;
  description: string;
}

const REASON_OPTIONS: ReasonOption[] = [
  {
    value: 'SPAM',
    label: 'Spam',
    icon: 'mail-unread-outline',
    description: 'Unwanted promotional content or repetitive posts',
  },
  {
    value: 'HARASSMENT',
    label: 'Harassment',
    icon: 'warning-outline',
    description: 'Bullying, threats, or targeted attacks',
  },
  {
    value: 'INAPPROPRIATE',
    label: 'Inappropriate Content',
    icon: 'eye-off-outline',
    description: 'Nudity, violence, or harmful content',
  },
  {
    value: 'OTHER',
    label: 'Other',
    icon: 'ellipsis-horizontal-outline',
    description: 'Something else not listed above',
  },
];

export default function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  showBlockOption = true,
}: ReportModalProps) {
  const { accessToken } = useAuth();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [blockUser, setBlockUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const resetForm = () => {
    setSelectedReason(null);
    setDescription('');
    setBlockUser(false);
    setSubmitting(false);
    setSubmitted(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }

    setSubmitting(true);
    try {
      await moderationService.createReport(
        {
          targetType,
          targetId,
          reason: selectedReason,
          description: description.trim() || undefined,
          blockUser: showBlockOption ? blockUser : undefined,
        },
        accessToken,
      );

      // AC 4: Show success confirmation
      setSubmitted(true);
    } catch (error: any) {
      // AC 6: Handle duplicate report
      if (error.message?.includes('already reported')) {
        Alert.alert(
          'Already Reported',
          'You have already reported this content. Our moderators will review it.',
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to submit report');
      }
      setSubmitting(false);
    }
  };

  const getTargetLabel = () => {
    switch (targetType) {
      case 'POST':
        return 'post';
      case 'COMMENT':
        return 'comment';
      case 'USER':
        return 'account';
      default:
        return 'content';
    }
  };

  // Success screen (AC 4)
  if (submitted) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#34C759" />
              </View>
              <Text style={styles.successTitle}>Thank you for reporting</Text>
              <Text style={styles.successDescription}>
                Our moderators will review this {getTargetLabel()} and take action if it
                violates our community standards.
              </Text>
              {blockUser && (
                <Text style={styles.blockNote}>
                  You will no longer see content from this user.
                </Text>
              )}
              <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Report {getTargetLabel()}</Text>
            <View style={styles.closeButton} />
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Subtitle */}
            <Text style={styles.subtitle}>
              Why are you reporting this {getTargetLabel()}?
            </Text>

            {/* Reason options (AC 2) */}
            <View style={styles.reasonList}>
              {REASON_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={StyleSheet.flatten([
                    styles.reasonOption,
                    selectedReason === option.value && styles.reasonOptionSelected,
                  ])}
                  onPress={() => setSelectedReason(option.value)}
                >
                  <View style={styles.reasonIcon}>
                    <Ionicons
                      name={option.icon as any}
                      size={24}
                      color={selectedReason === option.value ? '#007AFF' : '#666'}
                    />
                  </View>
                  <View style={styles.reasonContent}>
                    <Text
                      style={StyleSheet.flatten([
                        styles.reasonLabel,
                        selectedReason === option.value && styles.reasonLabelSelected,
                      ])}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.reasonDescription}>{option.description}</Text>
                  </View>
                  {selectedReason === option.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Optional description field */}
            <Text style={styles.sectionLabel}>Additional details (optional)</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Tell us more about this issue..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>

            {/* Block user option (AC 5) */}
            {showBlockOption && targetType !== 'USER' && (
              <TouchableOpacity
                style={styles.blockOption}
                onPress={() => setBlockUser(!blockUser)}
              >
                <View style={styles.checkbox}>
                  {blockUser && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.blockLabel}>
                  Also block this user
                </Text>
              </TouchableOpacity>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={StyleSheet.flatten([styles.submitButton, !selectedReason && styles.submitButtonDisabled])}
              onPress={handleSubmit}
              disabled={!selectedReason || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  reasonList: {
    marginBottom: 24,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reasonContent: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  reasonLabelSelected: {
    color: '#007AFF',
  },
  reasonDescription: {
    fontSize: 13,
    color: '#666',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  descriptionInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#000',
  },
  charCount: {
    textAlign: 'right',
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  blockOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  blockLabel: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Success screen styles
  successContainer: {
    padding: 40,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  successDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  blockNote: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
