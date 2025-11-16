/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: '<rootDir>/tests/custom-node-environment.js',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', isolatedModules: true }],
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/__mocks__/**'],
  coverageThreshold: { global: { branches: 10, functions: 10, lines: 10, statements: 10 } },
  // Mock modules that might cause issues in Node environment
  moduleNameMapping: {
    '^@react-native-firebase/(.*)$': '<rootDir>/tests/__mocks__/@react-native-firebase/$1.js',
  },
};
