import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MarkerCluster, MapMarker } from './types';

function formatDate(iso: string): string {
    const d = new Date(iso);
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]} · ${hh}:${mm}`;
}

interface ClusterSheetProps {
    cluster: MarkerCluster | null;
    onClose: () => void;
    onEventPress: (eventId: string) => void;
    isDark: boolean;
}

export default function ClusterSheet({ cluster, onClose, onEventPress, isDark }: ClusterSheetProps) {
    const bg = isDark ? '#1e1f26' : '#f8f9fa';
    const surface = isDark ? '#292931' : '#ffffff';
    const onSurface = isDark ? '#e3e1ec' : '#191c1d';
    const onSurfaceVariant = isDark ? '#cac4d0' : '#49454f';
    const outlineVariant = isDark ? '#49454f' : '#cac4d0';

    const translateY = useRef(new Animated.Value(600)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const animateClose = useCallback(() => {
        Animated.parallel([
            Animated.timing(translateY, { toValue: 600, duration: 280, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start(() => onCloseRef.current());
    }, [translateY, backdropOpacity]);

    const animateOpen = useCallback(() => {
        translateY.setValue(600);
        backdropOpacity.setValue(0);
        Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
    }, [translateY, backdropOpacity]);

    useEffect(() => {
        if (cluster) animateOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cluster]);

    if (!cluster) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View
                style={[styles.backdrop, { opacity: backdropOpacity }]}
                pointerEvents="box-none"
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
            </Animated.View>

            <Animated.View
                style={[styles.sheet, { backgroundColor: bg, transform: [{ translateY }] }]}
            >
                <View style={styles.dragHandle}>
                    <View style={[styles.dragIndicator, { backgroundColor: outlineVariant }]} />
                </View>

                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: onSurface }]}>
                        {cluster.count} Events hier
                    </Text>
                    <Pressable onPress={animateClose} style={styles.closeBtn} hitSlop={8}>
                        <Text style={[styles.closeBtnText, { color: onSurfaceVariant }]}>✕</Text>
                    </Pressable>
                </View>

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {cluster.markers.map((m: MapMarker) => (
                        <Pressable
                            key={m.eventId}
                            style={[styles.row, { backgroundColor: surface, borderColor: outlineVariant }]}
                            onPress={() => {
                                onEventPress(m.eventId);
                                animateClose();
                            }}
                            android_ripple={{ color: '#b3205322' }}
                        >
                            {m.imageUrl ? (
                                <Image
                                    source={{ uri: m.imageUrl }}
                                    style={styles.thumb}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.thumb, styles.thumbFallback]} />
                            )}
                            <View style={styles.rowBody}>
                                <Text numberOfLines={1} style={[styles.rowTitle, { color: onSurface }]}>
                                    {m.title}
                                </Text>
                                <View style={styles.rowMeta}>
                                    {m.startsAt ? (
                                        <Text style={[styles.rowMetaText, { color: onSurfaceVariant }]}>
                                            {formatDate(m.startsAt)}
                                        </Text>
                                    ) : null}
                                    <View
                                        style={[
                                            styles.badge,
                                            { backgroundColor: m.isFree === false ? '#b3205322' : '#16a34a22' },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.badgeText,
                                                { color: m.isFree === false ? '#b32053' : '#16a34a' },
                                            ]}
                                        >
                                            {m.isFree === false ? 'Kostenpflichtig' : 'Kostenlos'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <Text style={[styles.chevron, { color: onSurfaceVariant }]}>›</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    dragHandle: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    dragIndicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: { padding: 4 },
    closeBtnText: { fontSize: 20 },
    scroll: { flex: 1 },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        minHeight: 68,
    },
    thumb: {
        width: 56,
        alignSelf: 'stretch',
    },
    thumbFallback: {
        backgroundColor: '#b32053',
    },
    rowBody: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 6,
    },
    rowTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    rowMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    rowMetaText: { fontSize: 12 },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    chevron: {
        fontSize: 22,
        paddingRight: 14,
        fontWeight: '300',
    },
});