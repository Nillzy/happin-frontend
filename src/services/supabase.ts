import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { LargeSecureStore } from "@/src/utils/LargeSecureStore";

let _supabase: SupabaseClient | null = null;
let _storage: LargeSecureStore | null = null;

/**
 * Get or create the storage singleton.
 * IMPORTANT: Use the same storage instance for all Supabase clients to ensure
 * consistent state (especially for PKCE code verifier storage).
 */
function getStorage(): LargeSecureStore {
    if (!_storage) {
        _storage = new LargeSecureStore();
    }
    return _storage;
}

/**
 * Get or create the Supabase client singleton.
 *
 * Configuration:
 * - autoRefreshToken: true - Automatically refresh access tokens before expiration
 * - persistSession: true - Persist session across app restarts
 * - detectSessionInUrl: false - Disable URL-based OAuth detection (not used in React Native)
 * - storage: LargeSecureStore - Encrypted session storage (AES-256 in AsyncStorage, key in SecureStore)
 *
 * The client will automatically:
 * - Store sessions in encrypted AsyncStorage after login
 * - Restore sessions on app restart
 * - Refresh expired access tokens in the background
 * - Emit onAuthStateChange events for session changes
 */
function getSupabase(): SupabaseClient {
    if (!_supabase) {
        const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) {
            throw new Error('Missing Supabase environment variables');
        }

        console.log('[supabase] Initializing client with LargeSecureStore');

        _supabase = createClient(url, key, {
            auth: {
                storage: getStorage(),
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
            },
        });
    }
    return _supabase;
}

export async function sendOtp(email: string): Promise<void> {
    console.log('[supabase] sendOtp called with email:', email);
    const { error } = await getSupabase().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) {
        console.error('[supabase] sendOtp error:', error);
        throw new Error(error.message)
    }
    console.log('[supabase] sendOtp: success');
}

export async function verifyOtp(email: string, token: string): Promise<string> {
    console.log('[supabase] verifyOtp called with email:', email, 'token length:', token.length);

    const { data, error } = await getSupabase().auth.verifyOtp({
        email,
        token,
        type: 'email',
    });

    console.log('[supabase] verifyOtp result - error:', error?.message, 'hasSession:', !!data.session);

    if (error) {
        console.error('[supabase] verifyOtp error:', error);
        throw new Error(error.message);
    }

    if (!data.session?.access_token) {
        console.error('[supabase] verifyOtp: No session returned');
        throw new Error('No session returned');
    }

    console.log('[supabase] verifyOtp: success, access_token length:', data.session.access_token.length);
    return data.session.access_token;
}

export async function getSession(): Promise<string | null> {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ?? null;
}

export async function authorize(): Promise<boolean> {
    const token = await getSession();
    if (!token) return false;

    const { data, error } = await getSupabase().auth.getUser(token);
    return !error && !!data.user;
}

/**
 * Get the Supabase client instance.
 * Use this to access the client directly for advanced operations or to set up auth state listeners.
 *
 * Example:
 * ```typescript
 * const supabase = getSupabaseClient();
 * supabase.auth.onAuthStateChange((event, session) => {
 *   console.log('Auth event:', event, session);
 * });
 * ```
 */
export function getSupabaseClient(): SupabaseClient {
    return getSupabase();
}
