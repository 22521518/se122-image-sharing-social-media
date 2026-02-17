import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const navItems = [
  { to: '/', icon: 'home-outline', activeIcon: 'home', label: 'Feed' },
  { to: '/map', icon: 'map-outline', activeIcon: 'map', label: 'Map' },
  // { to: '/explore', icon: 'search-outline', activeIcon: 'search', label: 'Explore' },
  { to: '/postcards', icon: 'mail-outline', activeIcon: 'mail', label: 'Postcards' },
  { to: '/messages', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles', label: 'Messages' },
  { to: '/notifications', icon: 'notifications-outline', activeIcon: 'notifications', label: 'Notifications' },
  { to: '/profile', icon: 'person-outline', activeIcon: 'person', label: 'Profile' },
] as const;

export function Sidebar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>LifeMapped</Text>
      </View>

      {/* Navigation */}
      <View style={styles.nav}>
        {navItems.map((item) => {
          const active = isActive(item.to);
          const showBadge = item.to === '/notifications' && unreadCount > 0;
          return (
            <Pressable
              key={item.to}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.to as any)}
            >
              <View>
                <Ionicons
                  name={active ? item.activeIcon : item.icon}
                  size={20}
                  color={active ? '#171717' : '#737373'}
                />
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.separator} />

      {/* User section */}
      <View style={styles.userSection}>
        {user ? (
          <View style={styles.userInfo}>
            <View style={styles.userDetails}>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user.name}
              </Text>
            </View>
            <Pressable onPress={logout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={16} color="#737373" />
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.signInButton} onPress={() => router.push('/auth' as any)}>
            <Text style={styles.signInText}>Sign In</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 256,
    height: '100%',
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e5e5e5',
  },
  logoContainer: {
    padding: 24,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.5,
    color: '#171717',
  },
  nav: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: '#f5f5f5',
  },
  navLabel: {
    fontSize: 14,
    color: '#737373',
  },
  navLabelActive: {
    color: '#171717',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginHorizontal: 12,
  },
  userSection: {
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
  },
  logoutButton: {
    padding: 8,
  },
  signInButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  signInText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
