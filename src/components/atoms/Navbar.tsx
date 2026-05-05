import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import HappinLogo from './HappinLogo';
import DarkLightToggle from './DarkLightToggle';
import { useRouter } from 'expo-router';

interface NavbarProps {
    /** Show the back-navigation arrow instead of CTA (default: false) */
    showBack?: boolean;
    /** Custom back handler (default: router.back()) */
    onBackPress?: () => void;
}

export default function Navbar({ showBack = false, onBackPress }: NavbarProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    return (
        <View style={[styles.nav, { borderBottomColor: borderColor, backgroundColor: colors.background }]}>
            {showBack ? (
                <TouchableOpacity
                    onPress={onBackPress ?? (() => router.back())}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.backText, { color: colors.onSurfaceVariant }]}>← Zurück</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={() => router.push('/')} activeOpacity={0.85}>
                    <HappinLogo size="md" />
                </TouchableOpacity>
            )}

            <View style={styles.right}>
                <DarkLightToggle />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    nav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        paddingTop: Platform.OS === 'ios' ? 54 : 14,
        borderBottomWidth: 1,
    },
    backBtn: {
        paddingVertical: 4,
    },
    backText: {
        fontSize: 15,
        fontWeight: '500',
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
});
