import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { LargeSecureStore } from "@/src/utils/LargeSecureStore";
import { getEnv } from "@/src/utils/env";

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
        const url = getEnv('EXPO_PUBLIC_SUPABASE_URL');
        const key = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
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

    // Fetch avatar_url from backend (stored in person table)
    let avatarUrl: string | null = null;
    try {
        const token = await getSession();
        if (token) {
            const backendUrl = getEnv('EXPO_PUBLIC_BACKEND_URL');
            const res = await fetch(`${backendUrl}/api/v1/users/me/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const profile = await res.json();
                avatarUrl = profile.avatar_url ?? null;
            }
        }
    } catch (err) {
        console.warn('[getUserProfile] Failed to fetch avatar_url from backend:', err);
    }

    return {
        id: u.id,
        email: u.email ?? '',
        displayName: u.user_metadata?.display_name ?? null,
        firstName: u.user_metadata?.first_name ?? null,
        lastName: u.user_metadata?.last_name ?? null,
        avatarUrl,
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

    const backendUrl = getEnv('EXPO_PUBLIC_BACKEND_URL');
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

    const backendUrl = getEnv('EXPO_PUBLIC_BACKEND_URL');
    await fetch(`${backendUrl}/api/v1/users/me/city`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ city }),
    });
}

export async function fetchCityFromBackend(): Promise<string> {
    const token = await getSession();
    if (!token) return '';

    const backendUrl = getEnv('EXPO_PUBLIC_BACKEND_URL');
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
    const backendUrl = getEnv('EXPO_PUBLIC_BACKEND_URL');
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

    const backendUrl = getEnv('EXPO_PUBLIC_BACKEND_URL');
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

const MAX_PIXELS = 1920 * 1080; // ~2.07 MP
const JPEG_QUALITY = 0.88;

async function toJpegBlob(imageUri: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            let { width, height } = img;
            const pixels = width * height;
            if (pixels > MAX_PIXELS) {
                const scale = Math.sqrt(MAX_PIXELS / pixels);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
                'image/jpeg',
                JPEG_QUALITY,
            );
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = imageUri;
    });
}

export async function uploadEventImage(imageUri: string): Promise<string> {
    let blob: Blob;

    if (typeof document !== 'undefined') {
        // Web: convert to JPEG and resize via canvas
        blob = await toJpegBlob(imageUri);
    } else {
        // Native: ImagePicker already handles quality/size — just fetch the blob
        const response = await fetch(imageUri);
        blob = await response.blob();
    }

    const path = `covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

    const { error } = await getSupabase().storage
        .from('event-images')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data } = getSupabase().storage
        .from('event-images')
        .getPublicUrl(path);

    return data.publicUrl;
}

export async function uploadProfilePicture(imageUri: string): Promise<string> {
    const user = await getSupabase().auth.getUser();
    if (!user.data.user) throw new Error('Not authenticated');

    let blob: Blob;

    if (typeof document !== 'undefined') {
        // Web: convert to JPEG and resize via canvas
        blob = await toJpegBlob(imageUri);
    } else {
        // Native: ImagePicker already handles quality/size — just fetch the blob
        const response = await fetch(imageUri);
        blob = await response.blob();
    }

    const userId = user.data.user.id;
    const path = `${userId}/avatar-${Date.now()}.jpg`;

    const { error } = await getSupabase().storage
        .from('profile-pictures')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    const { data } = getSupabase().storage
        .from('profile-pictures')
        .getPublicUrl(path);

    return data.publicUrl;
}
