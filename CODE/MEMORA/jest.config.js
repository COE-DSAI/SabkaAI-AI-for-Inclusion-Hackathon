module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|expo-modules-core|expo-file-system|expo-media-library|expo-background-fetch|expo-task-manager|expo-device|expo-image-picker|expo-camera|expo-crypto|@react-navigation|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|react-native-reanimated|react-native-paper|react-native-vector-icons|@reduxjs/toolkit|redux-persist|@tensorflow/tfjs|@tensorflow-models)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock @env for testing (react-native-dotenv)
    '^@env$': '<rootDir>/__mocks__/@env.js',
    // Mock TensorFlow.js modules for testing
    '^@tensorflow/tfjs$': '<rootDir>/__mocks__/@tensorflow/tfjs.js',
    '^@tensorflow-models/mobilenet$': '<rootDir>/__mocks__/@tensorflow-models/mobilenet.js',
    '^@tensorflow-models/coco-ssd$': '<rootDir>/__mocks__/@tensorflow-models/coco-ssd.js',
    // Mock Tesseract.js for testing
    '^tesseract\\.js$': '<rootDir>/__mocks__/tesseract.js/index.js',
  },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
};
