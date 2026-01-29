import { Colors } from '@/constants/Colors';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const NotFound = () => {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', pathname);
  }, [pathname]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>404</Text>
        <Text style={styles.description}>Oops! Page not found</Text>
        <Pressable onPress={() => router.replace('/')}>
          <Text style={styles.link}>Return to Home</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#171717',
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    color: '#737373',
    marginBottom: 16,
  },
  link: {
    fontSize: 16,
    color: Colors.light.primary,
    textDecorationLine: 'underline',
  },
});

export default NotFound;
