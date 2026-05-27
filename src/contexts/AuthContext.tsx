import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/src/services/supabase';
import { unregisterWebPush } from '@/src/services/reminders';
import { unregisterExpoPush } from '@/src/services/expoPush';

interface AuthContextType {
  /**
   * Current session (contains access token, refresh token, user object)
   * Null if user is not authenticated
   */
  session: Session | null;

  /**
   * Current user object
   * Null if user is not authenticated
   */
  user: User | null;

  /**
   * Loading state during initial session check or auth operations
   */
  loading: boolean;

  /**
   * Sign out the current user
   * Clears session from storage and updates context
   */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider manages global authentication state using Supabase's onAuthStateChange listener.
 *
 * Features:
 * - Automatically loads persisted session on mount
 * - Listens to auth state changes (login, logout, token refresh, etc.)
 * - Provides current session and user to all child components
 * - Handles automatic token refresh in the background (managed by Supabase client)
 *
 * Usage:
 * Wrap your app root with AuthProvider:
 *
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 *
 * Then use the useAuth hook in any component:
 *
 * ```tsx
 * const { user, session, loading, signOut } = useAuth();
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Get initial session (from encrypted storage if persisted)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen to auth state changes
    // Events: INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY, MFA_CHALLENGE_VERIFIED
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log(`[AuthContext] Auth event: ${event}`);

        setSession(session);
        setUser(session?.user ?? null);

        // Handle specific events if needed
        if (event === 'SIGNED_IN') {
          console.log('[AuthContext] User signed in:', session?.user?.email);
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('[AuthContext] Token refreshed automatically');
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseClient();
    // Vor dem Logout aktive Push-Registrierungen entfernen, damit das Gerät
    // keine Pushes mehr erhält und die DB-Zeile nicht mit alter person_id
    // liegen bleibt. Backend-Hänger dürfen den Logout nicht blockieren.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        await Promise.allSettled([
          unregisterWebPush(session.access_token),
          unregisterExpoPush(session.access_token),
        ]);
      }
    } catch (err) {
      console.warn('[AuthContext] Push-Unregister vor Logout fehlgeschlagen:', err);
    }
    await supabase.auth.signOut();
    // onAuthStateChange will handle state update automatically
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context.
 * Must be used within an AuthProvider.
 *
 * @returns {AuthContextType} Current auth state and signOut function
 * @throws {Error} If used outside AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, session, loading, signOut } = useAuth();
 *
 *   if (loading) return <LoadingScreen />;
 *   if (!user) return <LoginScreen />;
 *
 *   return (
 *     <View>
 *       <Text>Welcome {user.email}</Text>
 *       <Button onPress={signOut} title="Sign Out" />
 *     </View>
 *   );
 * }
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
