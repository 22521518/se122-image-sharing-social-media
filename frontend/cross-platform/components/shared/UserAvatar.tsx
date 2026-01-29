import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface UserAvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  style?: object;
  onPress?: () => void;
}

const sizes = {
  xs: { container: 24, fontSize: 10 },
  sm: { container: 32, fontSize: 12 },
  md: { container: 40, fontSize: 14 },
  lg: { container: 56, fontSize: 18 },
  xl: { container: 80, fontSize: 24 },
};

export function UserAvatar({ src, name, size = 'md', style, onPress }: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeConfig = sizes[size];

  const containerStyle = {
    width: sizeConfig.container,
    height: sizeConfig.container,
    borderRadius: sizeConfig.container / 2,
  };

  const content = src ? (
    <Image source={{ uri: src }} style={[styles.image, containerStyle]} accessibilityLabel={name} />
  ) : (
    <View style={[styles.fallback, containerStyle, style]}>
      <Text style={[styles.initials, { fontSize: sizeConfig.fontSize }]}>{initials}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={style}>
        {content}
      </Pressable>
    );
  }

  return <View style={style}>{content}</View>;
}

const styles = StyleSheet.create({
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: '#e5e5e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '600',
    color: '#737373',
  },
});
