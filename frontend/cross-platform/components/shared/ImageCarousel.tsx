import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface ImageCarouselProps {
  images: string[];
  aspectRatio?: 'square' | 'video' | 'auto';
  showIndicators?: boolean;
  style?: object;
  onImagePress?: (index: number) => void;
  maxHeight?: number;
}

const IMAGE_MAX_HEIGHT = 500;

export function ImageCarousel({
  images,
  aspectRatio = 'square',
  showIndicators = true,
  style,
  onImagePress,
  maxHeight = IMAGE_MAX_HEIGHT,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  console.log('ImageCarousel Render:', { imagesLength: images.length, containerWidth, maxHeight, aspectRatio });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
    }
  };

  const getAspectRatio = () => {
    switch (aspectRatio) {
      case 'square':
        return 1;
      case 'video':
        return 16 / 9;
      default:
        return 1;
    }
  };

  const imageWidth = containerWidth || 300;
  // Calculate height based on aspect ratio but cap at maxHeight
  const calculatedHeight = imageWidth / getAspectRatio();
  const imageHeight = Math.min(calculatedHeight, maxHeight);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / imageWidth);
    setCurrentIndex(index);
  };

  const scrollToIndex = (index: number) => {
    if (index >= 0 && index < images.length) {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewOffset: 0, viewPosition: 0 });
      // We manually update current index here to ensure UI updates immediately
      // The onScroll will eventually confirm this, but instant feedback is good
      setCurrentIndex(index);
    }
  };

  const handlePrev = () => {
    scrollToIndex(currentIndex - 1);
  };

  const handleNext = () => {
    scrollToIndex(currentIndex + 1);
  };

  if (images.length === 0) return null;

  // Single image - no carousel needed
  if (images.length === 1) {
    return (
      <View onLayout={handleLayout} style={[styles.singleImageContainer, style]}>
        <Pressable
          style={[styles.imageWrapper, { height: containerWidth > 0 ? imageHeight : 300 }]}
          onPress={() => onImagePress?.(0)}
        >
          <Image source={{ uri: images[0] }} style={styles.image} resizeMode="cover" />
        </Pressable>
      </View>
    );
  }

  const showLeftArrow = currentIndex > 0;
  const showRightArrow = currentIndex < images.length - 1;

  return (
    <View
      style={[
        styles.container,
        style,
        { height: imageHeight, minHeight: containerWidth > 0 ? undefined : 300 },
        Platform.OS === 'web' && { aspectRatio: getAspectRatio() },
      ]}
      onLayout={handleLayout}
    >
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: imageWidth,
          offset: imageWidth * index,
          index,
        })}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <Pressable
            style={[styles.imageContainer, { width: imageWidth, height: imageHeight }]}
            onPress={() => onImagePress?.(index)}
          >
            <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />
          </Pressable>
        )}
      />

      {/* Navigation Arrows (Web/Desktop preferred, but usable on tablet too) */}
      {(Platform.OS === 'web' || containerWidth > 500) && (
        <>
          {showLeftArrow && (
            <Pressable style={[styles.arrowButton, styles.arrowLeft]} onPress={handlePrev}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </Pressable>
          )}
          {showRightArrow && (
            <Pressable style={[styles.arrowButton, styles.arrowRight]} onPress={handleNext}>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </Pressable>
          )}
        </>
      )}

      {/* Counter badge */}
      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>
          {currentIndex + 1}/{images.length}
        </Text>
      </View>

      {/* Dot indicators */}
      {showIndicators && images.length > 1 && (
        <View style={styles.indicatorContainer}>
          {images.map((_, index) => (
            <Pressable
              key={index}
              onPress={() => scrollToIndex(index)}
              style={[
                styles.indicator,
                index === currentIndex ? styles.indicatorActive : styles.indicatorInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  singleImageContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    minHeight: 200,
  },
  imageContainer: {
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  counterBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 10,
  },
  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 10,
  },
  indicator: {
    height: 6,
    borderRadius: 3,
  },
  indicatorActive: {
    width: 16,
    backgroundColor: Colors.light.primary,
  },
  indicatorInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20, // Half of button size + padding
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    // Add hover effect logic if doing web-specific hover, but pressable is fine
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },
});
