import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface HappinLogoProps {
    size?: 'sm' | 'md' | 'lg';
    /** Override the icon color (defaults to theme primary) */
    color?: string;
}

const SIZE_MAP = {
    sm: { icon: 20, text: 18, gap: 6 },
    md: { icon: 26, text: 22, gap: 8 },
    lg: { icon: 36, text: 32, gap: 10 },
};

/** Happin brand mark: a stylized location-pin with a heart cutout */
function HappinMark({ size, color }: { size: number; color: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <Defs>
                <LinearGradient id="pinGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={color} stopOpacity="1" />
                    <Stop offset="1" stopColor={color} stopOpacity="0.7" />
                </LinearGradient>
            </Defs>
            {/* Pin body */}
            <Path
                d="M16 2C10.477 2 6 6.477 6 12c0 7 10 18 10 18s10-11 10-18c0-5.523-4.477-10-10-10z"
                fill="url(#pinGrad)"
            />
            {/* Heart cutout (white) */}
            <Path
                d="M16 9.5c-1.5-1.5-4 0-4 2.2 0 2.8 4 5.3 4 5.3s4-2.5 4-5.3c0-2.2-2.5-3.7-4-2.2z"
                fill="#ffffff"
                opacity="0.9"
            />
        </Svg>
    );
}

export default function HappinLogo({ size = 'md', color }: HappinLogoProps) {
    const { colors } = useTheme();
    const dims = SIZE_MAP[size];
    const logoColor = color ?? colors.primary;

    return (
        <View style={[styles.row, { gap: dims.gap }]}>
            <HappinMark size={dims.icon} color={logoColor} />
            <Text style={[styles.wordmark, { fontSize: dims.text, color: logoColor }]}>
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
