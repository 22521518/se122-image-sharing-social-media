import type { PrivacyLevel } from '@/types/api.types';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PrivacyBadgeProps {
  level: PrivacyLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  style?: object;
}

const privacyConfig: Record<PrivacyLevel, { label: string; icon: keyof typeof Ionicons.glyphMap }> =
  {
    public: { label: 'Public', icon: 'globe-outline' },
    friends: { label: 'Friends', icon: 'people-outline' },
    private: { label: 'Private', icon: 'lock-closed-outline' },
  };

export function PrivacyBadge({ level, showLabel = false, size = 'sm', style }: PrivacyBadgeProps) {
  const config = privacyConfig[level];
  const iconSize = size === 'sm' ? 14 : 16;
  const fontSize = size === 'sm' ? 12 : 14;

  return (
    <View style={[styles.container, style]}>
      <Ionicons name={config.icon} size={iconSize} color="#737373" />
      {showLabel && <Text style={[styles.label, { fontSize }]}>{config.label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: '#737373',
  },
});
