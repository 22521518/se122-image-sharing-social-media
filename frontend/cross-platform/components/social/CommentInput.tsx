import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ViewStyle,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { ThemedText } from '../themed-text';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
  placeholder?: string;
  style?: ViewStyle;
  maxLength?: number;
}

export function CommentInput({
  onSubmit,
  isAuthenticated = true,
  onLoginRequired,
  placeholder = 'Add a comment...',
  style,
  maxLength = 500,
}: CommentInputProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const charCount = content.length;
  const isOverLimit = charCount > maxLength;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    if (!isAuthenticated) {
      onLoginRequired?.();
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(content.trim());
      setContent('');
      inputRef.current?.blur();
    } catch (error: any) {
      if (
        error?.status === 401 ||
        error?.message?.includes('401') ||
        error?.message?.includes('Unauthorized')
      ) {
        onLoginRequired?.();
      } else {
        Alert.alert('Error', 'Failed to post comment.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCounterColor = () => {
    if (isOverLimit) return '#FF3B30';
    if (charCount >= maxLength - 50) return '#FF9500';
    return '#888';
  };

  return (
    <View style={StyleSheet.flatten([styles.container, style])}>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={StyleSheet.flatten([styles.input, isOverLimit && styles.inputError])}
          value={content}
          onChangeText={setContent}
          placeholder={placeholder}
          placeholderTextColor="#999"
          multiline
          maxLength={maxLength + 50} // Allow typing over to show error
          editable={!isSubmitting}
          textAlignVertical="top"
        />
        <View style={styles.footer}>
          <ThemedText style={StyleSheet.flatten([styles.counter, { color: getCounterColor() }])}>
            {charCount}/{maxLength}
          </ThemedText>
          <TouchableOpacity
            style={StyleSheet.flatten([styles.submitButton, !canSubmit && styles.submitButtonDisabled])}
            onPress={handleSubmit}
            disabled={!canSubmit}
            accessibilityLabel="Post comment"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.submitText}>Post</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  inputWrapper: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
  },
  input: {
    fontSize: 15,
    lineHeight: 20,
    minHeight: 60,
    maxHeight: 120,
    color: '#333',
  },
  inputError: {
    color: '#FF3B30',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  counter: {
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
