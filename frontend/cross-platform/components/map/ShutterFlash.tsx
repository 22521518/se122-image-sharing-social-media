/**
 * ShutterFlash - White flash animation for teleport effect
 * 
 * Story 4.1: Serendipitous Teleportation
 * Creates a brief 0.2s white-out "shutter flash" animation
 * to provide sensory feedback during teleportation.
 */

import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

interface ShutterFlashProps {
  /** Whether the flash is currently active */
  isFlashing: boolean;
  /** Callback when flash animation completes */
  onFlashComplete?: () => void;
  /** Optional style override */
  style?: ViewStyle;
}

const FLASH_DURATION = 200; // 0.2 seconds

export function ShutterFlash({ isFlashing, onFlashComplete, style }: ShutterFlashProps) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isFlashing) {
      // Flash in quickly
      opacity.value = withTiming(1, {
        duration: FLASH_DURATION / 2,
        easing: Easing.out(Easing.ease),
      }, (finished) => {
        if (finished) {
          // Flash out
          opacity.value = withTiming(0, {
            duration: FLASH_DURATION / 2,
            easing: Easing.in(Easing.ease),
          }, (finishedOut) => {
            if (finishedOut && onFlashComplete) {
              runOnJS(onFlashComplete)();
            }
          });
        }
      });
    }
  }, [isFlashing, opacity, onFlashComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={StyleSheet.flatten([styles.flash, animatedStyle, style])}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
  },
});
