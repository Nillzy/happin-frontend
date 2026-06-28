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
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/src/contexts/ThemeContext';
import { api } from '@/src/services/api';
import { getSession } from '@/src/services/supabase';
import { deviceLabelFromUserAgent } from '@/src/utils/userAgent';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';

type DeviceItem =
    | {
          kind: 'web';
          id: string;
          endpoint: string;
          userAgent: string | null;
          createdAt: string;
      }
    | {
          kind: 'native';
          id: string;
          platform: 'ios' | 'android';
          userAgent: string | null;
          createdAt: string;
      };

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

export default function DevicesScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [items, setItems] = useState<DeviceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = useCallback(async (mode: 'initial' | 'refresh') => {
        try {
            const token = await getSession();
            if (!token) {
                router.replace('/login' as any);
                return;
            }
            const [web, native] = await Promise.all([
                api.listWebPushSubscriptions(token).catch(() => ({ items: [] })),
                api.listExpoPushTokens(token).catch(() => ({ items: [] })),
            ]);
            const merged: DeviceItem[] = [
                ...web.items.map((it) => ({
                    kind: 'web' as const,
                    id: it.web_push_subscription_id,
                    endpoint: it.endpoint,
                    userAgent: it.user_agent,
                    createdAt: it.created_at,
                })),
                ...native.items.map((it) => ({
                    kind: 'native' as const,
                    id: it.expo_push_token_id,
                    platform: it.platform,
                    userAgent: it.user_agent,
                    createdAt: it.created_at,
                })),
            ];
            merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
            setItems(merged);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [router]);

    useEffect(() => {
        load('initial');
        // Aktive Web-Subscription des Browsers ermitteln, damit wir den
        // "Dieses Gerät"-Marker setzen können.
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            (async () => {
                try {
                    const reg = await navigator.serviceWorker.getRegistration();
                    const sub = await reg?.pushManager.getSubscription();
                    if (sub?.endpoint) setCurrentEndpoint(sub.endpoint);
                } catch {
                    // ignore
                }
            })();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        load('refresh');
    }, [load]);

    const goBack = useCallback(() => {
        if (router.canGoBack()) router.back();
        else router.replace('/account' as any);
    }, [router]);

    const handleDelete = useCallback(async (item: DeviceItem) => {
        const label = deviceLabelFromUserAgent(
            item.userAgent,
            item.kind === 'web' ? 'web' : item.kind === 'native' ? item.platform : undefined,
        ).name;
        const message = `"${label}" wirklich entfernen? Auf diesem Gerät kommen dann keine Pushes mehr an.`;
        const confirmed = Platform.OS === 'web'
            ? window.confirm(message)
            : await new Promise<boolean>((resolve) =>
                Alert.alert('Gerät entfernen', message, [
                    { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
                    { text: 'Entfernen', style: 'destructive', onPress: () => resolve(true) },
                ]),
            );
        if (!confirmed) return;
        try {
            setDeletingId(item.id);
            const token = await getSession();
            if (!token) return;
            if (item.kind === 'web') {
                await api.deleteWebPushSubscriptionById(token, item.id);
            } else {
                await api.deleteExpoPushTokenById(token, item.id);
            }
            setItems((prev) => prev.filter((it) => it.id !== item.id));
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Gerät konnte nicht entfernt werden.';
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Fehler', msg);
        } finally {
            setDeletingId(null);
        }
    }, []);

    const renderItem = useCallback(({ item }: { item: DeviceItem }) => {
        const platformHint = item.kind === 'web' ? 'web' : item.platform;
        const label = deviceLabelFromUserAgent(item.userAgent, platformHint);
        const isCurrent = item.kind === 'web' && currentEndpoint && item.endpoint === currentEndpoint;
        const iconName = label.icon === 'web' ? 'globe-outline' : 'phone-portrait-outline';
        return (
            <View
                style={[
                    styles.row,
                    {
                        backgroundColor: colors.surface,
                        borderBottomColor: colors.outlineVariant,
                    },
                ]}
            >
                <View style={[styles.iconWrap, { backgroundColor: colors.primaryContainer }]}>
                    <Ionicons name={iconName} size={20} color={colors.onPrimaryContainer} />
                </View>
                <View style={styles.body}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>
                            {label.name}
                        </Text>
                        {isCurrent && (
                            <View style={[styles.badge, { backgroundColor: colors.primaryContainer }]}>
                                <Text style={[styles.badgeText, { color: colors.onPrimaryContainer }]}>
                                    Dieses Gerät
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.meta, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                        Hinzugefügt am {formatDate(item.createdAt)}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    style={styles.deleteBtn}
                    activeOpacity={0.7}
                    accessibilityLabel="Gerät entfernen"
                >
                    {deletingId === item.id ? (
                        <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                    )}
                </TouchableOpacity>
            </View>
        );
    }, [colors, currentEndpoint, deletingId, handleDelete]);

    const empty = (
        <View style={styles.empty}>
            <Ionicons name="phone-portrait-outline" size={48} color={colors.onSurfaceVariant} />
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
                Keine Geräte registriert.
            </Text>
            <Text style={[styles.emptyHint, { color: colors.onSurfaceVariant }]}>
                Aktiviere Reminder in den Einstellungen, um auf diesem Gerät Pushes zu erhalten.
            </Text>
        </View>
    );

    return (
        <ScreenWithNav showBottomNav={false}>
            {Platform.OS === 'web' && (
                <Head>
                    <title>Push-aktivierte Geräte – Happin</title>
                </Head>
            )}
            <Navbar showBack onBackPress={goBack} />
            {Platform.OS !== 'web' && (
                <TouchableOpacity onPress={goBack} style={[styles.mobileBack, { paddingTop: insets.top + 8 }]} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
                    <Text style={[styles.mobileBackText, { color: colors.onSurface }]}>Zurück</Text>
                </TouchableOpacity>
            )}
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.heading, { color: colors.onBackground }]}>Push-aktivierte Geräte</Text>
                </View>
                <Text style={[styles.intro, { color: colors.onSurfaceVariant }]}>
                    Auf diesen Geräten sind Push-Benachrichtigungen für deinen Account aktiv.
                </Text>
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
                        keyExtractor={(it) => `${it.kind}:${it.id}`}
                        renderItem={renderItem}
                        ListEmptyComponent={empty}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor={colors.primary}
                            />
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
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 4,
    },
    heading: {
        fontSize: 22,
        fontWeight: '700',
    },
    intro: {
        fontSize: 13,
        paddingHorizontal: 20,
        paddingBottom: 12,
        lineHeight: 18,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
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
        flexWrap: 'wrap',
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        flexShrink: 1,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    meta: {
        fontSize: 12,
    },
    deleteBtn: {
        padding: 8,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 40,
    },
    emptyText: {
        fontSize: 15,
        fontWeight: '600',
    },
    emptyHint: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
});
