import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

interface DoubleTapLikeProps {
  children: React.ReactNode;
  onDoubleTap: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * DoubleTapLike - Wraps content with double-tap gesture to trigger like action
 * Shows a heart animation overlay when double-tapped
 */
export function DoubleTapLike({
  children,
  onDoubleTap,
  disabled = false,
  style,
}: DoubleTapLikeProps) {
  // Animation values
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const handleDoubleTap = useCallback(() => {
    if (disabled) return;

    // Trigger the like action
    onDoubleTap();

    // Animate heart
    heartOpacity.value = 1;
    heartScale.value = withSequence(
      withSpring(1.2, { damping: 4, stiffness: 200 }),
      withSpring(1, { damping: 6, stiffness: 150 })
    );

    // Fade out after animation
    setTimeout(() => {
      heartOpacity.value = withTiming(0, { duration: 300 });
      heartScale.value = withTiming(0, { duration: 300 });
    }, 600);
  }, [onDoubleTap, disabled]);

  // Double tap gesture - only for native platforms
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      runOnJS(handleDoubleTap)();
    });

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  // For web, we'll use a click handler with timing
  const lastTapRef = useRef<number>(0);
  const handleWebDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [handleDoubleTap]);

  const content = (
    <View style={[styles.container, style]}>
      {children}
      {/* Heart Overlay Animation */}
      <Animated.View style={[styles.heartOverlay, heartAnimatedStyle]} pointerEvents="none">
        <Ionicons name="heart" size={80} color="#FF3B5C" style={styles.heartIcon} />
      </Animated.View>
    </View>
  );

  // Use gesture handler on native, click handler on web
  if (Platform.OS === 'web') {
    return (
      <View onTouchEnd={handleWebDoubleTap} style={style}>
        {content}
      </View>
    );
  }

  return (
    <GestureDetector gesture={doubleTapGesture}>
      {content}
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  heartIcon: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
