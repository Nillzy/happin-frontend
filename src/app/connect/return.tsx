import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';

export default function ConnectReturnScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { event_id } = useLocalSearchParams<{ event_id?: string }>();

    useEffect(() => {
        const timer = setTimeout(() => {
            if (event_id) {
                router.replace(`/event/${event_id}/manage`);
            } else {
                router.replace('/my-events');
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [event_id]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={styles.checkmark}>✓</Text>
            <Text style={[styles.text, { color: colors.onSurface }]}>
                Stripe-Konto erfolgreich eingerichtet!
            </Text>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 16 }} />
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
    checkmark: {
        fontSize: 48,
        marginBottom: 16,
    },
    text: {
        fontSize: 18,
        textAlign: 'center',
        fontWeight: '600',
    },
});
