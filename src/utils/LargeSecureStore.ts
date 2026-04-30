import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import { Platform } from 'react-native';

/**
 * LargeSecureStore: A secure storage adapter for Supabase sessions in React Native/Expo.
 *
 * Problem: Expo SecureStore has a 2048 byte limit, but Supabase sessions (with refresh tokens
 * and metadata) often exceed this limit.
 *
 * Solution: Hybrid approach
 * - Generate a 256-bit AES encryption key
 * - Encrypt session data using AES-256-CTR mode
 * - Store encrypted data in AsyncStorage (unlimited size)
 *
 * Security:
 * - iOS/Android: Encryption key stored in SecureStore (iOS Keychain / Android Keystore)
 * - Web: Encryption key stored in sessionStorage (cleared on browser close, never persisted to disk)
 * - Session data in AsyncStorage is ALWAYS encrypted and unreadable without the key
 * - Each app/browser session gets a unique encryption key
 *
 * Web Security Trade-offs:
 * - sessionStorage key is vulnerable to XSS attacks (same as localStorage tokens)
 * - But MUCH better than unencrypted storage
 * - Key is cleared on browser close (no persistent storage)
 * - Recommendation: Use short session timeouts on web (e.g., 1 hour instead of 30 days)
 */
export class LargeSecureStore {
  private isWeb = Platform.OS === 'web';
  private WEB_KEY_STORAGE_NAME = 'supabase-session-encryption-key-web';

  private async _getEncryptionKey(forceReset = false): Promise<Uint8Array> {
    const ENCRYPTION_KEY_NAME = 'supabase-session-encryption-key';

    if (this.isWeb) {
      // Web: Use sessionStorage for encryption key (cleared on browser close)
      if (forceReset) {
        sessionStorage.removeItem(this.WEB_KEY_STORAGE_NAME);
      }

      let keyString = sessionStorage.getItem(this.WEB_KEY_STORAGE_NAME);

      if (!keyString) {
        console.log('[LargeSecureStore] Generating new web encryption key (session-only)');
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        const key = new Uint8Array(randomBytes);

        keyString = Array.from(key)
          .map((byte) => byte.toString(16).padStart(2, '0'))
          .join('');
        sessionStorage.setItem(this.WEB_KEY_STORAGE_NAME, keyString);
        console.log('[LargeSecureStore] Web encryption key stored in sessionStorage (cleared on close)');
      }

      const key = new Uint8Array(
        keyString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );
      return key;
    }

    // Native: Use SecureStore (iOS Keychain / Android Keystore)
    const SecureStore = await import('expo-secure-store');

    if (forceReset) {
      await SecureStore.deleteItemAsync(ENCRYPTION_KEY_NAME);
    }

    let keyString = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);

    if (!keyString) {
      console.log('[LargeSecureStore] Generating new encryption key');
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      const key = new Uint8Array(randomBytes);

      keyString = Array.from(key)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, keyString);
      console.log('[LargeSecureStore] New encryption key stored in SecureStore');
    }

    const key = new Uint8Array(
      keyString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );

    return key;
  }

  private async _encrypt(data: string): Promise<string> {
    try {
      const key = await this._getEncryptionKey();
      const textBytes = aesjs.utils.utf8.toBytes(data);

      // Generate random 16-byte IV (Initialization Vector) for CTR mode using Expo Crypto
      const ivArray = await Crypto.getRandomBytesAsync(16);
      const iv = new Uint8Array(ivArray);

      // Encrypt using AES-256-CTR
      const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
      const encryptedBytes = aesCtr.encrypt(textBytes);

      // Prepend IV to encrypted data (needed for decryption)
      const combined = new Uint8Array(iv.length + encryptedBytes.length);
      combined.set(iv);
      combined.set(encryptedBytes, iv.length);

      // Convert to hex string for storage
      return Array.from(combined)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('LargeSecureStore: Encryption failed', error);
      throw error;
    }
  }

  private async _decrypt(ciphertext: string): Promise<string> {
    try {
      const key = await this._getEncryptionKey();

      // Convert hex string to Uint8Array
      const combined = new Uint8Array(
        ciphertext.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );

      // Extract IV (first 16 bytes) and encrypted data
      const iv = combined.slice(0, 16);
      const encryptedBytes = combined.slice(16);

      // Decrypt using AES-256-CTR
      const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
      const decryptedBytes = aesCtr.decrypt(encryptedBytes);

      // Convert back to string
      return aesjs.utils.utf8.fromBytes(decryptedBytes);
    } catch (error) {
      console.error('LargeSecureStore: Decryption failed', error);
      throw error;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      console.log('[LargeSecureStore] getItem:', key, 'platform:', Platform.OS);

      const encrypted = await AsyncStorage.getItem(key);
      if (!encrypted) {
        console.log('[LargeSecureStore] getItem: no data found');
        return null;
      }

      // ALWAYS decrypt - even on web
      const decrypted = await this._decrypt(encrypted);
      console.log('[LargeSecureStore] getItem: success, decrypted length:', decrypted?.length);
      return decrypted;
    } catch (error) {
      console.error('[LargeSecureStore] getItem failed for key:', key, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      console.log('[LargeSecureStore] setItem:', key, 'value length:', value.length, 'platform:', Platform.OS);

      // ALWAYS encrypt - even on web
      const encrypted = await this._encrypt(value);
      await AsyncStorage.setItem(key, encrypted);
      console.log('[LargeSecureStore] setItem: success, encrypted length:', encrypted.length);
    } catch (error) {
      console.error('[LargeSecureStore] setItem failed for key:', key, error);
      console.error('[LargeSecureStore] Error details:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      console.log('[LargeSecureStore] removeItem:', key);
      await AsyncStorage.removeItem(key);
      console.log('[LargeSecureStore] removeItem: success');
    } catch (error) {
      console.error('[LargeSecureStore] removeItem failed for key:', key, error);
      throw error;
    }
  }
}
