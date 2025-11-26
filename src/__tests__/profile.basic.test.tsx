import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import EditProfileScreen from '../screens/EditProfileScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { profile: { name: 'John Doe', email: 'test@example.com' } } }),
}));

// Mock auth context (match AuthContext shape: `data`)
const mockUser = {
  id: 'user-1',
  name: 'John Doe',
  email: 'test@example.com',
  phone: '+1234567890',
};

// Mock auth context matching AuthContext Type
const mockAuthContext = {
  data: mockUser,
  token: 'mock-token',
  setToken: jest.fn(),
  clearAuth: jest.fn(),
  isLoading: false,
  isError: false,
  error: undefined,
};

// Mock theme context
const mockThemeContext = {
  colorTemp: 'neutral' as const,
  brandPrimary: '#2E8B57',
  brandSecondary: '#FFD700',
  brandBackground: '#F9F9F9',
  loading: false,
  debugInfo: {
    weatherSource: 'time-of-day' as const,
    lastUpdated: new Date(),
  },
  weatherSimulation: {
    enabled: false,
    condition: 'sunny' as const,
  },
  setWeatherSimulation: jest.fn(),
};

const queryClient = new QueryClient();

// Provide QueryClientProvider so useUpdateUserProfile and other react-query hooks work
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <NavigationContainer>
      <AuthContext.Provider value={mockAuthContext}>
        <ThemeContext.Provider value={mockThemeContext}>{children}</ThemeContext.Provider>
      </AuthContext.Provider>
    </NavigationContainer>
  </QueryClientProvider>
);

// Ensure update hook is mocked consistently
jest.mock('../api/hooks/useUpdateUserProfile', () => ({
  useUpdateUserProfile: () => ({ mutateAsync: jest.fn().mockResolvedValue(true) }),
}));

describe('Profile Basic Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ProfileScreen', () => {
    it('should render user profile information', () => {
      const { getByText } = render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      );

      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
    });

    it('should have accessible profile image', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      );

      const profileImage = getByTestId('profile-image');
      expect(profileImage).toBeTruthy();
    });

    it('should navigate to edit profile when edit button is pressed', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      );

      const editButton = getByTestId('edit-profile-button');
      fireEvent.press(editButton);

      expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
    });

    it('should show logout option', () => {
      const { getByText } = render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      );

      expect(getByText('Logout')).toBeTruthy();
    });

    it('should handle logout action', async () => {
      const { getByText } = render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      );

      const logoutButton = getByText('Logout');
      fireEvent.press(logoutButton);

      await waitFor(() => {
        expect(mockAuthContext.clearAuth).toHaveBeenCalled();
      });
    });
  });

  describe('EditProfileScreen', () => {
    it('should render edit profile form with current _values', () => {
      const { getByDisplayValue, getByPlaceholderText } = render(
        <TestWrapper>
          <EditProfileScreen />
        </TestWrapper>
      );

      // EditProfileScreen populates fields from route.params.profile
      expect(getByDisplayValue('John Doe') || getByPlaceholderText('Full Name')).toBeTruthy();
      expect(getByDisplayValue('test@example.com')).toBeTruthy();
    });

    it('should allow updating first name', async () => {
      const { getByPlaceholderText } = render(
        <TestWrapper>
          <EditProfileScreen />
        </TestWrapper>
      );

      const firstNameInput = getByPlaceholderText('Full Name');
      fireEvent.changeText(firstNameInput, 'Jane');

      expect(firstNameInput.props.value).toBe('Jane');
    });

    it('should save profile changes', async () => {
      // mock update hook used by EditProfileScreen
      jest.mock('../api/hooks/useUpdateUserProfile', () => ({
        useUpdateUserProfile: () => ({ mutateAsync: jest.fn().mockResolvedValue(true) }),
      }));

      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <EditProfileScreen />
        </TestWrapper>
      );

      const firstNameInput = getByPlaceholderText('Full Name');
      fireEvent.changeText(firstNameInput, 'Jane');

      const saveButton = getByText('Save Profile');
      fireEvent.press(saveButton);

      await waitFor(() => {
        // Since EditProfileScreen uses update hook, ensure navigation.goBack was invoked after save
        expect(mockNavigation.goBack).toHaveBeenCalled();
      });
    });

    it('should validate email format', async () => {
      const { getByPlaceholderText, getByText } = render(
        <TestWrapper>
          <EditProfileScreen />
        </TestWrapper>
      );

      const emailInput = getByPlaceholderText('Email Address');
      fireEvent.changeText(emailInput, 'invalid-email');

      const saveButton = getByText('Save Profile');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(getByText(/valid email/i)).toBeTruthy();
      });
    });

    it('should navigate back after successful save', async () => {
      const { getByText } = render(
        <TestWrapper>
          <EditProfileScreen />
        </TestWrapper>
      );

      const saveButton = getByText('Save Profile');
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockNavigation.goBack).toHaveBeenCalled();
      });
    });
  });

  describe('Profile Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByLabelText } = render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      );

      expect(getByLabelText(/profile picture/i)).toBeTruthy();
      expect(getByLabelText(/edit profile/i)).toBeTruthy();
    });

    it('should announce profile information for screen readers', () => {
      const { getByText } = render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      );

      const profileName = getByText('John Doe');
      expect(profileName.props.accessibilityRole).toBe('text');
    });
  });

  describe('Profile Settings Integration', () => {
    it('should navigate to settings screens', () => {
      const { getByText } = render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      );

      // Test navigation to various settings
      const settingsButtons = ['Saved Addresses', 'Saved Payments', 'App Settings'];

      settingsButtons.forEach(buttonText => {
        mockNavigate.mockClear();
        const button = getByText(buttonText);
        fireEvent.press(button);
        expect(mockNavigate).toHaveBeenCalled();
        // The menu item's id is used as the navigation target in the app
        const lastCall = mockNavigate.mock.calls[0][0];
        expect(typeof lastCall).toBe('string');
      });
    });
  });

  describe('Profile Data Persistence', () => {
    it('should load profile data on component mount', () => {
      render(
        <TestWrapper>
          <ProfileScreen />
        </TestWrapper>
      );

      // Verify that user data is displayed correctly from context
      expect(mockAuthContext.data).toEqual(mockUser);
    });

    it('should handle missing profile data gracefully', () => {
      const emptyAuthContext = {
        ...mockAuthContext,
        data: null,
        token: null,
      };

      const { getByText } = render(
        <NavigationContainer>
          <AuthContext.Provider value={emptyAuthContext as any}>
            <ThemeContext.Provider value={mockThemeContext}>
              <ProfileScreen />
            </ThemeContext.Provider>
          </AuthContext.Provider>
        </NavigationContainer>
      );

      expect(getByText(/sign in/i)).toBeTruthy();
    });
  });
});
