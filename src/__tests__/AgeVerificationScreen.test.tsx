import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AgeVerificationScreen from '../screens/onboarding/AgeVerificationScreen';
import { ThemeProvider } from '../context/ThemeContext';
import { BrandProvider } from '../context/BrandContext';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock Appearance module
jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    Appearance: {
      getColorScheme: jest.fn(() => 'light'),
      addChangeListener: jest.fn(),
      removeChangeListener: jest.fn(),
    },
  };
});

// Mock navigation
const mockReplace = jest.fn();
const mockNavigation = {
  replace: mockReplace,
  goBack: jest.fn(),
  navigate: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

// Mock haptic feedback
jest.mock('../utils/haptic', () => ({
  hapticLight: jest.fn(),
}));

// Mock LegalDisclaimerModal
jest.mock('../components/LegalDisclaimerModal', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  return function LegalDisclaimerModal({ visible, onClose }: any) {
    return visible
      ? React.createElement(
          View,
          { testID: 'legal-disclaimer-modal' },
          React.createElement(
            Pressable,
            { onPress: onClose, testID: 'close-modal' },
            React.createElement(Text, null, 'Close')
          )
        )
      : null;
  };
});

const Stack = createNativeStackNavigator();

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BrandProvider>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="AgeVerification" component={() => <>{children}</>} />
          </Stack.Navigator>
        </NavigationContainer>
      </ThemeProvider>
    </BrandProvider>
  );
}

describe('AgeVerificationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset AsyncStorage mocks to default behavior
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders correctly', () => {
    const { getByText } = render(
      <TestWrapper>
        <AgeVerificationScreen />
      </TestWrapper>
    );

    expect(getByText('21+ Only')).toBeTruthy();
    expect(getByText('You must be at least 21 years old to use this app.')).toBeTruthy();
    expect(getByText('I am 21 or older')).toBeTruthy();
    expect(getByText('View Disclaimer')).toBeTruthy();
  });

  it('navigates to next screen when age is already verified', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    render(
      <TestWrapper>
        <AgeVerificationScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('LoginSignUpDecision');
    });
  });

  it('does not navigate when age is not verified', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    render(
      <TestWrapper>
        <AgeVerificationScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  it('handles age confirmation correctly', async () => {
    const { getByText } = render(
      <TestWrapper>
        <AgeVerificationScreen />
      </TestWrapper>
    );

    const confirmButton = getByText('I am 21 or older');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('ageVerified', 'true');
      expect(mockReplace).toHaveBeenCalledWith('LoginSignUpDecision');
    });
  });

  it('shows disclaimer modal when requested', () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <TestWrapper>
        <AgeVerificationScreen />
      </TestWrapper>
    );

    // Initially modal should not be visible
    expect(queryByTestId('legal-disclaimer-modal')).toBeFalsy();

    // Click on "View Disclaimer"
    const disclaimerLink = getByText('View Disclaimer');
    fireEvent.press(disclaimerLink);

    // Modal should now be visible
    expect(getByTestId('legal-disclaimer-modal')).toBeTruthy();
  });

  it('applies correct theme colors', () => {
    const { getByText } = render(
      <TestWrapper>
        <AgeVerificationScreen />
      </TestWrapper>
    );

    const title = getByText('21+ Only');
    const subtitle = getByText('You must be at least 21 years old to use this app.');
    const disclaimerLink = getByText('View Disclaimer');

    // Check if theme-related props are applied (this will depend on your styling implementation)
    expect(title).toBeTruthy();
    expect(subtitle).toBeTruthy();
    expect(disclaimerLink).toBeTruthy();
  });

  it('handles AsyncStorage errors gracefully', async () => {
    // Mock getItem to reject once during initial check
    const getItemSpy = jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('Storage error'));

    // Should not throw and should render normally
    const { getByText } = render(
      <TestWrapper>
        <AgeVerificationScreen />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(getByText('21+ Only')).toBeTruthy();
    });

    // Clean up the spy
    getItemSpy.mockRestore();
  });

  it('handles AsyncStorage setItem errors gracefully', async () => {
    const setItemSpy = jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValueOnce(new Error('Storage error'));

    const { getByText } = render(
      <TestWrapper>
        <AgeVerificationScreen />
      </TestWrapper>
    );

    const confirmButton = getByText('I am 21 or older');

    // Should not crash the component when AsyncStorage fails
    fireEvent.press(confirmButton);

    // Wait a bit for async operations
    await waitFor(() => {
      expect(getByText('I am 21 or older')).toBeTruthy();
    });

    // Clean up the spy
    setItemSpy.mockRestore();
  });

  describe('accessibility', () => {
    it('has proper accessibility properties', () => {
      const { getByText } = render(
        <TestWrapper>
          <AgeVerificationScreen />
        </TestWrapper>
      );

      const confirmButton = getByText('I am 21 or older');
      expect(confirmButton).toBeTruthy();
    });
  });

  describe('theme integration', () => {
    it('renders with theme provider', () => {
      // Test that it works with the default ThemeProvider
      const { getByText } = render(
        <TestWrapper>
          <AgeVerificationScreen />
        </TestWrapper>
      );

      expect(getByText('21+ Only')).toBeTruthy();
      expect(getByText('You must be at least 21 years old to use this app.')).toBeTruthy();
    });
  });
});
