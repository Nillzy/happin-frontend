import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { getSession } from '@/src/services/supabase';
import { api, invalidateTicketsCache } from '@/src/services/api';

export default function CheckoutSuccessScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { session_id, event_id } = useLocalSearchParams<{ session_id: string; event_id: string }>();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        let mounted = true;
        const poll = async () => {
            if (!session_id) {
                setStatus('error');
                return;
            }

            const token = await getSession();
            if (!token) {
                if (mounted) setStatus('error');
                return;
            }

            let attempts = 0;
            const maxAttempts = 15;
            const interval = 2000;

            const check = async () => {
                attempts++;
                try {
                    invalidateTicketsCache();
                    if (event_id) api.invalidateCaches(event_id);

                    const orderStatus = await api.getCheckoutOrderStatus(session_id, token);
                    if (orderStatus.fulfilled) {
                        if (mounted) {
                            setStatus('success');
                            setTimeout(async () => {
                                try {
                                    const eventData = await api.getEventById(orderStatus.event_id, token);
                                    if ((eventData.custom_fields?.length ?? 0) > 0) {
                                        router.replace(`/event/${orderStatus.event_id}?openCustomFields=1`);
                                        return;
                                    }
                                } catch {
                                    // fall through to ticket view
                                }
                                router.replace(`/ticket/${orderStatus.event_id}`);
                            }, 800);
                        }
                        return;
                    }
                    if (orderStatus.order_status === 'failed' || orderStatus.order_status === 'expired') {
                        if (mounted) setStatus('error');
                        return;
                    }
                } catch {
                    // retry until webhook fulfills
                }
                if (attempts < maxAttempts) {
                    setTimeout(check, interval);
                } else if (mounted) {
                    setStatus('error');
                }
            };
            check();
        };
        poll();
        return () => { mounted = false; };
    }, [session_id, event_id, router]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {status === 'loading' && (
                <>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.text, { color: colors.onSurface }]}>
                        Zahlung wird bestätigt…
                    </Text>
                </>
            )}
            {status === 'success' && (
                <Text style={[styles.text, { color: colors.primary }]}>
                    Zahlung erfolgreich! Dein Ticket wird geladen…
                </Text>
            )}
            {status === 'error' && (
                <Text style={[styles.text, { color: colors.error }]}>
                    Etwas ist schiefgelaufen. Bitte prüfe deine Tickets.
                </Text>
            )}
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
