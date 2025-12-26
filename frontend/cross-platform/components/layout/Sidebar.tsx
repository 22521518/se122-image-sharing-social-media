/**
 * Desktop Sidebar Navigation
 * Only displayed on web when screen width >= 1024px (desktop)
 */

import { Colors } from '@/constants/Colors';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Link, usePathname } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type NavItem = {
  href: '/' | '/map' | '/explore' | '/postcards' | '/profile';
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
  label: string;
};

const navItems: NavItem[] = [
  { href: '/', icon: 'home-outline', iconFilled: 'home', label: 'Feed' },
  { href: '/map', icon: 'map-outline', iconFilled: 'map', label: 'Map' },
  { href: '/explore', icon: 'search-outline', iconFilled: 'search', label: 'Explore' },
  { href: '/postcards', icon: 'mail-outline', iconFilled: 'mail', label: 'Postcards' },
  { href: '/profile', icon: 'person-outline', iconFilled: 'person', label: 'Profile' },
];

export function Sidebar() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Only render on web
  if (Platform.OS !== 'web') {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/index';
    }
    return pathname.startsWith(href);
  };

  return (
    <View style={StyleSheet.flatten([styles.sidebar, { backgroundColor: colors.background, borderRightColor: colors.border }])}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={StyleSheet.flatten([styles.logo, { color: colors.text }])}>LifeMapped</Text>
      </View>

      {/* Navigation */}
      <View style={styles.nav}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} asChild>
              <TouchableOpacity
                style={StyleSheet.flatten([
                  styles.navItem,
                  active && { backgroundColor: colors.muted },
                ])}
              >
                <Ionicons
                  name={active ? item.iconFilled : item.icon}
                  size={22}
                  color={active ? colors.text : colors.textSecondary}
                />
                <Text
                  style={StyleSheet.flatten([
                    styles.navLabel,
                    { color: active ? colors.text : colors.textSecondary },
                    active && styles.navLabelActive,
                  ])}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            </Link>
          );
        })}
      </View>

      {/* Separator */}
      <View style={StyleSheet.flatten([styles.separator, { backgroundColor: colors.border }])} />

      {/* User Section */}
      <View style={styles.userSection}>
        {user ? (
          <View style={styles.userRow}>
            <View style={StyleSheet.flatten([styles.avatar, { backgroundColor: colors.muted }])}>
              <Text style={StyleSheet.flatten([styles.avatarText, { color: colors.primary }])}>
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text
                style={StyleSheet.flatten([styles.userEmail, { color: colors.text }])}
                numberOfLines={1}
              >
                {user.email}
              </Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.signOutBtn}>
              <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={StyleSheet.flatten([styles.signInBtn, { backgroundColor: colors.primary }])}>
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 256,
    height: '100%',
    borderRightWidth: 1,
    flexDirection: 'column',
    // @ts-ignore - web specific
    position: 'sticky',
    top: 0,
  },
  logoContainer: {
    padding: Theme.spacing.xl,
  },
  logo: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.semibold,
    letterSpacing: -0.5,
  },
  nav: {
    flex: 1,
    paddingHorizontal: Theme.spacing.md,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: Theme.typography.fontSizes.base,
  },
  navLabelActive: {
    fontWeight: Theme.typography.fontWeights.medium,
  },
  separator: {
    height: 1,
    marginHorizontal: Theme.spacing.lg,
  },
  userSection: {
    padding: Theme.spacing.lg,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.semibold,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userEmail: {
    fontSize: Theme.typography.fontSizes.sm,
    fontWeight: Theme.typography.fontWeights.medium,
  },
  signOutBtn: {
    padding: Theme.spacing.sm,
  },
  signInBtn: {
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
  },
  signInText: {
    color: '#fff',
    fontSize: Theme.typography.fontSizes.base,
    fontWeight: Theme.typography.fontWeights.medium,
  },
});
