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

export interface UserProfile {
    id: string;
    email: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    /** Avatar URL — null until backend provides one */
    avatarUrl: string | null;
}

export async function getUserProfile(): Promise<UserProfile | null> {
    const { data, error } = await getSupabase().auth.getUser();
    if (error || !data.user) return null;
    const u = data.user;
    return {
        id: u.id,
        email: u.email ?? '',
        displayName: u.user_metadata?.display_name ?? null,
        firstName: u.user_metadata?.first_name ?? null,
        lastName: u.user_metadata?.last_name ?? null,
        avatarUrl: u.user_metadata?.avatar_url ?? null,
    };
}

export async function updateDisplayName(displayName: string): Promise<void> {
    const { error } = await getSupabase().auth.updateUser({
        data: { display_name: displayName },
    });
    if (error) throw new Error(error.message);
}

export async function updateName(firstName: string, lastName: string): Promise<void> {
    const token = await getSession();
    if (!token) throw new Error('Not authenticated');

    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
    const res = await fetch(`${backendUrl}/api/v1/users/me/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
    });
    if (!res.ok) throw new Error(`Update failed: ${res.status}`);

    const { error } = await getSupabase().auth.updateUser({
        data: { first_name: firstName, last_name: lastName },
    });
    if (error) throw new Error(error.message);
}

export async function updateCity(city: string): Promise<void> {
    const token = await getSession();
    if (!token) return;

    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
    await fetch(`${backendUrl}/api/v1/users/me/city`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ city }),
    });
}

export async function fetchCityFromBackend(): Promise<string> {
    const token = await getSession();
    if (!token) return '';

    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
    const res = await fetch(`${backendUrl}/api/v1/users/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.city ?? '';
}

export async function signOut(): Promise<void> {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw new Error(error.message);
}

export async function deleteAccount(): Promise<void> {
    const token = await getSession();
    if (!token) throw new Error('Not authenticated');
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
    const res = await fetch(`${backendUrl}/api/v1/users/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
    await signOut();
}

export async function updateEmail(newEmail: string): Promise<void> {
    const token = await getSession();
    if (!token) throw new Error('Not authenticated');

    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
    const checkRes = await fetch(`${backendUrl}/api/v1/users/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newEmail }),
    });
    if (checkRes.status === 409) throw new Error('email_already_in_use');
    if (!checkRes.ok) throw new Error('Fehler bei der Überprüfung der E-Mail-Adresse.');

    const { error } = await getSupabase().auth.updateUser({ email: newEmail });
    if (error) throw new Error(error.message);
}

export function getSupabaseClient(): SupabaseClient {
    return getSupabase();
}
