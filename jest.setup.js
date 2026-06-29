// Mock React Native Platform
global.Platform = {
  OS: 'web',
  select: (obj) => obj.web || obj.default,
};

// Mock React Native StyleSheet
global.StyleSheet = {
  create: (styles) => styles,
  hairlineWidth: 1,
};

// Mock process.env for tests
process.env.EXPO_PUBLIC_BACKEND_URL = 'http://localhost:8001';
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// MSW Setup commented out due to Jest compatibility issues with MSW 2.x
// Uncomment after downgrading to MSW 1.x: npm install msw@1.3.2
// const { setupServer } = require('msw/node');
// const server = setupServer();
// beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
// afterEach(() => server.resetHandlers());
// afterAll(() => server.close());
// global.mswServer = server;

