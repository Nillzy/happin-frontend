import { registerExpoPush, unregisterExpoPush } from '../expoPush';
import { Platform } from 'react-native';
import { api } from '../api';

// Mock expo-notifications
const mockSetNotificationHandler = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  setNotificationHandler: mockSetNotificationHandler,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  AndroidImportance: {
    HIGH: 4,
  },
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        eas: { projectId: 'test-project-id-12345' },
      },
    },
  },
}));

// Mock api
jest.mock('../api', () => ({
  api: {
    registerExpoPushToken: jest.fn(),
    unregisterExpoPushToken: jest.fn(),
  },
}));

describe('expoPush', () => {
  const originalPlatform = Platform.OS;
  const originalVersion = Platform.Version;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    // Reset Platform to original value
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
    Object.defineProperty(Platform, 'Version', {
      value: originalVersion,
      writable: true,
    });
    jest.restoreAllMocks();
  });

  describe('registerExpoPush', () => {
    describe('Platform checks', () => {
      it('should return null on web platform', async () => {
        Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

        const result = await registerExpoPush('auth-token');

        expect(result).toBeNull();
        expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
      });

      it('should work on iOS platform', async () => {
        Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
        Object.defineProperty(Platform, 'Version', { value: '17.0', writable: true });

        mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[ios-token-123]',
        });
        (api.registerExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        const result = await registerExpoPush('auth-token');

        expect(result).toBe('ExponentPushToken[ios-token-123]');
        expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled(); // Android only
      });

      it('should work on Android platform', async () => {
        Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
        Object.defineProperty(Platform, 'Version', { value: 33, writable: true });

        mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[android-token-123]',
        });
        (api.registerExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        const result = await registerExpoPush('auth-token');

        expect(result).toBe('ExponentPushToken[android-token-123]');
        expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
          'default',
          expect.objectContaining({
            name: 'Standard',
            importance: 4,
          })
        );
      });
    });

    describe('Permission handling', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      });

      it('should use existing granted permission', async () => {
        mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[test]',
        });
        (api.registerExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        await registerExpoPush('auth-token');

        expect(mockGetPermissionsAsync).toHaveBeenCalled();
        expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
        expect(mockGetExpoPushTokenAsync).toHaveBeenCalled();
      });

      it('should request permission when status is not granted', async () => {
        mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
        mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[test]',
        });
        (api.registerExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        await registerExpoPush('auth-token');

        expect(mockRequestPermissionsAsync).toHaveBeenCalledWith({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        expect(mockGetExpoPushTokenAsync).toHaveBeenCalled();
      });

      it('should return null when permission is denied', async () => {
        mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
        mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });

        const result = await registerExpoPush('auth-token');

        expect(result).toBeNull();
        expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
        expect(api.registerExpoPushToken).not.toHaveBeenCalled();
      });

      it('should return null when request permission is denied', async () => {
        mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
        mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });

        const result = await registerExpoPush('auth-token');

        expect(result).toBeNull();
        expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
      });
    });

    describe('Token acquisition', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
        mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
      });

      it('should get push token with projectId', async () => {
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[with-project-id]',
        });
        (api.registerExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        const result = await registerExpoPush('auth-token');

        expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith({
          projectId: 'test-project-id-12345',
        });
        expect(result).toBe('ExponentPushToken[with-project-id]');
      });

      it('should handle getExpoPushTokenAsync error', async () => {
        mockGetExpoPushTokenAsync.mockRejectedValue(new Error('Token fetch failed'));

        const result = await registerExpoPush('auth-token');

        expect(result).toBeNull();
        expect(console.warn).toHaveBeenCalledWith(
          '[expoPush] getExpoPushTokenAsync fehlgeschlagen:',
          expect.any(Error)
        );
        expect(api.registerExpoPushToken).not.toHaveBeenCalled();
      });

      it('should return null when token data is empty', async () => {
        mockGetExpoPushTokenAsync.mockResolvedValue({ data: '' });

        const result = await registerExpoPush('auth-token');

        expect(result).toBeNull();
        expect(api.registerExpoPushToken).not.toHaveBeenCalled();
      });

      it('should return null when token data is null', async () => {
        mockGetExpoPushTokenAsync.mockResolvedValue({ data: null });

        const result = await registerExpoPush('auth-token');

        expect(result).toBeNull();
      });
    });

    describe('Backend registration', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
        Object.defineProperty(Platform, 'Version', { value: '17.0', writable: true });
        mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
      });

      it('should register token with backend on iOS', async () => {
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[test-ios]',
        });
        (api.registerExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        const result = await registerExpoPush('auth-token-123');

        expect(api.registerExpoPushToken).toHaveBeenCalledWith('auth-token-123', {
          token: 'ExponentPushToken[test-ios]',
          platform: 'ios',
          user_agent: 'ios 17.0',
        });
        expect(result).toBe('ExponentPushToken[test-ios]');
      });

      it('should register token with backend on Android', async () => {
        Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
        Object.defineProperty(Platform, 'Version', { value: 33, writable: true });

        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[test-android]',
        });
        (api.registerExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        const result = await registerExpoPush('auth-token-456');

        expect(api.registerExpoPushToken).toHaveBeenCalledWith('auth-token-456', {
          token: 'ExponentPushToken[test-android]',
          platform: 'android',
          user_agent: 'android 33',
        });
        expect(result).toBe('ExponentPushToken[test-android]');
      });

      it('should return null when backend registration fails', async () => {
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[test]',
        });
        (api.registerExpoPushToken as jest.Mock).mockRejectedValue(
          new Error('Backend error')
        );

        const result = await registerExpoPush('auth-token');

        expect(result).toBeNull();
        expect(console.warn).toHaveBeenCalledWith(
          '[expoPush] Backend-Registration fehlgeschlagen:',
          expect.any(Error)
        );
      });

      it('should handle network timeout during registration', async () => {
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[test]',
        });
        (api.registerExpoPushToken as jest.Mock).mockRejectedValue(
          new Error('Network timeout')
        );

        const result = await registerExpoPush('auth-token');

        expect(result).toBeNull();
      });
    });

    describe('Android-specific behavior', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
        mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
      });

      it('should set notification channel on Android', async () => {
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[android]',
        });
        (api.registerExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        await registerExpoPush('auth-token');

        expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('default', {
          name: 'Standard',
          importance: 4,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      });

      it('should continue even if setNotificationChannelAsync fails', async () => {
        mockSetNotificationChannelAsync.mockRejectedValue(
          new Error('Channel creation failed')
        );
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[android]',
        });
        (api.registerExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        const result = await registerExpoPush('auth-token');

        expect(result).toBe('ExponentPushToken[android]');
        expect(console.warn).toHaveBeenCalledWith(
          '[expoPush] setNotificationChannelAsync fehlgeschlagen:',
          expect.any(Error)
        );
      });
    });

    describe('Full registration flow', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
        mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[complete-flow]',
        });
        (api.registerExpoPushToken as jest.Mock).mockResolvedValue(undefined);
      });

      it('should complete full registration flow successfully', async () => {
        const result = await registerExpoPush('auth-token-complete');

        // Verify all steps completed
        expect(mockGetPermissionsAsync).toHaveBeenCalled();
        expect(mockGetExpoPushTokenAsync).toHaveBeenCalled();
        expect(api.registerExpoPushToken).toHaveBeenCalledWith(
          'auth-token-complete',
          expect.objectContaining({
            token: 'ExponentPushToken[complete-flow]',
            platform: 'ios',
          })
        );
        expect(result).toBe('ExponentPushToken[complete-flow]');
      });
    });
  });

  describe('unregisterExpoPush', () => {
    describe('Platform checks', () => {
      it('should return early on web platform', async () => {
        Object.defineProperty(Platform, 'OS', { value: 'web', writable: true });

        await unregisterExpoPush('auth-token');

        expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
        expect(api.unregisterExpoPushToken).not.toHaveBeenCalled();
      });

      it('should work on iOS platform', async () => {
        Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[unregister-ios]',
        });
        (api.unregisterExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        await unregisterExpoPush('auth-token');

        expect(api.unregisterExpoPushToken).toHaveBeenCalledWith(
          'auth-token',
          'ExponentPushToken[unregister-ios]'
        );
      });

      it('should work on Android platform', async () => {
        Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });

        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[unregister-android]',
        });
        (api.unregisterExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        await unregisterExpoPush('auth-token');

        expect(api.unregisterExpoPushToken).toHaveBeenCalledWith(
          'auth-token',
          'ExponentPushToken[unregister-android]'
        );
      });
    });

    describe('Token retrieval', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      });

      it('should get token with projectId when available', async () => {
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[test]',
        });
        (api.unregisterExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        await unregisterExpoPush('auth-token');

        expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith({
          projectId: 'test-project-id-12345',
        });
      });

      it('should return early when getExpoPushTokenAsync fails', async () => {
        mockGetExpoPushTokenAsync.mockRejectedValue(new Error('Token error'));

        await unregisterExpoPush('auth-token');

        expect(api.unregisterExpoPushToken).not.toHaveBeenCalled();
      });

      it('should return early when token is null', async () => {
        mockGetExpoPushTokenAsync.mockResolvedValue({ data: null });

        await unregisterExpoPush('auth-token');

        expect(api.unregisterExpoPushToken).not.toHaveBeenCalled();
      });

      it('should return early when token is empty string', async () => {
        mockGetExpoPushTokenAsync.mockResolvedValue({ data: '' });

        await unregisterExpoPush('auth-token');

        expect(api.unregisterExpoPushToken).not.toHaveBeenCalled();
      });
    });

    describe('Backend unregistration', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
        mockGetExpoPushTokenAsync.mockResolvedValue({
          data: 'ExponentPushToken[test]',
        });
      });

      it('should unregister token from backend', async () => {
        (api.unregisterExpoPushToken as jest.Mock).mockResolvedValue(undefined);

        await unregisterExpoPush('auth-token-unregister');

        expect(api.unregisterExpoPushToken).toHaveBeenCalledWith(
          'auth-token-unregister',
          'ExponentPushToken[test]'
        );
      });

      it('should handle backend unregistration errors gracefully', async () => {
        (api.unregisterExpoPushToken as jest.Mock).mockRejectedValue(
          new Error('Backend error')
        );

        // Should not throw
        await expect(unregisterExpoPush('auth-token')).resolves.not.toThrow();

        expect(console.warn).toHaveBeenCalledWith(
          '[expoPush] Backend-Unregister fehlgeschlagen:',
          expect.any(Error)
        );
      });

      it('should handle network timeout during unregistration', async () => {
        (api.unregisterExpoPushToken as jest.Mock).mockRejectedValue(
          new Error('Network timeout')
        );

        await expect(unregisterExpoPush('auth-token')).resolves.not.toThrow();
      });
    });
  });
});
