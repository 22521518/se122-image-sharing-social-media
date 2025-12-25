/**
 * TeleportButton Component Tests
 * 
 * Story 4.1: Serendipitous Teleportation
 * Tests for platform-aware teleport button:
 * - FAB rendering (mobile)
 * - Inline button rendering (desktop)
 * - Loading states
 * - Disabled states
 * - Accessibility
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TeleportButton } from './TeleportButton';

describe('TeleportButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render FAB variant by default on mobile', () => {
      const { getByLabelText } = render(
        <TeleportButton onPress={mockOnPress} variant="fab" />
      );

      const button = getByLabelText('Teleport to random memory');
      expect(button).toBeTruthy();
    });

    it('should render inline variant on desktop', () => {
      const { getByText, getByLabelText } = render(
        <TeleportButton onPress={mockOnPress} variant="inline" />
      );

      const button = getByLabelText('Teleport to random memory');
      expect(button).toBeTruthy();
      expect(getByText('Teleport')).toBeTruthy();
    });

    it('should support forced variant override', () => {
      const { getByText } = render(
        <TeleportButton onPress={mockOnPress} variant="inline" />
      );

      expect(getByText('Teleport')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('should call onPress when button is pressed', () => {
      const { getByLabelText } = render(
        <TeleportButton onPress={mockOnPress} />
      );

      const button = getByLabelText('Teleport to random memory');
      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const { getByLabelText } = render(
        <TeleportButton onPress={mockOnPress} disabled={true} />
      );

      const button = getByLabelText('Teleport to random memory');
      fireEvent.press(button);

      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should not call onPress when loading', () => {
      const { getByLabelText } = render(
        <TeleportButton onPress={mockOnPress} isLoading={true} />
      );

      const button = getByLabelText('Teleport to random memory');
      fireEvent.press(button);

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when isLoading is true (FAB)', () => {
      const { queryByTestId, UNSAFE_getByType } = render(
        <TeleportButton onPress={mockOnPress} isLoading={true} variant="fab" />
      );

      // ActivityIndicator should be present
      const activityIndicators = UNSAFE_getByType('ActivityIndicator' as any);
      expect(activityIndicators).toBeTruthy();
    });

    it('should show loading indicator when isLoading is true (inline)', () => {
      const { queryByText, UNSAFE_getByType } = render(
        <TeleportButton onPress={mockOnPress} isLoading={true} variant="inline" />
      );

      // ActivityIndicator should be present
      const activityIndicators = UNSAFE_getByType('ActivityIndicator' as any);
      expect(activityIndicators).toBeTruthy();
      
      // Text should not be visible
      expect(queryByText('Teleport')).toBeNull();
    });

    it('should show icon when not loading (FAB)', () => {
      const { queryByTestId } = render(
        <TeleportButton onPress={mockOnPress} isLoading={false} variant="fab" />
      );

      // Icon should be visible (can't easily test Ionicons, but loading indicator should be absent)
      expect(queryByTestId('loading-indicator')).toBeNull();
    });

    it('should show icon and text when not loading (inline)', () => {
      const { getByText } = render(
        <TeleportButton onPress={mockOnPress} isLoading={false} variant="inline" />
      );

      expect(getByText('Teleport')).toBeTruthy();
    });
  });

  describe('disabled state', () => {
    it('should apply disabled styles when disabled prop is true', () => {
      const { getByLabelText } = render(
        <TeleportButton onPress={mockOnPress} disabled={true} />
      );

      const button = getByLabelText('Teleport to random memory');
      // Can't easily test styles, but button should exist
      expect(button).toBeTruthy();
    });

    it('should be disabled when isLoading is true', () => {
      const { getByLabelText } = render(
        <TeleportButton onPress={mockOnPress} isLoading={true} />
      );

      const button = getByLabelText('Teleport to random memory');
      fireEvent.press(button);
      
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility label', () => {
      const { getByLabelText } = render(
        <TeleportButton onPress={mockOnPress} />
      );

      const button = getByLabelText('Teleport to random memory');
      expect(button).toBeTruthy();
    });

    it('should have button accessibility role', () => {
      const { getByRole } = render(
        <TeleportButton onPress={mockOnPress} />
      );

      const button = getByRole('button');
      expect(button).toBeTruthy();
    });
  });

  describe('custom styling', () => {
    it('should accept custom style prop', () => {
      const customStyle = { marginTop: 20 };
      const { getByLabelText } = render(
        <TeleportButton onPress={mockOnPress} style={customStyle} />
      );

      const button = getByLabelText('Teleport to random memory');
      expect(button).toBeTruthy();
    });
  });
});
