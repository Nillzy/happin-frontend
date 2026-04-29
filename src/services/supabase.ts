import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
    if (!_supabase) {
        const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const key = process.env.EXPO_PUBLIC_SUPABASE_SB_PUBLISHABLE;
        if (!url || !key) {
            throw new Error('Missing Supabase environment variables');
        }
        _supabase = createClient(url, key);
    }
    return _supabase;
}

export async function sendOtp(email: string): Promise<void> {
    const { error } = await getSupabase().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) {
        throw new Error(error.message)
    }
}

export async function verifyOtp(email: string, token: string): Promise<string> {
    const { data, error } = await getSupabase().auth.verifyOtp({
        email,
        token,
        type: 'email',
    });

    if (error) {
        throw new Error(error.message);
    }

    if (!data.session?.access_token) {
        throw new Error('No session returned');
    }

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
