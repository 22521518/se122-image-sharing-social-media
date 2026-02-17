import { usePlatform } from '@/hooks/usePlatform';
import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

/**
 * AppShell - Layout wrapper that provides sidebar on desktop web.
 *
 * Note: Bottom navigation is handled by Expo Router's <Tabs> component
 * in (tabs)/_layout.tsx, so we don't render a custom BottomNavigation here
 * to avoid duplicate navigation bars on mobile.
 */
export function AppShell({ children, hideNavigation = false }: AppShellProps) {
  const { isDesktop, isWeb } = usePlatform();
  const showSidebar = isWeb && isDesktop && !hideNavigation;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Desktop Sidebar */}
        {showSidebar && <Sidebar />}

        {/* Main Content */}
        <View style={styles.main}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
  },
});
