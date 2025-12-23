import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { router } from 'expo-router';

interface LoginPromptModalProps {
  visible: boolean;
  onClose: () => void;
  message?: string;
}

/**
 * LoginPromptModal - Displays a prompt asking users to log in
 * Used when unauthenticated users try to perform actions that require auth
 */
export function LoginPromptModal({ visible, onClose, message }: LoginPromptModalProps) {
  const handleLogin = () => {
    onClose();
    router.push('/(auth)/login');
  };

  const handleSignUp = () => {
    onClose();
    router.push('/(auth)/register');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => {}}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>👋</Text>
          </View>
          
          <Text style={styles.title}>Join to continue</Text>
          <Text style={styles.message}>
            {message || 'Create an account or log in to follow users and interact with content.'}
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
            <Text style={styles.primaryButtonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleSignUp}>
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
});
