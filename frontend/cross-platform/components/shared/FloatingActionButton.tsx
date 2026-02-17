import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: ReactNode;
  style?: object;
}

// Bottom navigation height (matches BottomNavigation.tsx)
const BOTTOM_NAV_HEIGHT = 56;
const FAB_MARGIN = 16;

export function FloatingActionButton({ onPress, icon, style }: FloatingActionButtonProps) {
  const insets = useSafeAreaInsets();
  
  // Calculate bottom position: nav height + safe area + margin
  const bottomPosition = Platform.select({
    ios: BOTTOM_NAV_HEIGHT + insets.bottom + FAB_MARGIN,
    android: BOTTOM_NAV_HEIGHT + FAB_MARGIN + 8, // Extra padding for Android
    default: 80, // Web/desktop
  });

  return (
    <TouchableOpacity
      style={[styles.button, { bottom: bottomPosition }, style]}
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {icon || <Ionicons name="add" size={24} color="#fff" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 40,
  },
});
