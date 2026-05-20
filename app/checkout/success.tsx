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
            const maxAttempts = 10;
            const interval = 2000;

            const check = async () => {
                attempts++;
                try {
                    invalidateTicketsCache();
                    const tickets = await api.getUserTickets(token);
                    // Find ticket matching the purchased event
                    const matchingTicket = event_id
                        ? tickets.tickets.find(t => t.event_id === event_id)
                        : tickets.tickets[0];
                    if (matchingTicket) {
                        if (mounted) {
                            setStatus('success');
                            setTimeout(() => {
                                router.replace(`/ticket/${matchingTicket.event_id}`);
                            }, 1500);
                        }
                        return;
                    }
                } catch {
                    // ignore, retry
                }
                if (attempts < maxAttempts) {
                    setTimeout(check, interval);
                } else if (mounted) {
                    setStatus('success');
                    setTimeout(() => {
                        router.replace(event_id ? `/ticket/${event_id}` : '/my-events');
                    }, 1500);
                }
            };
            check();
        };
        poll();
        return () => { mounted = false; };
    }, [session_id, event_id]);

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
