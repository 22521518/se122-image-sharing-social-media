import { Colors } from '@/constants/Colors';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  style?: object;
  fullScreen?: boolean;
  color?: string;
}

const sizeMap = {
  sm: 'small' as const,
  md: 'small' as const,
  lg: 'large' as const,
};

export function LoadingSpinner({
  size = 'md',
  style,
  fullScreen = false,
  color = Colors.light.primary,
}: LoadingSpinnerProps) {
  const spinner = <ActivityIndicator size={sizeMap[size]} color={color} style={style} />;

  if (fullScreen) {
    return <View style={styles.fullScreen}>{spinner}</View>;
  }

  return spinner;
}

export function LoadingPage() {
  return (
    <View style={styles.page}>
      <LoadingSpinner size="lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 50,
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
});
