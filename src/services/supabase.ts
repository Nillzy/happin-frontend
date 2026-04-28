import { createClient } from "@supabase/supabase-js";
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseSbPublishable = process.env.EXPO_PUBLIC_SUPABASE_SB_PUBLISHABLE;

if (!supabaseUrl || !supabaseSbPublishable) throw new Error('Missing Supabase environment variables');

const supabase = createClient(supabaseUrl, supabaseSbPublishable);

async function getStoredToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
        return localStorage.getItem('access_token');
    }
    return SecureStore.getItemAsync('access_token');
}

export async function sendOtp(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) {
        throw new Error(error.message)
    }
}

export async function verifyOtp(email: string, token: string): Promise<string> {
    const { data, error } = await supabase.auth.verifyOtp({
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

export async function authorize(): Promise<boolean> {
    const token = await getStoredToken();
    if (!token) return false;

    const { data, error } = await supabase.auth.getUser(token);
    return !error && !!data.user;
}
