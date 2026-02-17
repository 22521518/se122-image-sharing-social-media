import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

function SkeletonBox({ style }: { style?: object }) {
  return <View style={[styles.skeleton, style]} />;
}

export function PostCardSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <SkeletonBox style={styles.avatar} />
        <View style={styles.headerText}>
          <SkeletonBox style={styles.name} />
          <SkeletonBox style={styles.time} />
        </View>
      </View>

      {/* Image */}
      <SkeletonBox style={styles.image} />

      {/* Actions */}
      <View style={styles.actions}>
        <SkeletonBox style={styles.actionButton} />
        <SkeletonBox style={styles.actionButton} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <SkeletonBox style={styles.textLine} />
        <SkeletonBox style={styles.textLineShort} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  skeleton: {
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerText: {
    gap: 4,
  },
  name: {
    width: 96,
    height: 16,
  },
  time: {
    width: 64,
    height: 12,
  },
  image: {
    width: screenWidth,
    aspectRatio: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    padding: 12,
  },
  actionButton: {
    width: 64,
    height: 32,
    borderRadius: 4,
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  textLine: {
    width: '75%',
    height: 16,
  },
  textLineShort: {
    width: '50%',
    height: 16,
  },
});
