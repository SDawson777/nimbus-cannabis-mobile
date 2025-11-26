import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
jest.mock('react-native', () => {
  const React = require('react');
  return {
    View: ({ children }: any) => React.createElement('View', null, children),
    Text: ({ children }: any) => React.createElement('Text', null, children),
    SafeAreaView: ({ children }: any) => React.createElement('SafeAreaView', null, children),
    FlatList: ({ data, renderItem, onEndReached }: any) => {
      // call onEndReached asynchronously to simulate scrolling to list end
      if (typeof onEndReached === 'function') setTimeout(onEndReached, 0);
      return React.createElement(
        'FlatList',
        null,
        data.map((item: any, index: number) =>
          // wrap each rendered item in a keyed container to satisfy React
          React.createElement('View', { key: item?.id ?? index }, renderItem({ item, index }))
        )
      );
    },
    RefreshControl: () => null,
    ActivityIndicator: () => React.createElement('ActivityIndicator'),
    Pressable: ({ children, onPress }: any) =>
      React.createElement('Pressable', { onClick: onPress }, children),
    Modal: ({ children }: any) => React.createElement('Modal', null, children),
    ScrollView: ({ children }: any) => React.createElement('ScrollView', null, children),
    StyleSheet: { create: (s: any) => s },
  };
});

jest.mock('lucide-react-native', () => ({
  X: () => null,
}));

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

jest.mock('../context/ThemeContext', () => {
  const React = require('react');
  return {
    ThemeContext: React.createContext({
      colorTemp: 'neutral',
      brandPrimary: '#000',
      brandSecondary: '#888',
      brandBackground: '#FFF',
      loading: false,
    }),
  };
});

import * as orderClient from '../clients/orderClient';
import OrderHistoryScreen from '../screens/orders/OrderHistoryScreen';

jest.mock('../clients/orderClient');
jest.mock('../utils/haptic', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
}));
jest.mock('../components/useSkeletonText', () => () => null);

describe('OrderHistoryScreen', () => {
  it('renders orders from api', async () => {
    // Mock two pages: first returns nextPage=2, second returns no nextPage
    const firstPage = {
      orders: [
        {
          id: '1',
          createdAt: '2025-01-01',
          total: 10,
          status: 'Completed',
          store: 'Store',
          items: [],
          subtotal: 8,
          taxes: 1,
          fees: 1,
        },
      ],
      nextPage: 2,
    };
    const secondPage = {
      orders: [
        {
          id: '2',
          createdAt: '2025-01-02',
          total: 12,
          status: 'Completed',
          store: 'Store',
          items: [],
          subtotal: 10,
          taxes: 1,
          fees: 1,
        },
      ],
    };

    const __mockFetch = (orderClient.fetchOrders as jest.Mock).mockImplementation(
      (page: number) => {
        if (page === 1) return Promise.resolve(firstPage);
        if (page === 2) return Promise.resolve(secondPage);
        return Promise.resolve({ orders: [] });
      }
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let tree: renderer.ReactTestRenderer | undefined;
    await act(async () => {
      tree = renderer.create(
        <QueryClientProvider client={client}>
          <OrderHistoryScreen />
        </QueryClientProvider>
      );
      // give async effects (react-query) a couple ticks to settle
      await new Promise(resolve => setTimeout(resolve, 0));
      await new Promise(resolve => setTimeout(resolve, 0));
      // Simulate reaching end to trigger fetchNextPage (FlatList mock calls onEndReached)
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const texts = tree!.root
      .findAllByType('Text' as any)
      .map(n => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children));
    // Both orders from page 1 and page 2 should be rendered
    expect(texts).toContain('Order #1');
    expect(texts).toContain('Order #2');
  });
});
