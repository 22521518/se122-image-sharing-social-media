import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FollowButton } from './FollowButton';
import { socialService } from '../../services/social.service';
import { Alert } from 'react-native';

// Mock social service
jest.mock('../../services/social.service', () => ({
  socialService: {
    followUser: jest.fn(),
    unfollowUser: jest.fn(),
  },
}));

// Mock ThemedText
jest.mock('../themed-text', () => ({
  ThemedText: ({ children, style, ...props }: any) => <>{children}</>,
}));

// Mock useThemeColor
jest.mock('../../hooks/use-theme-color', () => ({
  useThemeColor: jest.fn().mockReturnValue('#000'),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');


describe('FollowButton', () => {
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with initial following state', () => {
    const { getByText } = render(<FollowButton userId={userId} initialIsFollowing={true} />);
    expect(getByText('Following')).toBeTruthy();
  });

  it('renders correctly with initial not following state', () => {
    const { getByText } = render(<FollowButton userId={userId} initialIsFollowing={false} />);
    expect(getByText('Follow')).toBeTruthy();
  });

  it('calls followUser when clicked and not following', async () => {
    (socialService.followUser as jest.Mock).mockResolvedValue({});
    const { getByText } = render(<FollowButton userId={userId} initialIsFollowing={false} />);
    
    fireEvent.press(getByText('Follow'));

    // Optimistic update
    expect(getByText('Following')).toBeTruthy();
    
    await waitFor(() => {
      expect(socialService.followUser).toHaveBeenCalledWith(userId);
    });
  });

  it('shows confirmation dialog when clicked and following', async () => {
    const { getByText } = render(<FollowButton userId={userId} initialIsFollowing={true} />);
    
    fireEvent.press(getByText('Following'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Unfollow',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('calls unfollowUser when confirmation is accepted', async () => {
    (socialService.unfollowUser as jest.Mock).mockResolvedValue({});
    
    // Mock Alert to execute the "Unfollow" action immediately
    (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
      const unfollowButton = buttons.find((b: any) => b.text === 'Unfollow');
      unfollowButton.onPress();
    });

    const { getByText } = render(<FollowButton userId={userId} initialIsFollowing={true} />);
    
    fireEvent.press(getByText('Following'));

    await waitFor(() => {
      expect(socialService.unfollowUser).toHaveBeenCalledWith(userId);
    });
    
    expect(getByText('Follow')).toBeTruthy();
  });

  it('reverts optimistic update on error', async () => {
    (socialService.followUser as jest.Mock).mockRejectedValue(new Error('Failed'));
    const { getByText } = render(<FollowButton userId={userId} initialIsFollowing={false} />);
    
    fireEvent.press(getByText('Follow'));
    expect(getByText('Following')).toBeTruthy(); // Optimistic

    await waitFor(() => {
      expect(getByText('Follow')).toBeTruthy(); // Reverted
    });
  });
});
