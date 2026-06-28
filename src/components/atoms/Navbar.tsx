import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import HappinLogo from './HappinLogo';
import DarkLightToggle from './DarkLightToggle';
import NotificationBell from './NotificationBell';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface NavbarProps {
    showCta?: boolean;
    showBack?: boolean;
    onBackPress?: () => void;
    showNavItems?: boolean;
    /** Wenn true: immer rendern (auch auf Mobile/schmalem Viewport), nur Logo + CTA + Toggle */
    landingPage?: boolean;
}

interface NavTab {
    name: string;
    route: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
    label: string;
}

const NAV_TABS: NavTab[] = [
    { name: 'explore', route: '/events', icon: 'compass-outline', activeIcon: 'compass', label: 'Explore' },
    { name: 'map', route: '/map', icon: 'map-outline', activeIcon: 'map', label: 'Karte' },
    { name: 'my-events', route: '/my-events', icon: 'calendar-outline', activeIcon: 'calendar', label: 'Events' },
    { name: 'account', route: '/account', icon: 'person-outline', activeIcon: 'person', label: 'Konto' },
];

export default function Navbar({ showCta = true, showBack = false, onBackPress, showNavItems = true, landingPage = false }: NavbarProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 768;

    if (!landingPage && (Platform.OS !== 'web' || width < 768)) return null;

    const borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    const activeTab = NAV_TABS.find((tab) => {
        if (tab.route === pathname) return true;
        if (pathname.startsWith(tab.route + '/')) {
            if (tab.route === '/events' && pathname.startsWith('/events/create')) return false;
            return true;
        }
        return false;
    });

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
                {!landingPage && isDesktop && !showBack && showNavItems ? (
                    <>
                        {NAV_TABS.map((tab) => {
                            const isActive = activeTab?.name === tab.name;
                            const iconColor = isActive ? colors.primary : colors.onSurfaceVariant;
                            const iconName = isActive ? tab.activeIcon : tab.icon;
                            return (
                                <TouchableOpacity
                                    key={tab.name}
                                    style={[
                                        styles.navItem,
                                        isActive && { backgroundColor: isDark ? `${colors.primary}18` : `${colors.primary}12` },
                                    ]}
                                    onPress={() => router.push(tab.route as any)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={iconName} size={18} color={iconColor} />
                                    <Text style={[styles.navItemText, { color: iconColor, fontWeight: '600' }]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        <NotificationBell />
                        <TouchableOpacity
                            style={[styles.createBtn, { borderColor: colors.primary }]}
                            onPress={() => router.push('/events/create' as any)}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.createBtnText, { color: colors.primary }]}>Event erstellen</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    showCta && !showBack && Platform.OS === 'web' && width < 768 && (
                        <TouchableOpacity
                            style={[styles.cta, { borderColor: colors.primary }]}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.ctaText, { color: colors.primary }]}>App laden</Text>
                        </TouchableOpacity>
                    )
                )}
                {landingPage && <DarkLightToggle />}
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
        paddingVertical: 0,
        paddingTop: Platform.OS === 'ios' ? 44 : Platform.OS === 'android' ? 16 : 0,
        height: Platform.OS === 'ios' ? 44 + 52 : Platform.OS === 'android' ? 16 + 52 : 52,
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
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
    },
    navItemText: {
        fontSize: 14,
    },
    createBtn: {
        marginLeft: 8,
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 9999,
        borderWidth: 1,
    },
    createBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    cta: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
    },
    ctaText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
