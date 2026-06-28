import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/src/hooks/use-theme';

export default function ConnectRefreshScreen() {
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
        }, 2000);
        return () => clearTimeout(timer);
    }, [event_id]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.text, { color: colors.onSurface }]}>
                Onboarding-Link abgelaufen. Bitte erneut versuchen.
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
        fontSize: 16,
        textAlign: 'center',
    },
});
