import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/contexts/ThemeContext';
import { api } from '@/src/services/api';
import { getSession } from '@/src/services/supabase';
import { useNotifications } from '@/src/contexts/NotificationsContext';
import type { NotificationItem, NotificationType } from '@/src/types/notifications';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<NotificationType, string> = {
    event_updated: 'Event aktualisiert',
    event_cancelled: 'Event abgesagt',
    new_participant: 'Neuer Teilnehmer',
    participant_cancelled: 'Teilnehmer abgesagt',
};

const TYPE_ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
    event_updated: 'create-outline',
    event_cancelled: 'close-circle-outline',
    new_participant: 'person-add-outline',
    participant_cancelled: 'person-remove-outline',
};

const FIELD_LABELS: Record<string, string> = {
    title: 'Titel',
    description: 'Beschreibung',
    starts_at: 'Startzeit',
    ends_at: 'Endzeit',
    location: 'Ort',
    media: 'Bilder',
    is_public: 'Sichtbarkeit',
    is_free: 'Preis',
};

function formatBody(item: NotificationItem): string {
    if (item.type === 'event_cancelled') {
        return `${item.payload.event_title ?? 'Event'} wurde abgesagt.`;
    }
    if (item.type === 'event_updated') {
        const fields = (item.payload.changed_fields ?? [])
            .map((f) => FIELD_LABELS[f] ?? f)
            .filter(Boolean);
        const list = fields.length ? ` (${fields.join(', ')})` : '';
        return `${item.payload.event_title ?? 'Event'} wurde aktualisiert${list}.`;
    }
    if (item.type === 'new_participant') {
        const name = item.payload.participant_name ?? 'Jemand';
        return `${name} hat bei "${item.payload.event_title ?? 'deinem Event'}" zugesagt.`;
    }
    if (item.type === 'participant_cancelled') {
        const name = item.payload.participant_name ?? 'Jemand';
        return `${name} hat bei "${item.payload.event_title ?? 'deinem Event'}" abgesagt.`;
    }
    return '';
}

function formatRelative(iso: string): string {
    const ts = new Date(iso).getTime();
    const diffSec = Math.max(1, Math.round((Date.now() - ts) / 1000));
    if (diffSec < 60) return 'gerade eben';
    const diffMin = Math.round(diffSec / 60);
    if (diffMin < 60) return `vor ${diffMin} Min.`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `vor ${diffH} Std.`;
    const diffD = Math.round(diffH / 24);
    if (diffD < 7) return `vor ${diffD} Tag${diffD === 1 ? '' : 'en'}`;
    return new Date(iso).toLocaleDateString('de-DE');
}

export default function NotificationsScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { refreshUnreadCount } = useNotifications();

    const [items, setItems] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (mode: 'initial' | 'refresh' | 'more') => {
        try {
            const token = await getSession();
            if (!token) {
                router.replace('/login' as any);
                return;
            }
            const before = mode === 'more' && items.length ? items[items.length - 1].notification_id : undefined;
            const resp = await api.listNotifications(token, before, PAGE_SIZE);
            const next = resp.items;
            if (mode === 'more') {
                setItems((prev) => [...prev, ...next]);
            } else {
                setItems(next);
            }
            setHasMore(next.length === PAGE_SIZE);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, [items, router]);

    useEffect(() => {
        load('initial');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Beim Öffnen der Seite alle (jetzt geladenen) Benachrichtigungen als
    // gelesen markieren — der Glocken-Badge soll nach Verlassen der Seite leer
    // sein. Läuft nur, wenn der Initial-Load fertig ist und es ungelesene gibt.
    useEffect(() => {
        if (loading) return;
        if (!items.some((it) => !it.read_at)) return;
        let cancelled = false;
        (async () => {
            const token = await getSession();
            if (!token || cancelled) return;
            try {
                await api.markAllNotificationsRead(token);
                if (cancelled) return;
                const now = new Date().toISOString();
                setItems((prev) => prev.map((it) => (it.read_at ? it : { ...it, read_at: now })));
                refreshUnreadCount();
            } catch (err) {
                console.warn('[notifications] auto-mark-all-read fehlgeschlagen:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load('refresh');
    }, [load]);

    const onEndReached = useCallback(() => {
        if (loadingMore || !hasMore || loading) return;
        setLoadingMore(true);
        load('more');
    }, [loadingMore, hasMore, loading, load]);

    const handleItemPress = useCallback(async (item: NotificationItem) => {
        try {
            const token = await getSession();
            if (token && !item.read_at) {
                await api.markNotificationRead(token, item.notification_id).catch(() => {});
                setItems((prev) =>
                    prev.map((it) =>
                        it.notification_id === item.notification_id
                            ? { ...it, read_at: new Date().toISOString() }
                            : it,
                    ),
                );
                refreshUnreadCount();
            }
        } finally {
            if (item.event_id) {
                router.push({ pathname: '/event/[eventId]' as any, params: { eventId: item.event_id } });
            }
        }
    }, [router, refreshUnreadCount]);

    const goBack = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/events' as any);
        }
    }, [router]);

    const handleTestPush = useCallback(async () => {
        try {
            const token = await getSession();
            if (!token) return;
            await api.sendTestNotification(token);
            await refreshUnreadCount();
            await load('refresh');
        } catch (err) {
            console.warn('[notifications] Test-Push fehlgeschlagen:', err);
        }
    }, [refreshUnreadCount, load]);

    const renderItem = useCallback(({ item }: { item: NotificationItem }) => {
        const unread = !item.read_at;
        return (
            <TouchableOpacity
                onPress={() => handleItemPress(item)}
                style={[
                    styles.row,
                    {
                        backgroundColor: unread ? colors.surfaceContainerLow : colors.surface,
                        borderBottomColor: colors.outlineVariant,
                    },
                ]}
                activeOpacity={0.75}
            >
                <View style={[styles.iconWrap, { backgroundColor: colors.primaryContainer }]}>
                    <Ionicons name={TYPE_ICONS[item.type]} size={20} color={colors.onPrimaryContainer} />
                </View>
                <View style={styles.body}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>
                            {TYPE_LABELS[item.type] ?? item.type}
                        </Text>
                        {unread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                    </View>
                    <Text style={[styles.message, { color: colors.onSurfaceVariant }]} numberOfLines={3}>
                        {formatBody(item)}
                    </Text>
                    <Text style={[styles.time, { color: colors.onSurfaceVariant }]}>
                        {formatRelative(item.created_at)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }, [colors, handleItemPress]);

    const empty = (
        <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.onSurfaceVariant} />
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>Keine Benachrichtigungen</Text>
        </View>
    );

    return (
        <ScreenWithNav showBottomNav={false}>
            {Platform.OS === 'web' && (
                <Head>
                    <title>Benachrichtigungen – Happin</title>
                </Head>
            )}
            <Navbar showBack onBackPress={goBack} />
            {Platform.OS !== 'web' && (
                <TouchableOpacity
                    onPress={goBack}
                    style={[styles.mobileBack, { paddingTop: insets.top + 8 }]}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
                    <Text style={[styles.mobileBackText, { color: colors.onSurface }]}>Zurück</Text>
                </TouchableOpacity>
            )}
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.heading, { color: colors.onBackground }]}>Benachrichtigungen</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={handleTestPush} activeOpacity={0.7} style={styles.testBtn}>
                            <Ionicons name="flask-outline" size={14} color={colors.onSurfaceVariant} />
                            <Text style={[styles.testBtnText, { color: colors.onSurfaceVariant }]}>Test</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {loading ? (
                    <View style={styles.empty}>
                        <ActivityIndicator color={colors.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.empty}>
                        <Text style={{ color: colors.error }}>{error}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(it) => it.notification_id}
                        renderItem={renderItem}
                        ListEmptyComponent={empty}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={colors.primary}
                            />
                        }
                        onEndReached={onEndReached}
                        onEndReachedThreshold={0.4}
                        ListFooterComponent={
                            loadingMore ? (
                                <View style={{ padding: 16, alignItems: 'center' }}>
                                    <ActivityIndicator color={colors.primary} />
                                </View>
                            ) : null
                        }
                    />
                )}
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mobileBack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    mobileBackText: {
        fontSize: 15,
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    heading: {
        fontSize: 22,
        fontWeight: '700',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    testBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    testBtnText: {
        fontSize: 12,
        fontWeight: '500',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        flex: 1,
        gap: 4,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        flexShrink: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    message: {
        fontSize: 14,
        lineHeight: 19,
    },
    time: {
        fontSize: 12,
        marginTop: 2,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 40,
    },
    emptyText: {
        fontSize: 15,
    },
});
