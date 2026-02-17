import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { AppShell } from '@/components/layout';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useShouldShowSidebar } from '@/hooks/usePlatform';

function Badge() {
  const { unreadCount } = useNotifications();
  
  if (unreadCount === 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        right: -6,
        top: -3,
        backgroundColor: 'red',
        borderRadius: 6,
        width: 12,
        height: 12,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View
        style={{
            backgroundColor: 'white',
            borderRadius: 2,
            width: 4,
            height: 4,
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const colors = Colors[colorScheme ?? 'light'];
  const showSidebar = useShouldShowSidebar();

  useEffect(() => {
    // Don't do anything while loading
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
  }, [isLoading, isAuthenticated]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Don't render tabs if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  /* Safe Area Insets for bottom navigation */
  const insets = useSafeAreaInsets();

  // Tab bar style - hidden on desktop web when sidebar is visible
  const tabBarStyle: ViewStyle = showSidebar
    ? { display: 'none' }
    : {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor:
          Platform.OS === 'web'
            ? `${colors.background}F2` // 95% opacity
            : colors.background,
        borderTopColor: colors.border,
        borderTopWidth: StyleSheet.hairlineWidth,
        height: Platform.select({
          ios: 84, // iOS usually handles safe area automatically, but explicit height might need adjustment if using custom views. Standard tab bar + safe area.
          android: 56 + insets.bottom, // Add safe area inset for Android
          web: 56,
        }),
        paddingBottom: Platform.select({
          ios: 28, // Keep existing iOS padding if it works
          android: insets.bottom, // Use safe area inset for Android padding
          web: 0,
        }),
        // Blur effect simulation for web
        ...(Platform.OS === 'web' &&
          ({
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          } as any)),
      };

  return (
    <AppShell>
      <Tabs
        backBehavior="history"
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
        }}
      >
        {/* Feed (Home) */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons size={22} name={focused ? 'home' : 'home-outline'} color={color} />
            ),
          }}
        />
        {/* Map */}
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons size={22} name={focused ? 'map' : 'map-outline'} color={color} />
            ),
          }}
        />
        {/* Explore - Hidden from tab bar, accessed via header search */}
        <Tabs.Screen
          name="explore"
          options={{
            href: null, // Hide from tab bar
            title: 'Explore',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons size={22} name={focused ? 'search' : 'search-outline'} color={color} />
            ),
          }}
        />
        {/* Postcards */}
        <Tabs.Screen
          name="postcards"
          options={{
            title: 'Postcards',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons size={22} name={focused ? 'mail' : 'mail-outline'} color={color} />
            ),
          }}
        />
        {/* Messages */}
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons size={22} name={focused ? 'chatbubbles' : 'chatbubbles-outline'} color={color} />
            ),
          }}
        />
        {/* Notifications */}
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            tabBarIcon: ({ color, focused }) => (
              <View>
                <Ionicons size={22} name={focused ? 'notifications' : 'notifications-outline'} color={color} />
                <Badge />
              </View>
            ),
          }}
        />
        {/* Profile */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons size={22} name={focused ? 'person' : 'person-outline'} color={color} />
            ),
          }}
        />
        {/* Settings - Keep but hide from bottom nav (access via profile) */}
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Hide from tab bar
            title: 'Settings',
            tabBarIcon: ({ color }) => <Ionicons size={22} name="settings" color={color} />,
          }}
        />
        {/* Post Detail - Hidden from tab bar */}
        <Tabs.Screen
          name="post/[id]"
          options={{
            href: null, // Hide from tab bar
            title: 'Post',
          }}
        />
        {/* Memory Detail - Hidden from tab bar */}
        <Tabs.Screen
          name="memory/[id]"
          options={{
            href: null, // Hide from tab bar
            title: 'Memory',
          }}
        />
        {/* User Profile - Hidden from tab bar */}
        <Tabs.Screen
          name="user/[id]"
          options={{
            href: null, // Hide from tab bar
            title: 'User',
          }}
        />
      </Tabs>
    </AppShell>
  );
}
