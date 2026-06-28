import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import HappinLogo from './HappinLogo';
import { useRouter } from 'expo-router';

const LINKS = [
    { label: 'Datenschutz', route: '/privacy' },
    { label: 'Impressum', route: '/imprint' },
    { label: 'Kontakt', route: '/contact' },
];

export default function Footer() {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const year = new Date().getFullYear();

    return (
        <View style={[styles.footer, { borderTopColor: borderColor, backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={() => router.push('/')} activeOpacity={0.85}>
                <HappinLogo size="sm" />
            </TouchableOpacity>

            <View style={styles.links}>
                {LINKS.map((link, i) => (
                    <React.Fragment key={link.route}>
                        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push(link.route as any)}>
                            <Text style={[styles.link, { color: colors.onSurfaceVariant }]}>
                                {link.label}
                            </Text>
                        </TouchableOpacity>
                        {i < LINKS.length - 1 && (
                            <Text style={[styles.dot, { color: colors.outlineVariant }]}>·</Text>
                        )}
                    </React.Fragment>
                ))}
            </View>

            <Text style={[styles.copy, { color: colors.onSurfaceVariant }]}>
                © {year} Happin. Alle Rechte vorbehalten.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    footer: {
        marginTop: 32,
        paddingHorizontal: 24,
        paddingVertical: 28,
        alignItems: 'center',
        borderTopWidth: 1,
        gap: 12,
    },
    links: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    link: {
        fontSize: 12,
        fontWeight: '500',
    },
    dot: {
        fontSize: 12,
    },
    copy: {
        fontSize: 11,
    },
});
