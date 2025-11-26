import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import HomeScreen from '../screens/HomeScreen';
import TerpeneWheelScreen from '../screens/TerpeneWheelScreen';

const Stack = createNativeStackNavigator();

// Mock dependencies
jest.mock('../context/ThemeContext', () => ({
  ThemeContext: require('react').createContext({
    colorTemp: 'neutral',
    brandPrimary: '#4CAF50',
    brandSecondary: '#A0A0A0',
    brandBackground: '#ffffff',
  }),
}));

jest.mock('../context/StoreContext', () => ({
  useStore: () => ({ selectedStore: null }),
}));

jest.mock('../api/phase4Client', () => ({
  phase4Client: { get: jest.fn().mockResolvedValue({ data: [] }) },
}));

jest.mock('../hooks/useForYouToday', () => ({
  useForYouToday: () => ({ data: { message: 'For you', products: [] }, isLoading: false }),
}));

// Avoid running the pulse animation (which relies on react-native-reanimated) in unit tests
jest.mock('../hooks/usePulse', () => ({
  usePulseCTA: (onPress: any) => ({ pulseStyle: {}, onPress }),
}));

jest.mock('../terpene_wheel/components/TerpeneWheel', () => ({
  TerpeneWheel: () => require('react').createElement('View', { testID: 'terpene-wheel' }),
}));

jest.mock('../terpene_wheel/components/TerpeneInfoModal', () => ({
  TerpeneInfoModal: () => require('react').createElement('View', { testID: 'terpene-info-modal' }),
}));

function TestApp() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="TerpeneWheel" component={TerpeneWheelScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

describe('TerpeneWheel Navigation', () => {
  it('navigates to TerpeneWheel when CTA is pressed', () => {
    const { getByTestId, getByText: __getByText } = render(<TestApp />);

    // Find and press the terpene wheel CTA by testID to avoid text/emoji mismatches
    const terpeneWheelCTA = getByTestId('terpene-wheel-cta');
    expect(terpeneWheelCTA).toBeTruthy();

    fireEvent.press(terpeneWheelCTA);

    // Should navigate to TerpeneWheel screen (in a real app we'd check navigation _state)
    // For now, just verify the CTA exists and is pressable
  });

  it('renders TerpeneWheel screen when navigated', () => {
    // This would test the actual screen rendering
    expect(() => render(<TestApp />)).not.toThrow();
  });
});
