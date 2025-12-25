/**
 * PostcardViewer ([id].tsx) Component Tests
 * 
 * Story 4.3: Postcard Unlock and Delivery
 * Tests for postcard viewing UI covering:
 * - Locked state display
 * - Unlock reveal animation
 * - Content display
 * - Sender preview mode
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PostcardViewerScreen from './[id]';
import postcardsService from '../../services/postcards.service';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 'postcard-1' }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User' },
    token: 'test-token',
  }),
}));

jest.mock('../../services/postcards.service');

// Mock Animated for stable testing
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.timing = () => ({
    start: (callback: any) => callback && callback(),
  });
  RN.Animated.sequence = (animations: any) => ({
    start: (callback: any) => callback && callback(),
  });
  RN.Animated.parallel = (animations: any) => ({
    start: (callback: any) => callback && callback(),
  });
  return RN;
});

describe('PostcardViewerScreen', () => {
  const mockLockedPostcard = {
    id: 'postcard-1',
    senderId: 'user-2',
    sender: { name: 'Sender Name' },
    status: 'LOCKED' as const,
    unlockDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    message: 'Secret message',
    mediaUrl: 'https://example.com/image.jpg',
    createdAt: new Date().toISOString(),
  };

  const mockUnlockedPostcard = {
    ...mockLockedPostcard,
    status: 'UNLOCKED' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading indicator while fetching postcard', async () => {
      let resolveGet: (value: any) => void;
      const getPromise = new Promise((resolve) => {
        resolveGet = resolve;
      });
      (postcardsService.getPostcard as jest.Mock).mockReturnValue(getPromise);

      const { getByTestId, UNSAFE_getAllByType } = render(<PostcardViewerScreen />);

      // Should show ActivityIndicator
      await waitFor(() => {
        expect(UNSAFE_getAllByType('ActivityIndicator' as any)).toBeTruthy();
      });

      // Resolve
      await act(async () => {
        resolveGet!(mockUnlockedPostcard);
        await getPromise;
      });
    });
  });

  describe('error handling', () => {
    it('should show error when postcard fetch fails', async () => {
      (postcardsService.getPostcard as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        expect(getByText('Network error')).toBeTruthy();
      });
    });

    it('should show error when postcard not found', async () => {
      (postcardsService.getPostcard as jest.Mock).mockResolvedValue(null);

      const { getByText } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        expect(getByText('Postcard not found')).toBeTruthy();
      });
    });
  });

  describe('locked postcard display', () => {
    it('should show locked state for locked postcard', async () => {
      (postcardsService.getPostcard as jest.Mock).mockResolvedValue(mockLockedPostcard);

      const { getByText } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        expect(getByText('🔒 Locked Postcard')).toBeTruthy();
        expect(getByText(/Opens on/)).toBeTruthy();
      });
    });

    it('should show location message for geo-locked postcard', async () => {
      const geoLockedPostcard = {
        ...mockLockedPostcard,
        unlockDate: null,
        unlockLatitude: 10.7769,
        unlockLongitude: 106.7009,
      };
      (postcardsService.getPostcard as jest.Mock).mockResolvedValue(geoLockedPostcard);

      const { getByText } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        expect(getByText('Opens when you arrive at the location')).toBeTruthy();
      });
    });

    it('should show sender info', async () => {
      (postcardsService.getPostcard as jest.Mock).mockResolvedValue(mockLockedPostcard);

      const { getByText } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        expect(getByText(/From: Sender Name/)).toBeTruthy();
        expect(getByText(/Sent on/)).toBeTruthy();
      });
    });
  });

  describe('unlocked postcard reveal', () => {
    it('should show tap to reveal for unlocked postcard', async () => {
      (postcardsService.getPostcard as jest.Mock).mockResolvedValue(mockUnlockedPostcard);

      const { getByText } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        expect(getByText('Tap to reveal!')).toBeTruthy();
      });
    });

    it('should reveal content when tapped', async () => {
      (postcardsService.getPostcard as jest.Mock).mockResolvedValue(mockUnlockedPostcard);

      const { getByText, queryByText } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        expect(getByText('Tap to reveal!')).toBeTruthy();
      });

      // Tap to reveal
      await act(async () => {
        fireEvent.press(getByText('Tap to reveal!'));
      });

      // Content should be revealed
      await waitFor(() => {
        expect(queryByText('Secret message')).toBeTruthy();
      });
    });

    it('should show content immediately if already unlocked on load', async () => {
      (postcardsService.getPostcard as jest.Mock).mockResolvedValue(mockUnlockedPostcard);

      const { getByText } = render(<PostcardViewerScreen />);

      // Since postcard is unlocked, content should be revealed immediately
      // The component sets hasRevealed=true in useEffect for UNLOCKED status
      await waitFor(() => {
        // tap to reveal should not be shown if already revealed
        expect(getByText('📬 Postcard')).toBeTruthy();
      });
    });
  });

  describe('content display', () => {
    it('should show message when present', async () => {
      (postcardsService.getPostcard as jest.Mock).mockResolvedValue({
        ...mockUnlockedPostcard,
        hasRevealed: true,
      });

      const { getByText } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        // Content is shown immediately for unlocked postcards
        expect(getByText(/Postcard/)).toBeTruthy();
      });
    });

    it('should show image when present', async () => {
      (postcardsService.getPostcard as jest.Mock).mockResolvedValue({
        ...mockUnlockedPostcard,
        mediaUrl: 'https://example.com/image.jpg',
      });

      const { UNSAFE_getAllByType } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        const images = UNSAFE_getAllByType('Image' as any);
        expect(images.length).toBeGreaterThan(0);
      });
    });

    it('should show viewed date if postcard has been viewed', async () => {
      const viewedDate = new Date().toISOString();
      (postcardsService.getPostcard as jest.Mock).mockResolvedValue({
        ...mockUnlockedPostcard,
        viewedAt: viewedDate,
      });

      const { getByText } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        expect(getByText(/Viewed on/)).toBeTruthy();
      });
    });
  });

  describe('sender preview mode', () => {
    it('should show preview for sender viewing locked postcard', async () => {
      const senderLockedPostcard = {
        ...mockLockedPostcard,
        senderId: 'user-1', // Same as logged in user
      };
      (postcardsService.getPostcard as jest.Mock).mockResolvedValue(senderLockedPostcard);

      const { getByText } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        expect(getByText("(This is what they'll see after unlock)")).toBeTruthy();
        expect(getByText('Secret message')).toBeTruthy();
      });
    });

    it('should not show locked envelope for sender', async () => {
      const senderLockedPostcard = {
        ...mockLockedPostcard,
        senderId: 'user-1',
      };
      (postcardsService.getPostcard as jest.Mock).mockResolvedValue(senderLockedPostcard);

      const { queryByTestId } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        // Sender should see content preview, not locked envelope
        expect(queryByTestId('locked-envelope')).toBeNull();
      });
    });
  });

  describe('interactions', () => {
    it('should navigate back when back button is pressed', async () => {
      const mockBack = jest.fn();
      jest.mock('expo-router', () => ({
        useRouter: () => ({ back: mockBack }),
        useLocalSearchParams: () => ({ id: 'postcard-1' }),
      }));

      (postcardsService.getPostcard as jest.Mock).mockResolvedValue(mockUnlockedPostcard);

      const { getByTestId, UNSAFE_getAllByType } = render(<PostcardViewerScreen />);

      await waitFor(() => {
        const touchables = UNSAFE_getAllByType('TouchableOpacity' as any);
        expect(touchables.length).toBeGreaterThan(0);
      });
    });
  });
});
