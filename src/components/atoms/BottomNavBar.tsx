import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * BottomNavBar - Mobile Bottom Navigation
 *
 * Zeigt 5 Haupt-Tabs:
 * 1. Explore (Öffentliche Events)
 * 2. Karte (Map View)
 * 3. Erstellen (Event erstellen)
 * 4. Deine Events (Host-Verwaltung)
 * 5. Konto (Account/Profil)
 *
 * Design:
 * - Fixed am unteren Bildschirmrand
 * - Glassmorphismus (Dark Mode) / Card Shadow (Light Mode)
 * - Aktiver Tab: Primary Color + Text
 * - Inaktiver Tab: onSurfaceVariant Color
 */

interface NavTab {
    name: string;
    route: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
    label: string;
}

const NAV_TABS: NavTab[] = [
    {
        name: 'explore',
        route: '/events',
        icon: 'compass-outline',
        activeIcon: 'compass',
        label: 'Explore',
    },
    {
        name: 'map',
        route: '/map',
        icon: 'map-outline',
        activeIcon: 'map',
        label: 'Karte',
    },
    {
        name: 'create',
        route: '/events/create',
        icon: 'add-circle-outline',
        activeIcon: 'add-circle',
        label: 'Erstellen',
    },
    {
        name: 'my-events',
        route: '/my-events',
        icon: 'calendar-outline',
        activeIcon: 'calendar',
        label: 'Events',
    },
    {
        name: 'account',
        route: '/account',
        icon: 'person-outline',
        activeIcon: 'person',
        label: 'Konto',
    },
];

export default function BottomNavBar() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();

    // Bestimme aktiven Tab basierend auf aktueller Route
    // WICHTIG: Längere/spezifischere Routes zuerst checken (z.B. /events/create vor /events)
    const activeTab = NAV_TABS.find((tab) => {
        // Exakte Route-Übereinstimmung
        if (tab.route === pathname) return true;
        // Unterrouten (z.B. /events/123, aber nicht /events/create wenn tab.route = /events)
        if (pathname.startsWith(tab.route + '/')) {
            // Spezial-Check für /events: darf nicht /events/create matchen
            if (tab.route === '/events' && pathname.startsWith('/events/create')) {
                return false;
            }
            return true;
        }
        return false;
    });

    const handleTabPress = (tab: NavTab) => {
        router.push(tab.route as any);
    };

    const containerStyle = [
        styles.container,
        {
            backgroundColor: isDark
                ? 'rgba(30, 31, 38, 0.85)' // surface-container-low mit Transparenz
                : colors.surfaceContainerLowest,
            borderTopColor: isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.08)',
            paddingBottom: Math.max(insets.bottom, 8),
        },
    ];

    // Glassmorphismus nur im Dark Mode
    if (isDark && Platform.OS !== 'web') {
        // Native Blur nicht verfügbar, stattdessen Transparenz
        // TODO: Für iOS/Android BlurView aus @react-native-community/blur einbauen
    }

    return (
        <View style={containerStyle}>
            {NAV_TABS.map((tab) => {
                const isActive = activeTab?.name === tab.name;
                const iconColor = isActive ? colors.primary : colors.onSurfaceVariant;
                const iconName = isActive ? tab.activeIcon : tab.icon;
                const isCreateButton = tab.name === 'create';

                // Create Button: Floating Style mit größerem Icon und Kreis-Hintergrund
                if (isCreateButton) {
                    return (
                        <View key={tab.name} style={styles.createButtonWrapper}>
                            {/* Innerer Button */}
                            <TouchableOpacity
                                style={[
                                    styles.createButton,
                                    {
                                        backgroundColor: colors.primary,
                                        shadowColor: colors.primary,
                                    },
                                ]}
                                onPress={() => handleTabPress(tab)}
                                activeOpacity={0.85}
                            >
                                <Ionicons
                                    name="add"
                                    size={32}
                                    color={colors.onPrimary}
                                />
                            </TouchableOpacity>
                        </View>
                    );
                }

                // Normale Tabs
                return (
                    <TouchableOpacity
                        key={tab.name}
                        style={styles.tab}
                        onPress={() => handleTabPress(tab)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={iconName} size={24} color={iconColor} />
                        <Text
                            style={[
                                styles.label,
                                {
                                    color: iconColor,
                                    fontWeight: isActive ? '600' : '500',
                                },
                            ]}
                        >
                            {tab.label}
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
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 8,
        paddingHorizontal: 8,
        borderTopWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 4,
    },
    createButtonWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    createButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -28, // Floating über der Bottom Nav
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 12,
            },
            web: {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            },
        }),
    },
    label: {
        fontSize: 11,
        letterSpacing: 0.2,
        marginTop: 2,
    },
});
