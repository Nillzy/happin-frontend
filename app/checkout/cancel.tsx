import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/src/contexts/ThemeContext';
import { getSession } from '@/src/services/supabase';
import { api } from '@/src/services/api';

export default function CheckoutCancelScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { event_id } = useLocalSearchParams<{ event_id?: string }>();
    const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');

    useEffect(() => {
        let mounted = true;

        const cancel = async () => {
            if (!event_id) {
                if (mounted) setStatus('error');
                return;
            }

            try {
                const token = await getSession();
                if (token) {
                    await api.abandonCheckoutSession(event_id, token);
                }
                if (mounted) {
                    setStatus('done');
                    router.replace(`/event/${event_id}`);
                }
            } catch {
                if (mounted) {
                    setStatus('error');
                    router.replace(`/event/${event_id}`);
                }
            }
        };

        void cancel();
        return () => {
            mounted = false;
        };
    }, [event_id, router]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.text, { color: colors.onSurface }]}>
                {status === 'error'
                    ? 'Checkout abgebrochen.'
                    : 'Checkout wird abgebrochen…'}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    text: {
        marginTop: 16,
        fontSize: 16,
        textAlign: 'center',
    },
});
