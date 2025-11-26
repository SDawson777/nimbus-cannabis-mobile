// Mock react-native-render-html to render HTML as Text for test queries
jest.mock('react-native-render-html', () => {
  return function MockRenderHTML(props: any) {
    const Text = require('react-native').Text;
    const View = require('react-native').View;
    const Fragment = require('react').Fragment;
    const { source, children, testID, ...rest } = props;
    const innerText = source.html.replace(/<[^>]+>/g, '');
    if (testID) {
      return (
        <View testID={testID}>
          <Text {...rest}>{innerText}</Text>
          {children}
        </View>
      );
    }
    return (
      <Fragment>
        <Text {...rest}>{innerText}</Text>
        {children}
      </Fragment>
    );
  };
});
// Mock useWindowDimensions to avoid test crash
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return Object.assign({}, RN, {
    useWindowDimensions: () => ({ width: 400, height: 800, scale: 2, fontScale: 1 }),
  });
});
import React from 'react';
import { render } from '@testing-library/react-native';
import { within } from '@testing-library/react-native';
import LegalScreen from './LegalScreen';
import { ThemeContext } from '../../context/ThemeContext';
import * as storeModule from '../../state/store';
import * as legalHook from '../../hooks/useLegal';

const theme = {
  colorTemp: 'neutral' as const,
  brandPrimary: '#222',
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

describe('LegalScreen', () => {
  function setup({ state, legalContent }: { state: string; legalContent: any }) {
    jest.spyOn(storeModule, 'usePreferredStore').mockImplementation((selector?: any) => {
      const store = { preferredStore: { state }, setPreferredStore: jest.fn(), hydrate: jest.fn() };
      return selector ? selector(store) : store;
    });
    jest.spyOn(legalHook, 'useLegal').mockReturnValue({
      data: legalContent,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
      isFetching: false,
      isSuccess: true,
      isStale: false,
      isRefetching: false,
      status: 'success',
      failureCount: 0,
      isPlaceholderData: false,
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: Date.now(),
      fetchStatus: 'idle',
      isLoadingError: false,
      isRefetchError: false,
      isPending: false,
      isInitialLoading: false,
      isFetched: true,
      isFetchedAfterMount: true,
      failureReason: null,
      errorUpdateCount: 0,
      isPaused: false,
      isEnabled: true,
      promise: Promise.resolve(legalContent),
    });
    return render(
      <ThemeContext.Provider value={theme}>
        <LegalScreen />
      </ThemeContext.Provider>
    );
  }

  it('renders MI state notice', () => {
    const legalContent = {
      stateNotices: { MI: '<p>Michigan Notice</p>' },
      lastUpdated: { 'state-MI': '2025-09-01T00:00:00Z' },
    };
    const { getByTestId } = setup({ state: 'MI', legalContent });
    const noticeContainer = getByTestId('state-notice-html');
    expect(within(noticeContainer).getByText('Michigan Notice')).toBeTruthy();
    expect(within(noticeContainer).getByText(/State notice last updated/)).toBeTruthy();
  });

  it('renders AZ state notice', () => {
    const legalContent = {
      stateNotices: { AZ: '<p>Arizona Notice</p>' },
      lastUpdated: { 'state-AZ': '2025-08-15T00:00:00Z' },
    };
    const { getByTestId } = setup({ state: 'AZ', legalContent });
    const noticeContainer = getByTestId('state-notice-html');
    expect(within(noticeContainer).getByText('Arizona Notice')).toBeTruthy();
    expect(within(noticeContainer).getByText(/State notice last updated/)).toBeTruthy();
  });

  it('does not render state notice if none for state', () => {
    const legalContent = {
      stateNotices: { CA: '<p>California Notice</p>' },
      lastUpdated: { 'state-CA': '2025-07-01T00:00:00Z' },
    };
    const { queryByTestId } = setup({ state: 'AZ', legalContent });
    expect(queryByTestId('state-notice-html')).toBeNull();
  });
});
