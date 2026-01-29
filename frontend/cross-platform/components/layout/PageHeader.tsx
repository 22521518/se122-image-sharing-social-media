import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PageHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  children?: ReactNode;
  rightAction?: ReactNode;
  style?: object;
  transparent?: boolean;
}

export function PageHeader({
  title,
  showBack = false,
  onBack,
  children,
  rightAction,
  style,
  transparent = false,
}: PageHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top },
        transparent ? styles.headerTransparent : styles.headerDefault,
        style,
      ]}
    >
      <View style={styles.headerContent}>
        {showBack && (
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color="#171717" />
          </Pressable>
        )}

        {title && (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}

        {children && <View style={styles.childrenContainer}>{children}</View>}

        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerDefault: {
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  headerTransparent: {
    backgroundColor: 'transparent',
  },
  backButton: {
    marginLeft: -8,
    padding: 8,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#171717',
  },
  childrenContainer: {
    flex: 1,
  },
  rightAction: {
    flexShrink: 0,
  },
});
