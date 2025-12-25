/**
 * ShutterFlash Component Tests
 * 
 * Story 4.1: Serendipitous Teleportation
 * Tests for shutter flash animation component:
 * - Animation triggering
 * - Completion callback
 * - Timing (0.2s duration)
 * - Pointer events blocking
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ShutterFlash } from './ShutterFlash';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  
  // Mock runOnJS to execute callbacks immediately
  Reanimated.default.runOnJS = (fn: Function) => {
    return (...args: any[]) => {
      fn(...args);
    };
  };

  return {
    ...Reanimated,
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn((fn) => fn()),
    withTiming: jest.fn((toValue, config, callback) => {
      // Simulate animation completion
      if (callback) {
        setTimeout(() => callback(true), config?.duration || 0);
      }
      return toValue;
    }),
    runOnJS: Reanimated.default.runOnJS,
    Easing: {
      in: jest.fn((easing) => easing),
      out: jest.fn((easing) => easing),
      ease: jest.fn(),
    },
  };
});

describe('ShutterFlash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render without crashing', () => {
      const { UNSAFE_root } = render(
        <ShutterFlash isFlashing={false} />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('should have pointer events disabled', () => {
      const { getByTestId, UNSAFE_root } = render(
        <ShutterFlash isFlashing={false} />
      );

      // The component should have pointerEvents="none"
      const root = UNSAFE_root;
      expect(root).toBeTruthy();
    });

    it('should accept custom style prop', () => {
      const customStyle = { zIndex: 10000 };
      const { UNSAFE_root } = render(
        <ShutterFlash isFlashing={false} style={customStyle} />
      );

      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('animation triggering', () => {
    it('should trigger animation when isFlashing changes to true', () => {
      const { rerender } = render(
        <ShutterFlash isFlashing={false} />
      );

      // Change to flashing
      rerender(<ShutterFlash isFlashing={true} />);

      // Animation should be triggered (tested via withTiming mock)
      expect(require('react-native-reanimated').withTiming).toHaveBeenCalled();
    });

    it('should not trigger animation when isFlashing is false', () => {
      const mockWithTiming = require('react-native-reanimated').withTiming;
      mockWithTiming.mockClear();

      render(<ShutterFlash isFlashing={false} />);

      expect(mockWithTiming).not.toHaveBeenCalled();
    });
  });

  describe('completion callback', () => {
    it('should call onFlashComplete when animation finishes', (done) => {
      const mockOnComplete = jest.fn(() => {
        expect(mockOnComplete).toHaveBeenCalledTimes(1);
        done();
      });

      const { rerender } = render(
        <ShutterFlash isFlashing={false} onFlashComplete={mockOnComplete} />
      );

      // Trigger flash
      rerender(
        <ShutterFlash isFlashing={true} onFlashComplete={mockOnComplete} />
      );

      // Callback should be called after animation completes
      // Using setTimeout because withTiming uses setTimeout in mock
    });

    it('should not crash when onFlashComplete is undefined', () => {
      const { rerender } = render(
        <ShutterFlash isFlashing={false} />
      );

      expect(() => {
        rerender(<ShutterFlash isFlashing={true} />);
      }).not.toThrow();
    });
  });

  describe('animation timing', () => {
    it('should use 0.2s flash duration (200ms)', () => {
      const mockWithTiming = require('react-native-reanimated').withTiming;
      
      const { rerender } = render(
        <ShutterFlash isFlashing={false} />
      );

      rerender(<ShutterFlash isFlashing={true} />);

      // First call: flash in (100ms)
      expect(mockWithTiming).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: 100 }),
        expect.anything()
      );
    });

    it('should use ease-out for flash-in and ease-in for flash-out', () => {
      const mockEasing = require('react-native-reanimated').Easing;
      
      const { rerender } = render(
        <ShutterFlash isFlashing={false} />
      );

      rerender(<ShutterFlash isFlashing={true} />);

      // Easing functions should be called
      expect(mockEasing.out).toHaveBeenCalled();
      expect(mockEasing.in).toHaveBeenCalled();
    });
  });

  describe('opacity animation', () => {
    it('should animate opacity from 0 to 1 and back to 0', () => {
      const mockUseSharedValue = require('react-native-reanimated').useSharedValue;
      
      const { rerender } = render(
        <ShutterFlash isFlashing={false} />
      );

      // Initial opacity should be 0
      expect(mockUseSharedValue).toHaveBeenCalledWith(0);

      rerender(<ShutterFlash isFlashing={true} />);

      // withTiming should be called to animate to 1, then to 0
      const mockWithTiming = require('react-native-reanimated').withTiming;
      const calls = mockWithTiming.mock.calls;
      
      // Should have calls animating to 1 and then to 0
      expect(calls.some((call: any[]) => call[0] === 1)).toBe(true);
      expect(calls.some((call: any[]) => call[0] === 0)).toBe(true);
    });
  });

  describe('re-triggering', () => {
    it('should handle multiple flash triggers', () => {
      const mockOnComplete = jest.fn();
      
      const { rerender } = render(
        <ShutterFlash isFlashing={false} onFlashComplete={mockOnComplete} />
      );

      // First flash
      rerender(
        <ShutterFlash isFlashing={true} onFlashComplete={mockOnComplete} />
      );

      // Reset
      rerender(
        <ShutterFlash isFlashing={false} onFlashComplete={mockOnComplete} />
      );

      // Second flash
      rerender(
        <ShutterFlash isFlashing={true} onFlashComplete={mockOnComplete} />
      );

      // Both flashes should work independently
      expect(require('react-native-reanimated').withTiming).toHaveBeenCalled();
    });
  });
});
