import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import BottomNavBar from './BottomNavBar';

interface ScreenWithNavProps {
    children: ReactNode;
    /** Zeige die Bottom Navigation (default: true auf Mobile, false auf Web) */
    showBottomNav?: boolean;
}

/**
 * ScreenWithNav - Wrapper-Komponente für Screens mit Bottom Navigation
 *
 * Nutzt diese Komponente als Container für Screens, die die Bottom Nav
 * anzeigen sollen (Mobile-First).
 *
 * UPDATE: Standardmäßig auf allen Plattformen aktiviert (auch Web) für Testing.
 *
 * @example
 * ```tsx
 * export default function MyScreen() {
 *   return (
 *     <ScreenWithNav>
 *       <View style={{ flex: 1 }}>
 *         <Text>Screen Content</Text>
 *       </View>
 *     </ScreenWithNav>
 *   );
 * }
 * ```
 */
export default function ScreenWithNav({
    children,
    showBottomNav = true, // Geändert: Jetzt standardmäßig aktiviert für alle Plattformen
}: ScreenWithNavProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Screen Content */}
            <View style={styles.content}>{children}</View>

            {/* Bottom Navigation */}
            {showBottomNav && <BottomNavBar />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
});
