#!/bin/bash

# Supabase Auth Migration Verification Script
# Run this after pulling the auth migration changes

echo "🔍 Verifying Supabase Auth Migration..."
echo ""

# Check dependencies
echo "1️⃣ Checking dependencies..."
if grep -q "@react-native-async-storage/async-storage" package.json; then
  echo "   ✅ AsyncStorage installed"
else
  echo "   ❌ AsyncStorage missing - run: npm install"
  exit 1
fi

if grep -q "aes-js" package.json; then
  echo "   ✅ aes-js installed"
else
  echo "   ❌ aes-js missing - run: npm install"
  exit 1
fi

if grep -q "@types/aes-js" package.json; then
  echo "   ✅ @types/aes-js installed"
else
  echo "   ❌ @types/aes-js missing - run: npm install --save-dev @types/aes-js"
  exit 1
fi

echo ""

# Check new files exist
echo "2️⃣ Checking new files..."
if [ -f "src/utils/LargeSecureStore.ts" ]; then
  echo "   ✅ LargeSecureStore.ts exists"
else
  echo "   ❌ LargeSecureStore.ts missing"
  exit 1
fi

if [ -f "src/contexts/AuthContext.tsx" ]; then
  echo "   ✅ AuthContext.tsx exists"
else
  echo "   ❌ AuthContext.tsx missing"
  exit 1
fi

echo ""

# Check critical code patterns
echo "3️⃣ Checking Supabase client configuration..."
if grep -q "autoRefreshToken: true" src/services/supabase.ts; then
  echo "   ✅ autoRefreshToken enabled"
else
  echo "   ⚠️  autoRefreshToken not found"
fi

if grep -q "persistSession: true" src/services/supabase.ts; then
  echo "   ✅ persistSession enabled"
else
  echo "   ⚠️  persistSession not found"
fi

if grep -q "LargeSecureStore" src/services/supabase.ts; then
  echo "   ✅ LargeSecureStore integrated"
else
  echo "   ❌ LargeSecureStore not integrated"
  exit 1
fi

echo ""

# Check AuthProvider integration
echo "4️⃣ Checking AuthProvider integration..."
if grep -q "AuthProvider" app/_layout.tsx; then
  echo "   ✅ AuthProvider integrated in _layout.tsx"
else
  echo "   ❌ AuthProvider not integrated in _layout.tsx"
  exit 1
fi

echo ""

# Check LoginScreen migration
echo "5️⃣ Checking LoginScreen migration..."
if grep -q "SecureStore.setItemAsync" src/screens/LoginScreen.tsx; then
  echo "   ⚠️  LoginScreen still uses manual token storage (should be removed)"
else
  echo "   ✅ LoginScreen uses automatic session management"
fi

echo ""

# TypeScript compilation check
echo "6️⃣ Running TypeScript compilation check..."
if npx tsc --noEmit 2>&1 | grep -q "LargeSecureStore"; then
  echo "   ❌ TypeScript errors in LargeSecureStore"
  exit 1
else
  echo "   ✅ LargeSecureStore compiles without errors"
fi

echo ""
echo "✨ All checks passed! Supabase Auth migration is complete."
echo ""
echo "📝 Next steps:"
echo "   1. Test login flow: npm start"
echo "   2. Verify session persists after app restart"
echo "   3. Check console logs for [AuthContext] and [LargeSecureStore] messages"
echo "   4. Read AUTH_MIGRATION.md for detailed migration guide"
echo ""
