import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ThemeContext } from '../context/ThemeContext';

// mock the hook before requiring the screen
jest.mock('../hooks/useProductDetails', () => ({
  useProductDetails: jest.fn(),
}));

// mock navigation hook useRoute to provide slug param
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { slug: 'prod-1' } }),
}));

// mock store context hook
jest.mock('../context/StoreContext', () => ({
  useStore: () => ({ preferredStore: null }),
}));

const { useProductDetails } = require('../hooks/useProductDetails');

describe('ProductDetailScreen integration', () => {
  afterEach(() => jest.resetAllMocks());

  it('renders product with variants', async () => {
    const product = {
      id: 'prod-1',
      name: 'Test Product',
      image: { url: 'http://example.com/img.jpg' },
      effects: ['Relaxed', 'Happy'],
    };
    const variants = [
      { id: 'v1', name: 'Small', price: 10.0, stock: 3 },
      { id: 'v2', name: 'Large', price: 18.5, stock: 0 },
    ];

    (useProductDetails as jest.Mock).mockReturnValue({
      data: { product, variants },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isFetching: false,
    });

    // require the screen after mock
    const ProductDetailScreen = require('../screens/ProductDetailScreen').default;

    const theme = {
      colorTemp: 'neutral' as const,
      brandPrimary: '#000',
      brandSecondary: '#666',
      brandBackground: '#fff',
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

    const { getByText } = render(
      <ThemeContext.Provider value={theme}>
        <ProductDetailScreen />
      </ThemeContext.Provider>
    );

    await waitFor(() => {
      expect(getByText('Test Product')).toBeTruthy();
      expect(getByText('Small')).toBeTruthy();
      expect(getByText('Large')).toBeTruthy();
      expect(getByText('$10.00')).toBeTruthy();
      expect(getByText('$18.50')).toBeTruthy();
      // low stock alert for Small (stock 3 -> not low), Large is sold out so shows Sold Out in StockAlert via selectedVariant logic
    });
  });
});
