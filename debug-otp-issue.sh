#!/bin/bash

# Test Script to check if AsyncStorage has old session data that conflicts with new LargeSecureStore

echo "🔍 Checking for old session data that might conflict..."
echo ""

# Check if there's an old session in the codebase (localStorage/SecureStore keys)
echo "Looking for old token storage patterns in LoginScreen..."

if grep -q "localStorage.setItem('access_token'" src/screens/LoginScreen.tsx 2>/dev/null; then
  echo "❌ Found old localStorage pattern in LoginScreen (should be removed)"
else
  echo "✅ No old localStorage pattern found"
fi

if grep -q "SecureStore.setItemAsync('access_token'" src/screens/LoginScreen.tsx 2>/dev/null; then
  echo "❌ Found old SecureStore pattern in LoginScreen (should be removed)"
else
  echo "✅ No old SecureStore pattern found"
fi

echo ""
echo "💡 If OTP still fails, the issue is likely:"
echo "   1. Old session data in AsyncStorage/SecureStore conflicting with new LargeSecureStore"
echo "   2. Supabase trying to load old session format during verifyOtp"
echo ""
echo "📋 To debug:"
echo "   1. Clear all app data (uninstall/reinstall app)"
echo "   2. Check Metro console for [LargeSecureStore] and [supabase] logs"
echo "   3. Verify expo-crypto is properly installed: npm list expo-crypto"
echo ""

# Check expo-crypto
if npm list expo-crypto 2>&1 | grep -q "expo-crypto@"; then
  echo "✅ expo-crypto is installed:"
  npm list expo-crypto | grep "expo-crypto"
else
  echo "❌ expo-crypto NOT installed"
  echo "   Run: npm install expo-crypto@~15.0.0"
fi

echo ""
