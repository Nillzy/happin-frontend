import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export function SkeletonBox({ width, height, borderRadius = 8, style }: {
    width?: number | `${number}%` | 'auto';
    height: number;
    borderRadius?: number;
    style?: ViewStyle;
}) {
    const { colors } = useTheme();
    const opacity = useRef(new Animated.Value(0.35)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                { width: width ?? '100%', height, borderRadius, backgroundColor: colors.outlineVariant, opacity },
                style,
            ]}
        />
    );
}

// Skeleton-Card für EventListScreen / MyEventsScreen
export function SkeletonEventCard({ web = false }: { web?: boolean }) {
    const { colors } = useTheme();
    return (
        <View style={[skeletonStyles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }, web && skeletonStyles.cardWeb]}>
            <SkeletonBox height={180} borderRadius={0} style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />
            <View style={skeletonStyles.body}>
                <SkeletonBox height={18} width="75%" borderRadius={6} style={{ marginBottom: 8 }} />
                <SkeletonBox height={13} width="55%" borderRadius={5} style={{ marginBottom: 12 }} />
                <SkeletonBox height={22} width="40%" borderRadius={8} />
            </View>
        </View>
    );
}

// Skeleton für MyEventsScreen Host-Card (Thumbnail + Text + Stats)
export function SkeletonHostCard() {
    const { colors } = useTheme();
    return (
        <View style={[skeletonStyles.hostCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
            {/* Zeile: Thumbnail + Titel + Badge */}
            <View style={skeletonStyles.hostRow}>
                <SkeletonBox width={56} height={56} borderRadius={12} />
                <View style={{ flex: 1, gap: 6 }}>
                    <SkeletonBox height={16} width="65%" borderRadius={5} />
                    <SkeletonBox height={11} width="35%" borderRadius={4} />
                </View>
                <SkeletonBox width={52} height={20} borderRadius={6} />
            </View>
            {/* Datum-Zeile */}
            <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
                <SkeletonBox height={13} width="55%" borderRadius={4} />
            </View>
            {/* Stats-Zeile */}
            <View style={[skeletonStyles.hostStats, { borderTopColor: colors.outlineVariant }]}>
                <SkeletonBox height={36} width="28%" borderRadius={6} />
                <SkeletonBox height={36} width="28%" borderRadius={6} />
                <SkeletonBox height={36} width="28%" borderRadius={6} />
            </View>
        </View>
    );
}

// Skeleton für MyEventsScreen Ticket-Card (Text links + QR rechts)
export function SkeletonTicketCard() {
    const { colors } = useTheme();
    return (
        <View style={[skeletonStyles.ticketCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
            <View style={skeletonStyles.ticketRow}>
                <View style={{ flex: 1, gap: 8 }}>
                    <SkeletonBox height={18} width="70%" borderRadius={6} />
                    <SkeletonBox height={13} width="55%" borderRadius={5} />
                    <SkeletonBox height={22} width="38%" borderRadius={8} />
                </View>
                {/* QR-Platzhalter */}
                <SkeletonBox width={84} height={84} borderRadius={12} />
            </View>
        </View>
    );
}

const skeletonStyles = StyleSheet.create({
    card: {
        marginHorizontal: 24,
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardWeb: {
        marginHorizontal: 0,
        width: '100%',
    },
    body: {
        padding: 16,
    },
    hostCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    hostRow: {
        flexDirection: 'row',
        padding: 12,
        gap: 12,
        alignItems: 'center',
    },
    hostStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        padding: 12,
    },
    ticketCard: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    ticketRow: {
        flexDirection: 'row',
        padding: 12,
        gap: 12,
        alignItems: 'center',
    },
});
