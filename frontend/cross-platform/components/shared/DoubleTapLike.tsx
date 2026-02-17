import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

interface DoubleTapLikeProps {
  children: ReactNode;
  onDoubleTap: () => void;
  disabled?: boolean;
  style?: object;
}

export function DoubleTapLike({
  children,
  onDoubleTap,
  disabled = false,
  style,
}: DoubleTapLikeProps) {
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef<number>(0);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const handleTap = () => {
    if (disabled) return;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      onDoubleTap();
      setShowHeart(true);

      // Animate heart
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(1);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => setShowHeart(false));
    }

    lastTapRef.current = now;
  };

  return (
    <Pressable style={[styles.container, style]} onPress={handleTap}>
      {children}

      {/* Heart animation overlay */}
      {showHeart && (
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.heartContainer,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            <Ionicons name="heart" size={80} color="#ef4444" />
          </Animated.View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  heartContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
