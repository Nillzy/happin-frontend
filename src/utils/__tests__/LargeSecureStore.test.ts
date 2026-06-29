/**
 * Behavior-driven tests for LargeSecureStore.
 *
 * These tests focus on observable behavior (round-trip encryption, platform
 * dispatch, error propagation) rather than on the existence of methods.
 *
 * Test isolation: jest.resetModules() between test groups so that the
 * `Platform.OS` mock (which `LargeSecureStore` reads at construction time)
 * is freshly evaluated for each scenario.
 */

// In-memory state for the mocked AsyncStorage so we can simulate a real
// round-trip (setItem stores -> getItem retrieves the same bytes).
const asyncStorageState = new Map<string, string>();
const secureStoreState = new Map<string, string>();
const localStorageState = new Map<string, string>();

jest.mock('expo-crypto', () => ({
  // Deterministic "random" bytes so encrypt/decrypt are reproducible per test.
  getRandomBytesAsync: jest.fn(async (size: number) => {
    const arr = new Uint8Array(size);
    for (let i = 0; i < size; i++) arr[i] = (i * 31 + 7) & 0xff;
    return arr;
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => asyncStorageState.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      asyncStorageState.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      asyncStorageState.delete(k);
    }),
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => secureStoreState.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    secureStoreState.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    secureStoreState.delete(k);
  }),
}));

// react-native is set per describe-block (resetModules) — declared inline below.

describe('LargeSecureStore', () => {
  beforeEach(() => {
    asyncStorageState.clear();
    secureStoreState.clear();
    localStorageState.clear();
    jest.clearAllMocks();
  });

  describe('on iOS native platform', () => {
    let LargeSecureStore: typeof import('../LargeSecureStore').LargeSecureStore;

    beforeAll(() => {
      jest.resetModules();
      jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
      // Re-require with the new platform mock applied
      LargeSecureStore = require('../LargeSecureStore').LargeSecureStore;
    });

    it('should return null when no value is stored for the given key', async () => {
      const store = new LargeSecureStore();

      const result = await store.getItem('missing-key');

      expect(result).toBeNull();
    });

    it('should return the original value after a setItem/getItem round-trip', async () => {
      const store = new LargeSecureStore();
      const originalValue = 'my-supabase-session-payload-{"access_token":"xyz"}';

      await store.setItem('session', originalValue);
      const retrieved = await store.getItem('session');

      expect(retrieved).toBe(originalValue);
    });

    it('should store encrypted (non-plaintext) bytes in AsyncStorage', async () => {
      const store = new LargeSecureStore();
      const plaintext = 'secret-session-data';

      await store.setItem('session', plaintext);

      const stored = asyncStorageState.get('session');
      expect(stored).toBeDefined();
      // Encrypted hex string must NOT contain the original plaintext
      expect(stored).not.toContain(plaintext);
      // Hex-encoded ciphertext: IV (16 bytes = 32 hex chars) + payload
      expect(stored!.length).toBeGreaterThan(32);
      expect(/^[0-9a-f]+$/i.test(stored!)).toBe(true);
    });

    it('should remove the stored value when removeItem is called', async () => {
      const store = new LargeSecureStore();
      await store.setItem('session', 'data');

      await store.removeItem('session');

      const result = await store.getItem('session');
      expect(result).toBeNull();
    });

    it('should persist the encryption key in SecureStore on first write', async () => {
      const SecureStore = require('expo-secure-store');
      const store = new LargeSecureStore();

      await store.setItem('session', 'data');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'supabase-session-encryption-key',
        expect.any(String),
      );
    });

    it('should reuse an existing encryption key across multiple operations', async () => {
      const SecureStore = require('expo-secure-store');
      const store = new LargeSecureStore();

      await store.setItem('a', 'first');
      await store.setItem('b', 'second');

      // Key should only be written once (no second setItemAsync for the key)
      const keyWrites = (SecureStore.setItemAsync as jest.Mock).mock.calls.filter(
        ([k]) => k === 'supabase-session-encryption-key',
      );
      expect(keyWrites.length).toBe(1);
    });

    it('should fall back to AsyncStorage when SecureStore.getItemAsync throws', async () => {
      const SecureStore = require('expo-secure-store');
      (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(
        new Error('keychain locked'),
      );
      const store = new LargeSecureStore();

      // Should not throw — fallback path kicks in
      await expect(store.setItem('session', 'value')).resolves.toBeUndefined();
    });

    it('should return null when stored ciphertext is corrupted', async () => {
      const store = new LargeSecureStore();
      await store.setItem('session', 'original');

      // Corrupt the stored ciphertext
      asyncStorageState.set('session', 'not-valid-hex-data!');

      const result = await store.getItem('session');
      expect(result).toBeNull();
    });

    it('should propagate the error when AsyncStorage.setItem fails', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error('disk full'),
      );
      const store = new LargeSecureStore();

      await expect(store.setItem('session', 'value')).rejects.toThrow('disk full');
    });

    it('should propagate the error when AsyncStorage.removeItem fails', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(
        new Error('storage unavailable'),
      );
      const store = new LargeSecureStore();

      await expect(store.removeItem('session')).rejects.toThrow('storage unavailable');
    });

    it('should return null (not throw) when AsyncStorage.getItem fails', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('storage unavailable'),
      );
      const store = new LargeSecureStore();

      const result = await store.getItem('session');
      expect(result).toBeNull();
    });
  });

  describe('on web platform', () => {
    let LargeSecureStore: typeof import('../LargeSecureStore').LargeSecureStore;

    beforeAll(() => {
      jest.resetModules();
      jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
      // Provide a localStorage shim on globalThis for the web key path
      (global as unknown as { localStorage: Storage }).localStorage = {
        getItem: (k: string) => localStorageState.get(k) ?? null,
        setItem: (k: string, v: string) => {
          localStorageState.set(k, v);
        },
        removeItem: (k: string) => {
          localStorageState.delete(k);
        },
        clear: () => localStorageState.clear(),
        key: () => null,
        get length() {
          return localStorageState.size;
        },
      } as Storage;
      LargeSecureStore = require('../LargeSecureStore').LargeSecureStore;
    });

    it('should round-trip values on web just like on native', async () => {
      const store = new LargeSecureStore();
      const originalValue = 'web-session-payload';

      await store.setItem('web-session', originalValue);
      const retrieved = await store.getItem('web-session');

      expect(retrieved).toBe(originalValue);
    });

    it('should persist the encryption key in localStorage (not SecureStore) on web', async () => {
      const SecureStore = require('expo-secure-store');
      const store = new LargeSecureStore();

      await store.setItem('web-session', 'data');

      // SecureStore must NOT be used on web
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
      expect(
        localStorageState.get('supabase-session-encryption-key-web'),
      ).toBeDefined();
    });

    it('should reuse the existing web encryption key on subsequent reads', async () => {
      const Crypto = require('expo-crypto');
      const store = new LargeSecureStore();

      await store.setItem('a', 'first');
      const callsAfterFirst = (Crypto.getRandomBytesAsync as jest.Mock).mock.calls
        .length;

      await store.setItem('b', 'second');

      // Only IV generation (16 bytes) should happen for the second write,
      // not another key generation (32 bytes).
      const newCalls = (Crypto.getRandomBytesAsync as jest.Mock).mock.calls.slice(
        callsAfterFirst,
      );
      expect(newCalls.every(([size]) => size === 16)).toBe(true);
    });
  });
});
