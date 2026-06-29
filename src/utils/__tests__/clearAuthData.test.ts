import { clearAllAuthData } from '../clearAuthData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock expo-secure-store
const mockDeleteItemAsync = jest.fn();
jest.mock('expo-secure-store', () => ({
  deleteItemAsync: mockDeleteItemAsync,
}));

describe('clearAllAuthData', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console mocks to avoid noise
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Reset Platform.OS to original value
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
    jest.restoreAllMocks();
  });

  describe('AsyncStorage operations', () => {
    it('should clear all auth-related keys from AsyncStorage', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      const mockKeys = [
        'supabase.auth.token',
        'user-session',
        'some-other-key',
        '@auth-data',
        'app-settings',
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(mockKeys);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockDeleteItemAsync.mockResolvedValue(undefined);

      await clearAllAuthData();

      // Should filter and remove auth-related keys
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'supabase.auth.token',
        'user-session',
        '@auth-data',
      ]);

      // Should remove old access_token
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('access_token');
    });

    it('should handle empty AsyncStorage', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockDeleteItemAsync.mockResolvedValue(undefined);

      await clearAllAuthData();

      // multiRemove should not be called if no auth keys found
      expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('access_token');
    });

    it('should handle AsyncStorage.getAllKeys error', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      await expect(clearAllAuthData()).rejects.toThrow('Storage error');
    });
  });

  describe('Platform-specific SecureStore (iOS/Android)', () => {
    it('should clear encryption key from SecureStore on iOS', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockDeleteItemAsync.mockResolvedValue(undefined);

      await clearAllAuthData();

      expect(mockDeleteItemAsync).toHaveBeenCalledWith(
        'supabase-session-encryption-key'
      );
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('access_token');
    });

    it('should clear encryption key from SecureStore on Android', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockDeleteItemAsync.mockResolvedValue(undefined);

      await clearAllAuthData();

      expect(mockDeleteItemAsync).toHaveBeenCalledWith(
        'supabase-session-encryption-key'
      );
      expect(mockDeleteItemAsync).toHaveBeenCalledWith('access_token');
    });

    it('should handle SecureStore.deleteItemAsync errors gracefully', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockDeleteItemAsync.mockRejectedValue(new Error('Item not found'));

      // Should not throw - errors are caught internally
      await expect(clearAllAuthData()).resolves.not.toThrow();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No encryption key found in SecureStore')
      );
    });

    it('should clear both encryption key and access_token from SecureStore', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockDeleteItemAsync.mockResolvedValue(undefined);

      await clearAllAuthData();

      // Should attempt to delete both keys
      expect(mockDeleteItemAsync).toHaveBeenCalledTimes(2);
      expect(mockDeleteItemAsync).toHaveBeenNthCalledWith(
        1,
        'supabase-session-encryption-key'
      );
      expect(mockDeleteItemAsync).toHaveBeenNthCalledWith(2, 'access_token');
    });

    it('should handle first SecureStore delete success, second failure', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockDeleteItemAsync
        .mockResolvedValueOnce(undefined) // encryption key success
        .mockRejectedValueOnce(new Error('access_token not found')); // access_token fails

      await expect(clearAllAuthData()).resolves.not.toThrow();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Cleared encryption key from SecureStore')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No old access_token in SecureStore')
      );
    });
  });

  describe('Platform-specific localStorage (Web)', () => {
    it('should clear encryption key from localStorage on web', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

      const mockLocalStorage = {
        removeItem: jest.fn(),
      };
      global.localStorage = mockLocalStorage as any;

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await clearAllAuthData();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'supabase-session-encryption-key-web'
      );
      // SecureStore should NOT be called on web
      expect(mockDeleteItemAsync).not.toHaveBeenCalled();
    });

    it('should handle localStorage.removeItem error on web', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

      const mockLocalStorage = {
        removeItem: jest.fn().mockImplementation(() => {
          throw new Error('localStorage error');
        }),
      };
      global.localStorage = mockLocalStorage as any;

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      // Should not throw - errors are caught internally
      await expect(clearAllAuthData()).resolves.not.toThrow();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No encryption key found in localStorage')
      );
    });

    it('should not call SecureStore on web platform', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

      const mockLocalStorage = {
        removeItem: jest.fn(),
      };
      global.localStorage = mockLocalStorage as any;

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await clearAllAuthData();

      // Verify SecureStore was NOT imported/called
      expect(mockDeleteItemAsync).not.toHaveBeenCalled();
    });
  });

  describe('Key filtering logic', () => {
    it('should identify all auth-related keys correctly', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      const mockKeys = [
        'supabase.auth.token',
        'supabase-session',
        'user-auth-data',
        'session-id',
        'refresh_token',
        'unrelated-key',
        'app-settings',
      ];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(mockKeys);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockDeleteItemAsync.mockResolvedValue(undefined);

      await clearAllAuthData();

      // Should filter keys containing: supabase, auth, session, token
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'supabase.auth.token',
        'supabase-session',
        'user-auth-data',
        'session-id',
        'refresh_token',
      ]);
    });

    it('should handle keys with only "token" substring', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      const mockKeys = ['api-token', 'device-token', 'other-data'];

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(mockKeys);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockDeleteItemAsync.mockResolvedValue(undefined);

      await clearAllAuthData();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'api-token',
        'device-token',
      ]);
    });
  });

  describe('Error handling and logging', () => {
    it('should log start and complete messages', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockDeleteItemAsync.mockResolvedValue(undefined);

      await clearAllAuthData();

      expect(console.log).toHaveBeenCalledWith(
        '[ClearAuth] Starting auth data cleanup...'
      );
      expect(console.log).toHaveBeenCalledWith(
        '[ClearAuth] ✅ Auth data cleanup complete'
      );
    });

    it('should log error and rethrow on failure', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      const error = new Error('Critical failure');
      (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValue(error);

      await expect(clearAllAuthData()).rejects.toThrow('Critical failure');

      expect(console.error).toHaveBeenCalledWith(
        '[ClearAuth] ❌ Cleanup failed:',
        error
      );
    });

    it('should log number of found AsyncStorage keys', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      const mockKeys = ['key1', 'key2', 'key3'];
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(mockKeys);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockDeleteItemAsync.mockResolvedValue(undefined);

      await clearAllAuthData();

      expect(console.log).toHaveBeenCalledWith(
        '[ClearAuth] Found AsyncStorage keys:',
        3
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should complete full cleanup flow on iOS', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

      const mockKeys = ['supabase.auth.token', 'session-data', 'other-key'];
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(mockKeys);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      mockDeleteItemAsync.mockResolvedValue(undefined);

      await clearAllAuthData();

      // Verify full flow
      expect(AsyncStorage.getAllKeys).toHaveBeenCalled();
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        'supabase.auth.token',
        'session-data',
      ]);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockDeleteItemAsync).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith(
        '[ClearAuth] ✅ Auth data cleanup complete'
      );
    });

    it('should complete full cleanup flow on web', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

      const mockLocalStorage = {
        removeItem: jest.fn(),
      };
      global.localStorage = mockLocalStorage as any;

      const mockKeys = ['auth-token', 'app-data'];
      (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue(mockKeys);
      (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await clearAllAuthData();

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['auth-token']);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'supabase-session-encryption-key-web'
      );
      expect(mockDeleteItemAsync).not.toHaveBeenCalled();
    });
  });
});
