import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';

interface SegmentOption {
    value: string;
    label: string;
}

interface SegmentedControlProps {
    options: SegmentOption[];
    value: string;
    onChange: (value: string) => void;
}

export default function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.surfaceContainerHigh }]}>
            {options.map((option, index) => {
                const isSelected = option.value === value;
                const isFirst = index === 0;
                const isLast = index === options.length - 1;

                return (
                    <TouchableOpacity
                        key={option.value}
                        activeOpacity={0.7}
                        onPress={() => onChange(option.value)}
                        style={[
                            styles.segment,
                            isFirst && styles.segmentFirst,
                            isLast && styles.segmentLast,
                            isSelected && [
                                styles.segmentSelected,
                                {
                                    backgroundColor: colors.surface,
                                },
                            ],
                        ]}
                    >
                        <Text
                            style={[
                                styles.segmentText,
                                {
                                    color: isSelected ? colors.onSurface : colors.onSurfaceVariant,
                                    fontWeight: isSelected ? '600' : '500',
                                },
                            ]}
                        >
                            {option.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
    },
    segment: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    segmentFirst: {
        marginRight: 2,
    },
    segmentLast: {
        marginLeft: 2,
    },
    segmentSelected: {
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    segmentText: {
        fontSize: 15,
        letterSpacing: -0.2,
    },
});

export type { SegmentOption, SegmentedControlProps };
