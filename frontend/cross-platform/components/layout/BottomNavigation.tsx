import { Colors } from '@/constants/Colors';
import { useNotifications } from '@/context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const navItems = [
  { to: '/', icon: 'home-outline', activeIcon: 'home', label: 'Feed' },
  { to: '/map', icon: 'map-outline', activeIcon: 'map', label: 'Map' },
  { to: '/postcards', icon: 'mail-outline', activeIcon: 'mail', label: 'Postcards' },
  { to: '/notifications', icon: 'notifications-outline', activeIcon: 'notifications', label: 'Notify' },
  { to: '/profile', icon: 'person-outline', activeIcon: 'person', label: 'Profile' },
] as const;

export function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const active = isActive(item.to);
        const showBadge = item.to === '/notifications' && unreadCount > 0;
        return (
          <Pressable
            key={item.to}
            style={styles.navItem}
            onPress={() => router.push(item.to as any)}
          >
            <View>
              <Ionicons
                name={active ? item.activeIcon : item.icon}
                size={20}
                color={active ? Colors.light.primary : '#737373'}
              />
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingBottom: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
    color: '#737373',
  },
  labelActive: {
    color: Colors.light.primary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
});
