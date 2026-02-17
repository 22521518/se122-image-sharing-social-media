import type { Feeling } from '@/types/api.types';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface FeelingBadgeProps {
  feeling: Feeling;
  size?: 'sm' | 'md';
  style?: object;
}

const feelingConfig: Record<Feeling, { label: string; color: string; bgColor: string }> = {
  JOY: { label: 'Joy', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
  MELANCHOLY: { label: 'Melancholy', color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.1)' },
  ENERGETIC: { label: 'Energetic', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
  CALM: { label: 'Calm', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' },
  INSPIRED: { label: 'Inspired', color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.1)' },
};

export function FeelingBadge({ feeling, size = 'sm', style }: FeelingBadgeProps) {
  const config = feelingConfig[feeling];
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 2 : 4,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: config.color,
            fontSize: isSmall ? 12 : 14,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '500',
  },
});
