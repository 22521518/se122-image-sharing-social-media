import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import OnboardingScreen from '../onboarding';
import { useAuth } from '@/context/AuthContext';
import { analytics } from '@/services/analytics';

// Mock dependencies
jest.mock('expo-router');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@/context/AuthContext');
jest.mock('@/services/analytics');
jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

describe('OnboardingScreen', () => {
  const mockReplace = jest.fn();
  const mockCompleteOnboarding = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
    });
    (useAuth as jest.Mock).mockReturnValue({
      completeOnboarding: mockCompleteOnboarding,
    });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<OnboardingScreen />);
    
    expect(getByText('Welcome to LifeMapped')).toBeTruthy();
    expect(getByText('Where did you feel most at home last year?')).toBeTruthy();
    expect(getByPlaceholderText('Share your memory...')).toBeTruthy();
    expect(getByText('Continue')).toBeTruthy();
    expect(getByText('Skip for now')).toBeTruthy();
  });

  it('tracks ONBOARDING_STARTED event on mount', () => {
    render(<OnboardingScreen />);
    
    expect(analytics.track).toHaveBeenCalledWith('ONBOARDING_STARTED');
  });

  it('loads saved input from AsyncStorage', async () => {
    const savedInput = 'My saved memory';
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(savedInput);

    const { getByPlaceholderText } = render(<OnboardingScreen />);
    
    await waitFor(() => {
      const input = getByPlaceholderText('Share your memory...') as any;
      expect(input.props.value).toBe(savedInput);
    });
  });

  it('saves input to AsyncStorage when typing', async () => {
    const { getByPlaceholderText } = render(<OnboardingScreen />);
    const input = getByPlaceholderText('Share your memory...');
    
    fireEvent.changeText(input, 'New memory');
    
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'onboarding_input',
        'New memory'
      );
    });
  });

  it('handles skip action correctly', async () => {
    const { getByText } = render(<OnboardingScreen />);
    const skipButton = getByText('Skip for now');
    
    fireEvent.press(skipButton);
    
    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('onboarding_input');
      expect(analytics.track).toHaveBeenCalledWith('ONBOARDING_SKIPPED');
      expect(mockCompleteOnboarding).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/map');
    });
  });

  it('handles continue action with input', async () => {
    const { getByPlaceholderText, getByText } = render(<OnboardingScreen />);
    const input = getByPlaceholderText('Share your memory...');
    const continueButton = getByText('Continue');
    
    // Type input
    fireEvent.changeText(input, 'Paris, France');
    
    // Click continue
    fireEvent.press(continueButton);
    
    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('onboarding_input');
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/(tabs)/map',
        params: { onboardingMemory: 'Paris, France' },
      });
    });
  });

  it('disables continue button when input is empty', () => {
    const { getByText } = render(<OnboardingScreen />);
    const continueButton = getByText('Continue').parent;
    
    expect(continueButton?.props.accessibilityState?.disabled).toBe(true);
  });

  it('does not navigate on continue when input is empty', async () => {
    const { getByPlaceholderText, getByText } = render(<OnboardingScreen />);
    const input = getByPlaceholderText('Share your memory...');
    const continueButton = getByText('Continue');
    
    // Set empty input
    fireEvent.changeText(input, '   '); // whitespace only
    
    // Try to continue
    fireEvent.press(continueButton);
    
    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
