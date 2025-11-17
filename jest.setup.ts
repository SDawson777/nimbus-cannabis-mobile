jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// Ensure UIManager.getViewManagerConfig exists in the test environment
try {
  jest.mock('react-native/Libraries/ReactNative/UIManager', () => ({
    getViewManagerConfig: () => undefined,
  }));
} catch {
  /* no-op: UIManager mock not available in this environment */
}
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Built-in matchers for RTL (prefer new entry; fallback to deprecated jest-native)
try {
  // RTL v12.4+ exposes this
  require('@testing-library/react-native/extend-expect');
} catch {
  try {
    require('@testing-library/jest-native/extend-expect');
  } catch {
    /* no-op; tests can still run without extended matchers */
  }
}

// Silence useNativeDriver warnings & Animated native helper
try {
  jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
} catch {
  /* no-op: NativeAnimatedHelper not available in this environment */
}

// Ensure __DEV__ is defined for tests that reference it
(globalThis as any).__DEV__ = true;

// Reanimated mock (v3-compatible)
try {
  // react-native-reanimated is mapped to a local mock via moduleNameMapper.
  // No-op here to avoid circular requires during setup.
  jest.mock('react-native-reanimated');
} catch {
  /* no-op: react-native-reanimated mock not available here */
}

// Polyfill TextEncoder/TextDecoder for Node environment used in Jest
if (typeof (global as any).TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  (global as any).TextEncoder = TextEncoder;
  (global as any).TextDecoder = TextDecoder;
}

// Mock fetch for Node.js test environment
if (typeof (global as any).fetch === 'undefined') {
  (global as any).fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          id: 'jars',
          name: 'JARS',
          slug: 'jars',
          primaryColor: '#16A34A',
          secondaryColor: '#15803D',
          logoUrl: null,
        }),
    })
  );
}

// Mock Prisma client during unit tests to avoid requiring `prisma generate` for CI/local dev
// Prisma mock is provided via a manual JS mock under `tests/__mocks__/@prisma/client.js`
// This ensures imports of `@prisma/client` at module-eval time resolve to the mock.

// If your code uses expo-constants or other Expo libs, you can add light mocks here:
// jest.mock('expo-constants', () => ({ default: { manifest: {} } }));

// Mock react-native-safe-area-context to provide initialWindow and hooks used by
// react-navigation in unit tests (node env has no native window).
try {
  jest.mock('react-native-safe-area-context', () => {
    const React = require('react');
    return {
      SafeAreaProvider: ({ children }: any) =>
        React.createElement('SafeAreaProvider', null, children),
      SafeAreaView: ({ children }: any) => React.createElement('SafeAreaView', null, children),
      useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
      initialWindow: { width: 1024, height: 768, scale: 1, fontScale: 1 },
    };
  });
} catch {
  // no-op if jest isn't available in this environment
}

// Provide a minimal UIManager shim; some react-navigation elements call
// UIManager.getViewManagerConfig which isn't available in the jsdom environment.
try {
  const UIManager = require('react-native/Libraries/ReactNative/UIManager');
  if (!UIManager.getViewManagerConfig) {
    UIManager.getViewManagerConfig = (_name: string) => undefined;
  }
} catch {
  // ignore if not present
}

// ---------------------------------------------------------------------------
// Suppress noisy test-time console output that is expected and not actionable
// - React "not wrapped in act(...)" warnings (tests often trigger async updates)
// - jsdom's AggregateError originating from XMLHttpRequest failures in tests
// We keep original console methods for anything else so real errors still surface.
// ---------------------------------------------------------------------------
{
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  const origLog = console.log.bind(console);

  const shouldIgnore = (args: any[]) => {
    try {
      // Check if any argument contains XMLHttpRequest or AggregateError patterns
      for (const arg of args) {
        if (arg && typeof arg === 'object') {
          // Check Error object properties
          if (
            arg.type === 'XMLHttpRequest' ||
            arg.name === 'AggregateError' ||
            (arg.message && arg.message.includes('AggregateError'))
          ) {
            return true;
          }

          // Check if it's an Error with XMLHttpRequest in the stack
          if (arg.stack && arg.stack.includes('xhr-utils.js')) {
            return true;
          }
        }
      }

      const joined = args
        .map(a => {
          if (typeof a === 'string') return a;
          if (a instanceof Error) return a.message + ' ' + a.stack;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(' ');

      // React act(...) warnings
      if (
        /not wrapped in act\(/i.test(joined) ||
        /An update to .* inside a test was not wrapped in act\(/i.test(joined)
      ) {
        return true;
      }

      // jsdom AggregateError originating from XHR (commonly noisy in tests)
      if (/AggregateError/.test(joined) && /XMLHttpRequest/.test(joined)) {
        return true;
      }

      // Additional XMLHttpRequest error patterns from jsdom
      if (/dispatchError/.test(joined) && /xhr-utils\.js/.test(joined)) {
        return true;
      }

      // More specific XMLHttpRequest noise filtering
      if (/xhr-utils\.js.*dispatchError/.test(joined)) {
        return true;
      }

      // App-level debug logs used during development but noisy in CI
      if (/^ShopScreen:/.test(joined)) return true;
      if (/^CartScreenMock/.test(joined)) return true;
      if (/^CheckoutScreenMock/.test(joined)) return true;
      if (/^Analytics Event:/.test(joined)) return true;

      // Analytics tracking failures (common in test env without real backends)
      if (/Analytics tracking failed/.test(joined)) return true;

      return false;
    } catch {
      return false;
    }
  };

  console.error = (...args: any[]) => {
    if (shouldIgnore(args)) return;
    origError(...args);
  };

  console.warn = (...args: any[]) => {
    if (shouldIgnore(args)) return;
    origWarn(...args);
  };

  // Also filter console.log output which some tests use for debug prints
  console.log = (...args: any[]) => {
    if (shouldIgnore(args)) return;
    origLog(...args);
  };
}
