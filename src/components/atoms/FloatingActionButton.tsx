import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

interface FloatingActionButtonProps {
    onPress: () => void;
    icon: keyof typeof Ionicons.glyphMap;
    disabled?: boolean;
    loading?: boolean;
}

export default function FloatingActionButton({
    onPress,
    icon,
    disabled = false,
    loading = false,
}: FloatingActionButtonProps) {
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.fab,
                {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                },
                (disabled || loading) && styles.fabDisabled,
            ]}
        >
            {loading ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
                <Ionicons name={icon} size={24} color={colors.onPrimary} />
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
            web: {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            },
        }),
    },
    fabDisabled: {
        opacity: 0.5,
    },
});

export type { FloatingActionButtonProps };
