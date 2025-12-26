/**
 * AppShell - Responsive layout wrapper
 * Shows Sidebar on desktop web, just content on mobile/native
 */

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useIsMobileView, useShouldShowSidebar } from '@/hooks/usePlatform';
import React, { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

export function AppShell({ children, hideNavigation = false }: AppShellProps) {
  const showSidebar = useShouldShowSidebar();
  const isMobile = useIsMobileView();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // On native, just render children directly
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }])}>
      <View style={styles.layout}>
        {/* Desktop Sidebar */}
        {!hideNavigation && showSidebar && <Sidebar />}

        {/* Main Content */}
        <View
          style={StyleSheet.flatten([
            styles.main,
            // Add bottom padding on mobile web for bottom nav
            !hideNavigation && isMobile && styles.mobileMain,
          ])}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100%',
  },
  layout: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
  },
  main: {
    flex: 1,
    minHeight: '100%',
  },
  mobileMain: {
    paddingBottom: 80, // Space for bottom nav
  },
});
