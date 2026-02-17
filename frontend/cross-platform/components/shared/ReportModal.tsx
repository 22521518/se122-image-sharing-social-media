import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useIsMobileView } from '@/hooks/usePlatform';
import { moderationService, ReportReason, TargetType } from '@/services/moderation.service';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
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
} from 'react-native';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  targetType: TargetType;
  targetId: string;
  /** Optional callback after successful report */
  onReported?: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; icon: string }[] = [
  { value: 'SPAM', label: 'Spam', icon: 'mail-unread-outline' },
  { value: 'HARASSMENT', label: 'Harassment', icon: 'warning-outline' },
  { value: 'INAPPROPRIATE', label: 'Inappropriate Content', icon: 'eye-off-outline' },
  { value: 'OTHER', label: 'Other', icon: 'help-circle-outline' },
];

export function ReportModal({
  visible,
  onClose,
  targetType,
  targetId,
  onReported,
}: ReportModalProps) {
  const { accessToken } = useAuth();
  const isMobile = useIsMobileView();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [blockUser, setBlockUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'reason' | 'details'>('reason');

  const getTargetLabel = () => {
    switch (targetType) {
      case 'POST':
        return 'post';
      case 'COMMENT':
        return 'comment';
      case 'USER':
        return 'user';
      case 'MEMORY':
        return 'memory';
      default:
        return 'content';
    }
  };

  const resetState = () => {
    setSelectedReason(null);
    setDescription('');
    setBlockUser(false);
    setStep('reason');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSelectReason = (reason: ReportReason) => {
    setSelectedReason(reason);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!selectedReason || !accessToken) return;

    setIsSubmitting(true);
    try {
      await moderationService.createReport(
        {
          targetType,
          targetId,
          reason: selectedReason,
          description: description.trim() || undefined,
          blockUser: targetType !== 'USER' ? blockUser : undefined,
        },
        accessToken,
      );

      // Show success message
      if (Platform.OS === 'web') {
        alert('Thank you for reporting. Our moderators will review this content.');
      } else {
        Alert.alert(
          'Report Submitted',
          'Thank you for reporting. Our moderators will review this content.',
          [{ text: 'OK' }],
        );
      }

      onReported?.();
      handleClose();
    } catch (error: any) {
      const statusCode = error?.response?.status || error?.status;
      const serverMessage = error?.response?.data?.message || error?.message;

      // Handle specific error cases
      let title = 'Error';
      let message = 'Failed to submit report. Please try again.';

      if (statusCode === 409) {
        // Already reported
        title = 'Already Reported';
        message = 'You have already reported this content. Our moderators will review it.';
      } else if (statusCode === 404) {
        // Content not found
        title = 'Content Not Found';
        message = 'This content may have been removed or is no longer available.';
      } else if (serverMessage) {
        message = serverMessage;
      }

      if (Platform.OS === 'web') {
        alert(`${title}: ${message}`);
      } else {
        Alert.alert(title, message, [{ text: 'OK' }]);
      }

      // Close modal for 409 since it's already reported
      if (statusCode === 409) {
        handleClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderReasonStep = () => (
    <>
      <Text style={styles.title}>Report {getTargetLabel()}</Text>
      <Text style={styles.subtitle}>Why are you reporting this {getTargetLabel()}?</Text>

      <View style={styles.reasonList}>
        {REPORT_REASONS.map((reason) => (
          <Pressable
            key={reason.value}
            style={styles.reasonItem}
            onPress={() => handleSelectReason(reason.value)}
          >
            <View style={styles.reasonLeft}>
              <Ionicons name={reason.icon as any} size={22} color="#171717" />
              <Text style={styles.reasonLabel}>{reason.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#a3a3a3" />
          </Pressable>
        ))}
      </View>
    </>
  );

  const renderDetailsStep = () => (
    <>
      <View style={styles.detailsHeader}>
        <Pressable style={styles.backButton} onPress={() => setStep('reason')}>
          <Ionicons name="arrow-back" size={22} color="#171717" />
        </Pressable>
        <Text style={styles.title}>Additional Details</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.selectedReasonBadge}>
        <Text style={styles.selectedReasonText}>
          {REPORT_REASONS.find((r) => r.value === selectedReason)?.label}
        </Text>
      </View>

      <Text style={styles.inputLabel}>Description (optional)</Text>
      <TextInput
        style={styles.textInput}
        placeholder={`Tell us more about why you're reporting this ${getTargetLabel()}...`}
        placeholderTextColor="#a3a3a3"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={500}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{description.length}/500</Text>

      {targetType !== 'USER' && (
        <Pressable style={styles.blockOption} onPress={() => setBlockUser(!blockUser)}>
          <Ionicons
            name={blockUser ? 'checkbox' : 'square-outline'}
            size={22}
            color={blockUser ? Colors.light.primary : '#737373'}
          />
          <Text style={styles.blockText}>Also block this user</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Report</Text>
        )}
      </Pressable>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isMobile ? 'slide' : 'fade'}
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, !isMobile && styles.overlayDesktop]}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.container, !isMobile && styles.containerDesktop]}>
          {isMobile && <View style={styles.handle} />}

          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#737373" />
          </Pressable>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {step === 'reason' ? renderReasonStep() : renderDetailsStep()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  containerDesktop: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    maxHeight: '70%',
    paddingTop: 8,
  },
  scrollContent: {
    flexGrow: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e5e5',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#171717',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#737373',
    textAlign: 'center',
    marginBottom: 24,
  },
  reasonList: {
    gap: 4,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  reasonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reasonLabel: {
    fontSize: 16,
    color: '#171717',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  selectedReasonBadge: {
    backgroundColor: Colors.light.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  selectedReasonText: {
    color: Colors.light.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#171717',
    minHeight: 100,
    maxHeight: 150,
  },
  charCount: {
    fontSize: 12,
    color: '#a3a3a3',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  blockOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    marginBottom: 16,
  },
  blockText: {
    fontSize: 14,
    color: '#171717',
  },
  submitButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
