/**
 * Memory Detail Deep Link Route (Story 6.5)
 * 
 * Route: /memory/[id]
 * Displays a full-screen memory detail view with interactions.
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { MemoryDetailModal } from '@/components/memories/MemoryDetailModal';
import { useMemories, Memory } from '@/context/MemoriesContext';
import { useAuth } from '@/context/AuthContext';
import { ApiService } from '@/services/api.service';
import { Ionicons } from '@expo/vector-icons';

export default function MemoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken, isAuthenticated } = useAuth();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !accessToken) {
      setLoading(false);
      return;
    }

    const fetchMemory = async () => {
      try {
        const data = await ApiService.get<Memory>(`/api/memories/${id}`, accessToken);
        setMemory(data);
      } catch (err: any) {
        console.error('Failed to fetch memory:', err);
        setError(err.message || 'Memory not found');
      } finally {
        setLoading(false);
      }
    };

    fetchMemory();
  }, [id, accessToken]);

  const handleClose = () => {
    // Navigate back to map or previous screen
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/map');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#5856D6" />
          <ThemedText style={styles.loadingText}>Loading memory...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !memory) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <ThemedText style={styles.errorText}>{error || 'Memory not found'}</ThemedText>
          <ThemedText style={styles.backLink} onPress={handleClose}>
            Go back
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Render the memory detail modal as a full screen view
  return (
    <MemoryDetailModal
      visible={true}
      memory={memory}
      onClose={handleClose}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#fff',
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
  },
  backLink: {
    marginTop: 24,
    color: '#5856D6',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
