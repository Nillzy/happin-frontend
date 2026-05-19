import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Clear all auth-related data from storage.
 * Use this to reset the app to a clean state if OTP verification fails due to old session data.
 *
 * Call this before testing the new auth flow to ensure no conflicts with old data.
 */
export async function clearAllAuthData(): Promise<void> {
  console.log('[ClearAuth] Starting auth data cleanup...');

  try {
    // Clear all AsyncStorage keys
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('[ClearAuth] Found AsyncStorage keys:', allKeys.length);

    // Clear Supabase session keys
    const authKeys = allKeys.filter(
      (key) =>
        key.includes('supabase') ||
        key.includes('auth') ||
        key.includes('session') ||
        key.includes('token')
    );

    console.log('[ClearAuth] Clearing auth-related keys:', authKeys);
    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
    }

    // Clear old access_token if it exists
    await AsyncStorage.removeItem('access_token');

    // Clear SecureStore encryption key (will be regenerated)
    if (Platform.OS !== 'web') {
      const SecureStore = await import('expo-secure-store');
      try {
        await SecureStore.deleteItemAsync('supabase-session-encryption-key');
        console.log('[ClearAuth] Cleared encryption key from SecureStore');
      } catch {
        console.log('[ClearAuth] No encryption key found in SecureStore');
      }

      // Clear old access_token from SecureStore if it exists
      try {
        await SecureStore.deleteItemAsync('access_token');
        console.log('[ClearAuth] Cleared old access_token from SecureStore');
      } catch {
        console.log('[ClearAuth] No old access_token in SecureStore');
      }
    } else {
      // Web: Clear localStorage encryption key
      try {
        localStorage.removeItem('supabase-session-encryption-key-web');
        console.log('[ClearAuth] Cleared encryption key from localStorage');
      } catch {
        console.log('[ClearAuth] No encryption key found in localStorage');
      }
    }

    console.log('[ClearAuth] ✅ Auth data cleanup complete');
  } catch (error) {
    console.error('[ClearAuth] ❌ Cleanup failed:', error);
    throw error;
  }
}
