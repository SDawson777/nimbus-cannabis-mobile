// Mock for @react-native-firebase/app
module.exports = {
  default: () => ({
    apps: [],
    initializeApp: jest.fn(),
    app: jest.fn(() => ({
      name: 'test-app',
      options: {},
    })),
  }),
  firebase: {
    apps: [],
    initializeApp: jest.fn(),
    app: jest.fn(),
  },
};
