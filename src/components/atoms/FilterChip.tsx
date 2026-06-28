import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';

export interface FilterChipProps {
    label: string;
    count?: number;
    selected: boolean;
    onPress: () => void;
}

/**
 * FilterChip Component
 *
 * Pill-shaped filter button with optional badge count.
 * Used for category/filter selection.
 */
export default function FilterChip({ label, count, selected, onPress }: FilterChipProps) {
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            style={[
                styles.chip,
                {
                    backgroundColor: selected ? colors.primary : colors.surfaceContainerHigh,
                },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text
                style={[
                    styles.label,
                    {
                        color: selected ? colors.onPrimary : colors.onSurface,
                    },
                ]}
            >
                {label}
            </Text>
            {count !== undefined && (
                <View
                    style={[
                        styles.badge,
                        {
                            backgroundColor: selected ? colors.onPrimary : colors.primary,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.badgeText,
                            {
                                color: selected ? colors.primary : colors.onPrimary,
                            },
                        ]}
                    >
                        {count}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 9999,
        gap: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    badge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
});
