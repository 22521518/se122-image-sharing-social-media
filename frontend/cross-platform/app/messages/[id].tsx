/**
 * Chat Page (Mobile)
 * 
 * Individual chat conversation view for mobile navigation.
 * Uses the ChatView component from messages components.
 */

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatView } from '@/components/messages';
import { Colors } from '@/constants/Colors';

export default function ChatPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  // Force light theme for consistency
  const colors = Colors['light'];
  const insets = useSafeAreaInsets();

  if (!id) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ChatView 
        conversationId={id} 
        showHeader={true}
        onBack={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
