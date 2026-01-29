import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: ReactNode;
  style?: object;
}

export function FloatingActionButton({ onPress, icon, style }: FloatingActionButtonProps) {
  return (
    <Pressable
      style={[styles.button, style]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
    >
      {icon || <Ionicons name="add" size={24} color="#fff" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 80,
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
