import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';

interface HappinLogoProps {
    size?: 'sm' | 'md' | 'lg';
    /** Override the wordmark color (defaults to theme primary) */
    color?: string;
}

const SIZE_MAP = {
    sm: { icon: 22, text: 18, gap: 6 },
    md: { icon: 28, text: 22, gap: 8 },
    lg: { icon: 40, text: 32, gap: 10 },
};

export default function HappinLogo({ size = 'md', color }: HappinLogoProps) {
    const { colors } = useTheme();
    const dims = SIZE_MAP[size];
    const wordmarkColor = color ?? colors.primary;

    return (
        <View style={[styles.row, { gap: dims.gap }]}>
            <Image
                source={require('@/assets/images/happin_logo.png')}
                style={{ width: dims.icon, height: dims.icon }}
                resizeMode="contain"
            />
            <Text style={[styles.wordmark, { fontSize: dims.text, color: wordmarkColor }]}>
                happin
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    wordmark: {
        fontWeight: '800',
        letterSpacing: -0.5,
    },
});
