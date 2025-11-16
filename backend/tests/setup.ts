// Test setup file to configure mocks and test environment
// This runs before each test suite

import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JEST_WORKER_ID = '1';

// Mock Firebase Admin SDK to prevent initialization issues
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(() => ({
    name: 'test-app',
    options: {},
  })),
  credential: {
    cert: jest.fn(() => ({})),
  },
  app: jest.fn(() => ({
    name: 'test-app',
    options: {},
  })),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(() => Promise.resolve({ exists: false, data: () => null })),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      get: jest.fn(() => Promise.resolve({ docs: [] })),
      add: jest.fn(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
    doc: jest.fn(() => ({
      set: jest.fn(),
      get: jest.fn(() => Promise.resolve({ exists: false, data: () => null })),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  })),
  storage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({
        save: jest.fn(),
        download: jest.fn(),
        delete: jest.fn(),
      })),
    })),
  })),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'test-uid' })),
    createUser: jest.fn(),
    deleteUser: jest.fn(),
    getUser: jest.fn(),
  })),
}));

// Mock the Firebase bootstrap module
jest.mock('../src/bootstrap/firebase-admin', () => ({
  initFirebase: jest.fn(() => ({
    name: 'test-app',
    options: {},
  })),
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(() => Promise.resolve({ exists: false, data: () => null })),
      })),
    })),
  })),
  admin: {
    apps: [],
    initializeApp: jest.fn(),
    firestore: jest.fn(),
  },
}));

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

console.log('✅ Test setup completed - Firebase mocked for testing');
