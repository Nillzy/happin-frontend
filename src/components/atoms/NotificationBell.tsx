import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useNotifications } from '@/src/contexts/NotificationsContext';

interface NotificationBellProps {
    size?: number;
    color?: string;
}

/**
 * Glocken-Icon mit Unread-Counter-Badge.
 * Tap → /notifications.
 */
export default function NotificationBell({ size = 22, color }: NotificationBellProps) {
    const { colors } = useTheme();
    const router = useRouter();
    const { unreadCount } = useNotifications();
    const iconColor = color ?? colors.onSurface;

    return (
        <TouchableOpacity
            onPress={() => router.push('/notifications' as any)}
            style={styles.button}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
                unreadCount > 0
                    ? `Benachrichtigungen, ${unreadCount} ungelesen`
                    : 'Benachrichtigungen'
            }
        >
            <Ionicons name="notifications-outline" size={size} color={iconColor} />
            {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.error, borderColor: colors.background }]}>
                    <Text style={[styles.badgeText, { color: colors.onError }]} numberOfLines={1}>
                        {unreadCount > 99 ? '99+' : String(unreadCount)}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        padding: 6,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        lineHeight: 12,
    },
});
