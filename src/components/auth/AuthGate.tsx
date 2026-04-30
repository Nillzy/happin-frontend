import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTheme } from '@/hooks/use-theme';

interface AuthGateProps {
  children: React.ReactNode;
  /**
   * If true, requires authentication. Redirects to /login if not authenticated.
   * If false, allows access without authentication.
   */
  requireAuth?: boolean;
}

/**
 * AuthGate: Protects routes that require authentication.
 *
 * Usage:
 * ```tsx
 * <AuthGate requireAuth>
 *   <EventScreen />
 * </AuthGate>
 * ```
 *
 * Features:
 * - Shows loading spinner while auth state is loading
 * - Redirects to /login if requireAuth=true and user is not authenticated
 * - Prevents "navigate before mounting" errors by waiting for auth to load
 */
export function AuthGate({ children, requireAuth = false }: AuthGateProps) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  // Wait for auth to load before making decisions
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Redirect to login if auth is required and user is not authenticated
  if (requireAuth && !session) {
    // Use setTimeout to avoid "navigate before mounting" error
    setTimeout(() => router.replace('/login'), 0);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Render children if auth check passed
  return <>{children}</>;
}
