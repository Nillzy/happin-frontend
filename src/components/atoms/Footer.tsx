import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import HappinLogo from './HappinLogo';
import { useAppNavigation } from '@/src/utils/useAppNavigation';

const LINKS = [
    { label: 'Datenschutz', key: 'privacy' },
    { label: 'Impressum', key: 'imprint' },
    { label: 'Kontakt', key: 'contact' },
];

export default function Footer() {
    const { colors, isDark } = useTheme();
    const navigation = useAppNavigation();

    const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    return (
        <View style={[styles.footer, { borderTopColor: borderColor, backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} activeOpacity={0.85}>
                <HappinLogo size="sm" />
            </TouchableOpacity>

            <View style={styles.links}>
                {LINKS.map((link, i) => (
                    <React.Fragment key={link.key}>
                        <TouchableOpacity activeOpacity={0.7}>
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
                © 2025 Happin. Alle Rechte vorbehalten.
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
