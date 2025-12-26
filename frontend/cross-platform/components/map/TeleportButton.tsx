/**
 * TeleportButton - Platform-aware button for teleporting to random memories
 * 
 * Story 4.1: Serendipitous Teleportation
 * 
 * Design:
 * - Mobile: Floating Action Button (FAB) positioned bottom-right
 * - Desktop/Web: Inline button with label for better discoverability
 */

import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  Text,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ButtonVariant = 'fab' | 'inline';

interface TeleportButtonProps {
  /** Called when the teleport button is pressed */
  onPress: () => void;
  /** Whether a teleport is currently in progress */
  isLoading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Optional style override */
  style?: ViewStyle;
  /** Force a specific variant (auto-detected by default) */
  variant?: ButtonVariant;
}

export function TeleportButton({
  onPress,
  isLoading = false,
  disabled = false,
  style,
  variant: forcedVariant,
}: TeleportButtonProps) {
  const { width } = useWindowDimensions();
  
  // Auto-detect variant: wide screens (>=768px) get inline, others get FAB
  const variant: ButtonVariant = forcedVariant ?? (width >= 768 ? 'inline' : 'fab');

  if (variant === 'inline') {
    return (
      <TouchableOpacity
        style={StyleSheet.flatten([
          styles.inlineButton,
          disabled && styles.buttonDisabled,
          style,
        ])}
        onPress={onPress}
        disabled={disabled || isLoading}
        activeOpacity={0.8}
        accessibilityLabel="Teleport to random memory"
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            <Text style={styles.inlineButtonText}>Teleport</Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  // FAB variant (mobile)
  return (
    <TouchableOpacity
      style={StyleSheet.flatten([
        styles.fabButton,
        disabled && styles.buttonDisabled,
        style,
      ])}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      accessibilityLabel="Teleport to random memory"
      accessibilityRole="button"
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Ionicons name="sparkles" size={24} color="#FFFFFF" />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // FAB variant (mobile)
  fabButton: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5856D6',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }),
  },
  // Inline variant (desktop/web)
  inlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5856D6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 4,
        }),
  },
  inlineButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#A0A0A0',
  },
});
