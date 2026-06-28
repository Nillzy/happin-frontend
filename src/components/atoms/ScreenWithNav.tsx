import React, { ReactNode } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import BottomNavBar from './BottomNavBar';

interface ScreenWithNavProps {
    children: ReactNode;
    showBottomNav?: boolean;
}

export default function ScreenWithNav({
    children,
    showBottomNav = true,
}: ScreenWithNavProps) {
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    const isMobile = Platform.OS !== 'web' || width < 768;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.content}>{children}</View>
            {showBottomNav && isMobile && <BottomNavBar />}
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

