import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';

const ONBOARDING_INPUT_KEY = 'onboarding_input';

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const [input, setInput] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.emoji}>🌍✨</Text>
          <Text style={styles.title}>Welcome to LifeMapped</Text>
          <Text style={styles.subtitle}>
            Let's start with a memory that matters to you
          </Text>
        </View>

        <View style={styles.promptContainer}>
          <Text style={styles.prompt}>
            Where did you feel most at home last year?
          </Text>
          
          <TextInput
            style={styles.input}
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
            style={[styles.button, styles.continueButton, !input.trim() && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!input.trim()}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.skipButton]}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
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
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 24,
  },
  promptContainer: {
    marginBottom: 32,
  },
  prompt: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 16,
    lineHeight: 28,
  },
  input: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 120,
    borderWidth: 2,
    borderColor: '#2D3748',
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
  continueButton: {
    backgroundColor: '#4F46E5',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  skipButtonText: {
    color: '#A0AEC0',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
