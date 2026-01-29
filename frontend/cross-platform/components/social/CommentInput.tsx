import { UserAvatar } from '@/components/shared';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
  style?: object;
}

export function CommentInput({
  onSubmit,
  placeholder = 'Add a comment...',
  autoFocus = false,
  style,
}: CommentInputProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.signInText}>Sign in to comment</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <UserAvatar name={user.email?.charAt(0).toUpperCase() || 'U'} size="sm" />

      <TextInput
        ref={inputRef}
        value={content}
        onChangeText={setContent}
        placeholder={placeholder}
        placeholderTextColor="#737373"
        style={styles.input}
        editable={!isSubmitting}
        onSubmitEditing={handleSubmit}
        returnKeyType="send"
      />

      <Pressable
        onPress={handleSubmit}
        disabled={!content.trim() || isSubmitting}
        style={[
          styles.submitButton,
          (!content.trim() || isSubmitting) && styles.submitButtonDisabled,
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={Colors.light.primary} />
        ) : (
          <Ionicons name="send" size={20} color={content.trim() ? Colors.light.primary : '#737373'} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    fontSize: 14,
    color: '#171717',
  },
  submitButton: {
    padding: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  signInText: {
    fontSize: 14,
    color: '#737373',
  },
});
