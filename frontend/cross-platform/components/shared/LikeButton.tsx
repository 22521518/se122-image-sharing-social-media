import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface LikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onToggle: () => void;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: object;
}

const sizeConfig = {
  sm: { icon: 16, text: 12 },
  md: { icon: 20, text: 14 },
  lg: { icon: 24, text: 16 },
};

export function LikeButton({
  isLiked,
  likeCount,
  onToggle,
  showCount = true,
  size = 'md',
  style,
}: LikeButtonProps) {
  const config = sizeConfig[size];
  const heartColor = isLiked ? '#ef4444' : '#737373';

  return (
    <Pressable
      onPress={onToggle}
      style={[styles.button, style]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={config.icon} color={heartColor} />
      {showCount && (
        <Text
          style={[styles.count, { fontSize: config.text, color: isLiked ? '#ef4444' : '#737373' }]}
        >
          {likeCount}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  count: {
    fontWeight: '500',
  },
});
