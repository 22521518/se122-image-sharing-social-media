import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';

/**
 * OAuth Callback Handler
 * 
 * This screen handles the redirect from Google OAuth.
 * It extracts tokens from URL params, stores them, and redirects to the main app.
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ accessToken?: string; refreshToken?: string }>();
  const [error, setError] = useState<string | null>(null);
  const { refreshAuth } = useAuth();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      let { accessToken, refreshToken } = params;

      // Web Security: Extract token from Hash Fragment if present (avoids server logs)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.substring(1); // Remove leading '#'
        const urlParams = new URLSearchParams(hash);
        if (urlParams.has('accessToken')) {
          accessToken = urlParams.get('accessToken')!;
        }
        // Refresh token is usually in cookie for Web, but check hash just in case
        if (urlParams.has('refreshToken')) {
          refreshToken = urlParams.get('refreshToken')!;
        }
      }

      if (!accessToken) {
        setError('No access token received from authentication');
        return;
      }

      // Store tokens
      await AsyncStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }

      // Decode and store user info from token
      try {
        const parts = accessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const userData = { id: payload.sub, email: payload.email };
          await AsyncStorage.setItem('user', JSON.stringify(userData));
        }
      } catch (e) {
        console.warn('Failed to decode token:', e);
      }

      // Refresh AuthContext to pick up the new tokens
      await refreshAuth();

      // Redirect to main app after short delay for UX
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 500);
    } catch (err) {
      console.error('Callback error:', err);
      setError('Failed to complete authentication');
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.errorText}>{error}</Text>
          <Text 
            style={styles.link}
            onPress={() => router.replace('/(auth)/login')}
          >
            Return to Login
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.text}>Completing sign in...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    marginTop: 16,
    color: '#888',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  link: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
});
