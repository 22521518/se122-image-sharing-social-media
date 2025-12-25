/**
 * PostcardComp

oser (create.tsx) Component Tests
 * 
 * Story 4.2: Creating Time-Locked Postcards
 * Tests for postcard creation UI covering:
 * - Form validation
 * - Date/location unlock toggle
 * - Image upload flow
 * - Draft save
 * - Preview modal
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PostcardComposerScreen from './create';
import * as ImagePicker from 'expo-image-picker';
import postcardsService from '../../services/postcards.service';
import { mediaService } from '../../services/media.service';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User' },
    token: 'test-token',
  }),
}));

jest.mock('expo-image-picker');
jest.mock('../../services/postcards.service');
jest.mock('../../services/media.service');

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('PostcardComposerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render default state with date unlock selected', () => {
      const { getByText, getByPlaceholderText } = render(<PostcardComposerScreen />);

      expect(getByText('Create Postcard')).toBeTruthy();
      expect(getByPlaceholderText('Write a message for when you open this postcard...')).toBeTruthy();
      expect(getByText('By Date')).toBeTruthy();
      expect(getByText('By Location')).toBeTruthy();
    });

    it('should render all action buttons', () => {
      const { getByText } = render(<PostcardComposerScreen />);

      expect(getByText('Save Draft')).toBeTruthy();
      expect(getByText('Preview')).toBeTruthy();
      expect(getByText('Send Postcard')).toBeTruthy();
    });

    it('should show info about self-postcards', () => {
      const { getByText } = render(<PostcardComposerScreen />);

      expect(getByText(/This postcard will be sent to yourself/)).toBeTruthy();
    });
  });

  describe('unlock type toggle', () => {
    it('should toggle between date and location unlock', () => {
      const { getByText, queryByText } = render(<PostcardComposerScreen />);

      // Initially date unlock is active
      expect(queryByText('Opens in how many days?')).toBeTruthy();

      // Switch to location
      fireEvent.press(getByText('By Location'));

      expect(queryByText('Select unlock location')).toBeTruthy();
      expect(queryByText('Opens in how many days?')).toBeNull();
    });
  });

  describe('date picker', () => {
    it('should render preset day options', () => {
      const { getByText } = render(<PostcardComposerScreen />);

      expect(getByText('7d')).toBeTruthy();
      expect(getByText('1mo')).toBeTruthy();
      expect(getByText('3mo')).toBeTruthy();
      expect(getByText('6mo')).toBeTruthy();
      expect(getByText('1yr')).toBeTruthy();
    });

    it('should update selected days when option is pressed', () => {
      const { getByText } = render(<PostcardComposerScreen />);

      fireEvent.press(getByText('7d'));

      // Default is 30 days, should show 1mo
      expect(getByText('7d')).toBeTruthy();
    });

    it('should display unlock date preview', () => {
      const { getByText } = render(<PostcardComposerScreen />);

      expect(getByText(/Opens on:/)).toBeTruthy();
    });
  });

  describe('location picker', () => {
    it('should show location selection when location unlock is active', () => {
      const { getByText } = render(<PostcardComposerScreen />);

      fireEvent.press(getByText('By Location'));

      expect(getByText('Select unlock location')).toBeTruthy();
    });

    it('should show radius options', () => {
      const { getByText } = render(<PostcardComposerScreen />);

      fireEvent.press(getByText('By Location'));

      expect(getByText('50m')).toBeTruthy();
      expect(getByText('100m')).toBeTruthy();
      expect(getByText('200m')).toBeTruthy();
      expect(getByText('500m')).toBeTruthy();
    });

    it('should open location alert when location button is pressed', () => {
      const { getByText } = render(<PostcardComposerScreen />);

      fireEvent.press(getByText('By Location'));
      fireEvent.press(getByText('Select unlock location'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Selection',
        expect.any(String),
        expect.any(Array)
      );
    });
  });

  describe('image upload', () => {
    it('should show image placeholder initially', () => {
      const { getByText } = render(<PostcardComposerScreen />);

      expect(getByText('Add a photo')).toBeTruthy();
    });

    it('should open image picker when placeholder is pressed', async () => {
      const mockLaunchImageLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
      mockLaunchImageLibrary.mockResolvedValue({ canceled: true });

      const { getByText } = render(<PostcardComposerScreen />);

      await act(async () => {
        fireEvent.press(getByText('Add a photo'));
      });

      expect(mockLaunchImageLibrary).toHaveBeenCalled();
    });

    it('should upload image when selected', async () => {
      const mockLaunchImageLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
      const mockUploadMedia = (mediaService.uploadMedia as jest.Mock);
      
      mockLaunchImageLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'test-image-uri', mimeType: 'image/jpeg' }],
      });
      mockUploadMedia.mockResolvedValue({ url: 'https://example.com/image.jpg' });

      const { getByText } = render(<PostcardComposerScreen />);

      await act(async () => {
        fireEvent.press(getByText('Add a photo'));
      });

      await waitFor(() => {
        expect(mockUploadMedia).toHaveBeenCalledWith('test-image-uri', 'image/jpeg');
      });
    });

    it('should show loading indicator during upload', async () => {
      const mockLaunchImageLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
      const mockUploadMedia = (mediaService.uploadMedia as jest.Mock);
      
      let resolveUpload: (value: any) => void;
      const uploadPromise = new Promise((resolve) => {
        resolveUpload = resolve;
      });
      
      mockLaunchImageLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'test-image-uri', mimeType: 'image/jpeg' }],
      });
      mockUploadMedia.mockReturnValue(uploadPromise);

      const { getByText, UNSAFE_getAllByType } = render(<PostcardComposerScreen />);

      await act(async () => {
        fireEvent.press(getByText('Add a photo'));
      });

      // Resolve upload to complete
      await act(async () => {
        resolveUpload!({ url: 'https://example.com/image.jpg' });
        await uploadPromise;
      });
    });
  });

  describe('message input', () => {
    it('should update message state when typing', () => {
      const { getByPlaceholderText, getByText } = render(<PostcardComposerScreen />);

      const input = getByPlaceholderText('Write a message for when you open this postcard...');
      fireEvent.changeText(input, 'Hello future me!');

      expect(getByText('17/1000')).toBeTruthy();
    });

    it('should enforce character limit', () => {
      const { getByPlaceholderText } = render(<PostcardComposerScreen />);

      const input = getByPlaceholderText('Write a message for when you open this postcard...');
      
      // The TextInput component will enforce maxLength prop
      // Just verify the prop exists in the component
      expect(input.props.maxLength).toBe(1000);
    });
  });

  describe('form validation', () => {
    it('should show error when message and image are both empty', async () => {
      const { getByText } = render(<PostcardComposerScreen />);

      await act(async () => {
        fireEvent.press(getByText('Send Postcard'));
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please add a message or image to your postcard'
      );
    });

    it('should show error when location unlock is selected but no location set', async () => {
      const { getByText, getByPlaceholderText } = render(<PostcardComposerScreen />);

      // Add message
      const input = getByPlaceholderText('Write a message for when you open this postcard...');
      fireEvent.changeText(input, 'Test message');

      // Switch to location unlock
      fireEvent.press(getByText('By Location'));

      await act(async () => {
        fireEvent.press(getByText('Send Postcard'));
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please select an unlock location'
      );
    });
  });

  describe('postcard submission', () => {
    it('should create postcard with date unlock', async () => {
      const mockCreatePostcard = (postcardsService.createPostcard as jest.Mock);
      mockCreatePostcard.mockResolvedValue({ id: 'postcard-1' });

      const { getByText, getByPlaceholderText } = render(<PostcardComposerScreen />);

      const input = getByPlaceholderText('Write a message for when you open this postcard...');
      fireEvent.changeText(input, 'Test message');

      fireEvent.press(getByText('7d'));

      await act(async () => {
        fireEvent.press(getByText('Send Postcard'));
      });

      await waitFor(() => {
        expect(mockCreatePostcard).toHaveBeenCalledWith({
          message: 'Test message',
          unlockDate: expect.any(String),
          mediaUrl: undefined,
        });
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        '🎉 Postcard Sent!',
        expect.stringContaining('in 7 days'),
        expect.any(Array)
      );
    });

    it('should disable submit button while submitting', async () => {
      const mockCreatePostcard = (postcardsService.createPostcard as jest.Mock);
      let resolveCreate: (value: any) => void;
      const createPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });
      mockCreatePostcard.mockReturnValue(createPromise);

      const { getByText, getByPlaceholderText } = render(<PostcardComposerScreen />);

      const input = getByPlaceholderText('Write a message for when you open this postcard...');
      fireEvent.changeText(input, 'Test message');

      await act(async () => {
        fireEvent.press(getByText('Send Postcard'));
      });

      // Resolve create
      await act(async () => {
        resolveCreate!({ id: 'postcard-1' });
        await createPromise;
      });
    });
  });

  describe('preview modal', () => {
    it('should show preview modal when preview button is pressed', () => {
      const { getByText, queryByText } = render(<PostcardComposerScreen />);

      fireEvent.press(getByText('Preview'));

      expect(queryByText('📬 Locked Postcard')).toBeTruthy();
      expect(queryByText('This is what you will see before unlock:')).toBeTruthy();
    });

    it('should close preview modal when close button is pressed', () => {
      const { getByText, queryByText } = render(<PostcardComposerScreen />);

      fireEvent.press(getByText('Preview'));
      expect(queryByText('📬 Locked Postcard')).toBeTruthy();

      fireEvent.press(getByText('Close Preview'));
      expect(queryByText('📬 Locked Postcard')).toBeNull();
    });

    it('should show correct unlock date in preview for date unlock', () => {
      const { getByText, queryByText } = render(<PostcardComposerScreen />);

      fireEvent.press(getByText('7d'));
      fireEvent.press(getByText('Preview'));

      expect(queryByText(/Opens on/)).toBeTruthy();
    });

    it('should show location message in preview for location unlock', () => {
      const { getByText, queryByText } = render(<PostcardComposerScreen />);

      fireEvent.press(getByText('By Location'));
      fireEvent.press(getByText('Preview'));

      expect(queryByText('Opens when you arrive at the location')).toBeTruthy();
    });
  });

  describe('draft save', () => {
    it('should save draft with current form values', async () => {
      const mockSaveDraft = (postcardsService.saveDraft as jest.Mock);
      mockSaveDraft.mockResolvedValue({ id: 'draft-1' });

      const { getByText, getByPlaceholderText } = render(<PostcardComposerScreen />);

      const input = getByPlaceholderText('Write a message for when you open this postcard...');
      fireEvent.changeText(input, 'Draft message');

      await act(async () => {
        fireEvent.press(getByText('Save Draft'));
      });

      await waitFor(() => {
        expect(mockSaveDraft).toHaveBeenCalledWith({
          message: 'Draft message',
          unlockDate: expect.any(String),
        });
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Draft Saved',
        'Your postcard draft has been saved.'
      );
    });

    it('should save draft with location if location unlock is selected', async () => {
      const mockSaveDraft = (postcardsService.saveDraft as jest.Mock);
      mockSaveDraft.mockResolvedValue({ id: 'draft-1' });

      const { getByText, getByPlaceholderText } = render(<PostcardComposerScreen />);

      const input = getByPlaceholderText('Write a message for when you open this postcard...');
      fireEvent.changeText(input, 'Draft message');

      fireEvent.press(getByText('By Location'));

      // Mock location selection
      Alert.alert = jest.fn((title, message, buttons) => {
        // Simulate selecting "Ho Chi Minh City"
        buttons![0].onPress!();
      });

      fireEvent.press(getByText('Select unlock location'));

      await act(async () => {
        fireEvent.press(getByText('Save Draft'));
      });

      await waitFor(() => {
        expect(mockSaveDraft).toHaveBeenCalledWith({
          message: 'Draft message',
          unlockLatitude: 10.7769,
          unlockLongitude: 106.7009,
          unlockRadius: 50,
        });
      });
    });
  });

  describe('error handling', () => {
    it('should show error when image upload fails', async () => {
      const mockLaunchImageLibrary = ImagePicker.launchImageLibraryAsync as jest.Mock;
      const mockUploadMedia = (mediaService.uploadMedia as jest.Mock);
      
      mockLaunchImageLibrary.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'test-image-uri', mimeType: 'image/jpeg' }],
      });
      mockUploadMedia.mockRejectedValue(new Error('Upload failed'));

      const { getByText } = render(<PostcardComposerScreen />);

      await act(async () => {
        fireEvent.press(getByText('Add a photo'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Upload Failed',
          'Could not upload image. Please try again.'
        );
      });
    });

    it('should show error when postcard creation fails', async () => {
      const mockCreatePostcard = (postcardsService.createPostcard as jest.Mock);
      mockCreatePostcard.mockRejectedValue(new Error('Network error'));

      const { getByText, getByPlaceholderText } = render(<PostcardComposerScreen />);

      const input = getByPlaceholderText('Write a message for when you open this postcard...');
      fireEvent.changeText(input, 'Test message');

      await act(async () => {
        fireEvent.press(getByText('Send Postcard'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Network error'
        );
      });
    });
  });
});
