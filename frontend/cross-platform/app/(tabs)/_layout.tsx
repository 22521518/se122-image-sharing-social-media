import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, ViewStyle } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { AppShell } from '@/components/layout';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useShouldShowSidebar } from '@/hooks/usePlatform';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { user, isLoading } = useAuth();
  const colors = Colors[colorScheme ?? 'light'];
  const showSidebar = useShouldShowSidebar();

  useEffect(() => {
    // Check if user needs onboarding (AC 1, 2)
    if (!isLoading && user && !user.hasOnboarded) {
      // Redirect to onboarding if not already there
      const inTabs = segments[0] === '(tabs)';
      if (inTabs) {
        router.replace('/onboarding' as any);
      }
    }
  }, [user, isLoading, segments]);

  // Tab bar style - hidden on desktop web when sidebar is visible
  const tabBarStyle: ViewStyle = showSidebar
    ? { display: 'none' }
    : {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Platform.OS === 'web' 
          ? `${colors.background}F2` // 95% opacity
          : colors.background,
        borderTopColor: colors.border,
        borderTopWidth: StyleSheet.hairlineWidth,
        height: Platform.select({
          ios: 84,
          android: 56,
          web: 56,
        }),
        paddingBottom: Platform.OS === 'ios' ? 28 : 0,
        // Blur effect simulation for web
        ...(Platform.OS === 'web' && {
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        } as any),
      };

  return (
    <AppShell>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarStyle,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
            marginTop: 2,
          },
          tabBarIconStyle: {
            marginTop: Platform.OS === 'ios' ? 0 : 4,
          },
          headerShown: false,
          tabBarButton: HapticTab,
          // Hide tab bar labels to match more compact design
          tabBarShowLabel: true,
        }}>
        {/* Feed (Home) */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color, focused }) => (
              <IconSymbol 
                size={22} 
                name={focused ? 'house.fill' : 'house'} 
                color={color}
                style={focused && { opacity: 1 }}
              />
            ),
          }}
        />
        {/* Map */}
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ color, focused }) => (
              <IconSymbol 
                size={22} 
                name={focused ? 'map.fill' : 'map'} 
                color={color} 
              />
            ),
          }}
        />
        {/* Explore */}
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, focused }) => (
              <IconSymbol 
                size={22} 
                name="magnifyingglass" 
                color={color} 
              />
            ),
          }}
        />
        {/* Postcards */}
        <Tabs.Screen
          name="postcards"
          options={{
            title: 'Postcards',
            tabBarIcon: ({ color, focused }) => (
              <IconSymbol 
                size={22} 
                name={focused ? 'envelope.fill' : 'envelope'} 
                color={color} 
              />
            ),
          }}
        />
        {/* Profile */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <IconSymbol 
                size={22} 
                name={focused ? 'person.fill' : 'person'} 
                color={color} 
              />
            ),
          }}
        />
        {/* Settings - Keep but hide from bottom nav (access via profile) */}
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Hide from tab bar
            title: 'Settings',
            tabBarIcon: ({ color }) => <IconSymbol size={22} name="gearshape.fill" color={color} />,
          }}
        />
      </Tabs>
    </AppShell>
  );
}
