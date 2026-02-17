import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';

const BREAKPOINT = 768;

export default function RegisterScreen() {
  const { register } = useAuth();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= BREAKPOINT;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; confirmPassword?: string } = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await register(email, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setErrors({ general: err.message || 'Registration failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.innerContainer, isLargeScreen && styles.innerContainerLarge]}>
          {/* Branding Panel - Left side on large screens */}
          <View style={[styles.brandingPanel, isLargeScreen && styles.brandingPanelLarge]}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoIcon, isLargeScreen && styles.logoIconLarge]}>
                <Ionicons name="location" size={isLargeScreen ? 48 : 32} color="#fff" />
              </View>
              <Text style={[styles.logoTitle, isLargeScreen && styles.logoTitleLarge]}>
                LifeMapped
              </Text>
              <Text style={[styles.logoSubtitle, isLargeScreen && styles.logoSubtitleLarge]}>
                Map your memories, share your journey
              </Text>
              {isLargeScreen && (
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="map-outline" size={20} color={Colors.light.primary} />
                    <Text style={styles.featureText}>Pin memories to locations</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="people-outline" size={20} color={Colors.light.primary} />
                    <Text style={styles.featureText}>Share with friends & family</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="heart-outline" size={20} color={Colors.light.primary} />
                    <Text style={styles.featureText}>Relive your favorite moments</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Form Panel - Right side on large screens */}
          <View style={[styles.formPanel, isLargeScreen && styles.formPanelLarge]}>
            {/* Card */}
            <View style={[styles.card, isLargeScreen && styles.cardLarge]}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Create account</Text>
                <Text style={styles.cardDescription}>Start mapping your memories today</Text>

                {errors.general && <Text style={styles.errorBanner}>{errors.general}</Text>}

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                    <Ionicons
                      name="mail-outline"
                      size={16}
                      color="#737373"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="you@example.com"
                      placeholderTextColor="#a3a3a3"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={16}
                      color="#737373"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="••••••••"
                      placeholderTextColor="#a3a3a3"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={16}
                        color="#737373"
                      />
                    </Pressable>
                  </View>
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={16}
                      color="#737373"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder="••••••••"
                      placeholderTextColor="#a3a3a3"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={16}
                        color="#737373"
                      />
                    </Pressable>
                  </View>
                  {errors.confirmPassword && (
                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                  )}
                </View>

                {/* Submit Button */}
                <Pressable
                  style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={isLoading}
                >
                  {isLoading && (
                    <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                  )}
                  <Text style={styles.submitButtonText}>Create Account</Text>
                </Pressable>

                {/* Footer */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>Already have an account? </Text>
                  <Link href="/(auth)/login" asChild>
                    <Pressable>
                      <Text style={styles.link}>Sign In</Text>
                    </Pressable>
                  </Link>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  scrollContentLarge: {
    padding: 24,
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
  },
  innerContainerLarge: {
    flexDirection: 'row',
    maxWidth: 1000,
    width: '100%',
    minHeight: 600,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  brandingPanel: {
    marginBottom: 32,
  },
  brandingPanelLarge: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    padding: 48,
    justifyContent: 'center',
    marginBottom: 0,
  },
  formPanel: {
    width: '100%',
  },
  formPanelLarge: {
    flex: 1,
    justifyContent: 'center',
    padding: 48,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 24,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#171717',
  },
  logoTitleLarge: {
    fontSize: 32,
  },
  logoSubtitle: {
    fontSize: 14,
    color: '#737373',
    marginTop: 4,
  },
  logoSubtitleLarge: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  featuresList: {
    marginTop: 48,
    alignSelf: 'flex-start',
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  featureText: {
    fontSize: 14,
    color: '#525252',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardLarge: {
    shadowOpacity: 0,
    elevation: 0,
    borderRadius: 0,
  },
  cardContent: {
    padding: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#171717',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#737373',
    marginBottom: 24,
  },
  errorBanner: {
    fontSize: 14,
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#171717',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#171717',
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  passwordInput: {
    paddingRight: 40,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#737373',
    fontSize: 14,
  },
  link: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
