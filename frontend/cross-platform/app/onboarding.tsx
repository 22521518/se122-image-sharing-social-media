import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { analytics } from '@/services/analytics';

const ONBOARDING_INPUT_KEY = 'onboarding_input';

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { completeOnboarding } = useAuth();
  const [input, setInput] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  const themeColors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    // Load saved input if app was backgrounded
    loadSavedInput();

    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Track onboarding started event (Subtask 2.4)
    analytics.track('ONBOARDING_STARTED');
  }, []);

  useEffect(() => {
    // Save input to AsyncStorage for state preservation (AC 6)
    if (input) {
      AsyncStorage.setItem(ONBOARDING_INPUT_KEY, input);
    }
  }, [input]);

  const loadSavedInput = async () => {
    try {
      const saved = await AsyncStorage.getItem(ONBOARDING_INPUT_KEY);
      if (saved) {
        setInput(saved);
      }
    } catch (error) {
      console.error('Failed to load saved onboarding input:', error);
    }
  };

  const handleSkip = async () => {
    // Clear saved input
    await AsyncStorage.removeItem(ONBOARDING_INPUT_KEY);
    
    // Track skip event (Subtask 2.4)
    analytics.track('ONBOARDING_SKIPPED');
    
    // Mark as onboarded (AC 5, 7)
    await completeOnboarding();
    
    // Navigate to map
    router.replace('/(tabs)/map');
  };

  const handleContinue = async () => {
    if (!input.trim()) {
      return;
    }

    // Clear saved input
    await AsyncStorage.removeItem(ONBOARDING_INPUT_KEY);
    
    // Navigate to map with pre-filled context (AC 4)
    router.replace({
      pathname: '/(tabs)/map',
      params: { onboardingMemory: input },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ThemedView style={styles.container}>
          <Animated.View
            style={StyleSheet.flatten([
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ])}
          >
            <View style={styles.header}>
              <ThemedText style={styles.emoji}>🌍✨</ThemedText>
              <ThemedText type="title" style={styles.title}>Welcome to LifeMapped</ThemedText>
              <ThemedText style={styles.subtitle}>
                Let's start with a memory that matters to you
              </ThemedText>
            </View>

            <View style={styles.promptContainer}>
              <ThemedText type="subtitle" style={styles.prompt}>
                Where did you feel most at home last year?
              </ThemedText>
              
              <TextInput
                style={StyleSheet.flatten([
                  styles.input,
                  { 
                    backgroundColor: colorScheme === 'dark' ? '#1A1F3A' : '#F7FAFC',
                    color: themeColors.text,
                    borderColor: themeColors.icon
                  }
                ])}
                placeholder="Share your memory..."
                placeholderTextColor="#999"
                value={input}
                onChangeText={setInput}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus
              />
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={StyleSheet.flatten([styles.button, { backgroundColor: themeColors.tint }, !input.trim() && styles.buttonDisabled])}
                onPress={handleContinue}
                disabled={!input.trim()}
              >
                <ThemedText style={styles.continueButtonText}>Continue</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={StyleSheet.flatten([styles.button, styles.skipButton, { borderColor: themeColors.icon }])}
                onPress={handleSkip}
              >
                <ThemedText style={{ color: themeColors.icon }}>Skip for now</ThemedText>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
  },
  promptContainer: {
    marginBottom: 32,
  },
  prompt: {
    marginBottom: 16,
  },
  input: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#CCC',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
