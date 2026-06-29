module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(msw|@bundled-es-modules|rettime|strict-event-emitter|@mswjs|outvariant|@open-draft|data-uri-to-buffer|formdata-node|fetch-blob|web-streams-polyfill|graphql)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^expo-router/head$': '<rootDir>/__mocks__/expo-router-head.js',
  },
  testMatch: [
    '**/__tests__/**/*.{ts,tsx}',
    '**/*.test.{ts,tsx}',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!**/__tests__/**',
    '!**/*.test.{ts,tsx}',
    // Exclude React Native UI components (require complex mocks - not testable without jest-expo preset)
    '!src/screens/**',
    '!src/components/**',
    '!src/contexts/**',
    '!src/navigation/**',
    // Exclude files with TypeScript errors
    '!src/services/reminders.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'text', 'lcov'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
  },
};
