/**
 * Isolated test for LargeSecureStore to verify encryption/decryption works correctly.
 * Run this with: npx ts-node test-largestore.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { LargeSecureStore } from './src/utils/LargeSecureStore';

async function testLargeSecureStore() {
  console.log('🧪 Testing LargeSecureStore...\n');

  const store = new LargeSecureStore();

  // Test 1: Simple string
  console.log('Test 1: Simple string');
  try {
    const testData = 'Hello World';
    await store.setItem('test-key-1', testData);
    const retrieved = await store.getItem('test-key-1');
    console.log('✅ Simple string:', retrieved === testData ? 'PASS' : `FAIL (got: ${retrieved})`);
  } catch (e) {
    console.log('❌ Simple string FAILED:', e);
  }

  // Test 2: JSON object (like Supabase session)
  console.log('\nTest 2: JSON object');
  try {
    const sessionData = JSON.stringify({
      access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
      refresh_token: 'test-refresh-token-12345',
      user: { id: 'test-user-id', email: 'test@example.com' },
      expires_at: Date.now() + 3600000,
    });
    await store.setItem('test-key-2', sessionData);
    const retrieved = await store.getItem('test-key-2');
    console.log('✅ JSON object:', retrieved === sessionData ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('❌ JSON object FAILED:', e);
  }

  // Test 3: PKCE code verifier (short random string)
  console.log('\nTest 3: PKCE code verifier');
  try {
    const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    await store.setItem('supabase.auth.token-code-verifier', codeVerifier);
    const retrieved = await store.getItem('supabase.auth.token-code-verifier');
    console.log('✅ PKCE verifier:', retrieved === codeVerifier ? 'PASS' : `FAIL (got: ${retrieved})`);
  } catch (e) {
    console.log('❌ PKCE verifier FAILED:', e);
  }

  // Test 4: Large session data (test size limit)
  console.log('\nTest 4: Large session data (>2KB)');
  try {
    const largeSession = JSON.stringify({
      access_token: 'a'.repeat(1000),
      refresh_token: 'b'.repeat(1000),
      user: { metadata: 'c'.repeat(1000) },
    });
    console.log('  Data size:', largeSession.length, 'bytes');
    await store.setItem('test-key-4', largeSession);
    const retrieved = await store.getItem('test-key-4');
    console.log('✅ Large data:', retrieved === largeSession ? 'PASS' : 'FAIL');
  } catch (e) {
    console.log('❌ Large data FAILED:', e);
  }

  // Test 5: Unicode/Emoji
  console.log('\nTest 5: Unicode/Emoji');
  try {
    const unicodeData = '🔐 Secure data with émojis and spëcial çhars 中文';
    await store.setItem('test-key-5', unicodeData);
    const retrieved = await store.getItem('test-key-5');
    console.log('✅ Unicode:', retrieved === unicodeData ? 'PASS' : `FAIL (got: ${retrieved})`);
  } catch (e) {
    console.log('❌ Unicode FAILED:', e);
  }

  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await AsyncStorage.multiRemove([
    'test-key-1',
    'test-key-2',
    'test-key-4',
    'test-key-5',
    'supabase.auth.token-code-verifier',
  ]);
  await SecureStore.deleteItemAsync('supabase-session-encryption-key');

  console.log('\n✅ All tests complete!');
}

testLargeSecureStore().catch((e) => {
  console.error('💥 Test suite failed:', e);
  process.exit(1);
});
