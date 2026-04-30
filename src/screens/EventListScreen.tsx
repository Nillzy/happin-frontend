import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
    Image,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import Navbar from '../components/atoms/Navbar';
import Footer from '../components/atoms/Footer';
import { api } from '../services/api';
import { authorize, getSession } from '../services/supabase';
import type { EventListItem } from '../types/events';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const CARD_MARGIN_H = 24;
const CARD_WIDTH = isWeb ? Math.min(SCREEN_WIDTH - CARD_MARGIN_H * 2, 600) : SCREEN_WIDTH - CARD_MARGIN_H * 2;

const GRADIENT_PAIRS = [
    ['#b32053', '#6645c7'],
    ['#6645c7', '#42dae2'],
    ['#00677f', '#6645c7'],
    ['#ff5c8a', '#b32053'],
];

function formatDateGerman(isoDate: string): string {
    const d = new Date(isoDate);
    return new Intl.DateTimeFormat('de-DE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

export default function EventListScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const [events, setEvents] = useState<EventListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await getSession();
            const data = await api.getPublicEvents(50, 0, token || undefined);
            setEvents(data.events);
        } catch (e) {
            setError('Fehler beim Laden der Events');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        authorize().then((isAuthorized) => {
            if (!isAuthorized) router.replace('/login');
        });
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleEventPress = (event: EventListItem) => {
        if (event.is_host) {
            router.push(`/event/${event.event_id}/manage`);
        } else {
            router.push(`/event/${event.event_id}`);
        }
    };

    const renderCard = ({ item, index }: { item: EventListItem; index: number }) => {
        const gradient = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                style={[
                    styles.card,
                    {
                        backgroundColor: colors.surfaceContainer,
                        borderColor: colors.outlineVariant,
                    },
                    item.is_host && { borderColor: `${colors.primary}30`, borderWidth: 1 },
                ]}
                onPress={() => handleEventPress(item)}
            >
                <View style={styles.imageContainer}>
                    {item.image_url ? (
                        <Image
                            source={{ uri: item.image_url }}
                            style={styles.cardImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <LinearGradient
                            colors={gradient as [string, string]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardImage}
                        />
                    )}
                    {item.is_host && (
                        <View style={[styles.hostBadge, { backgroundColor: `${colors.primary}E6` }]}>
                            <Text style={styles.hostBadgeIcon}>👑</Text>
                            <Text style={[styles.hostBadgeText, { color: colors.onPrimary }]}>Dein Event</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    <View style={styles.cardMeta}>
                        <Text style={[styles.cardMetaText, { color: colors.onSurfaceVariant }]}>
                            {formatDateGerman(item.starts_at)}
                        </Text>
                        {item.location?.city && (
                            <Text style={[styles.cardMetaText, { color: colors.onSurfaceVariant }]}>
                                {item.location.city}
                            </Text>
                        )}
                    </View>

                    <View style={styles.cardFooter}>
                        {item.category && (
                            <View style={[styles.chip, { backgroundColor: colors.surfaceContainerHigh }]}>
                                <Text style={[styles.chipText, { color: colors.primary }]}>
                                    {item.category}
                                </Text>
                            </View>
                        )}
                        <Text style={[styles.attendees, { color: colors.onSurfaceVariant }]}>
                            {item.participant_count} Teilnehmer
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={[styles.headerLabel, { color: colors.tertiary }]}>Events</Text>
            <Text style={[styles.headerTitle, { color: colors.onBackground }]}>
                Entdecke Events
            </Text>
            <Text style={[styles.headerSub, { color: colors.onSurfaceVariant }]}>
                Finde die besten Veranstaltungen in deiner Nähe.
            </Text>
        </View>
    );

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
                    Keine Events gefunden
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <Navbar showCta={false} showBack />

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.primary }]}
                        onPress={fetchEvents}
                    >
                        <Text style={[styles.retryText, { color: colors.onPrimary }]}>
                            Erneut versuchen
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={events}
                    keyExtractor={(item) => String(item.event_id)}
                    renderItem={renderCard}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={<Footer />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.fab, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/events/create')}
            >
                <Text style={[styles.fabIcon, { color: colors.onPrimary }]}>+</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    errorText: {
        fontSize: 16,
        marginBottom: 16,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 9999,
    },
    retryText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 0,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 24,
    },
    headerLabel: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    headerSub: {
        fontSize: 15,
        lineHeight: 22,
    },
    card: {
        marginHorizontal: CARD_MARGIN_H,
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        alignSelf: 'center',
        width: CARD_WIDTH,
    },
    cardImage: {
        width: '100%',
        height: 180,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    imageContainer: {
        position: 'relative',
    },
    hostBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    hostBadgeIcon: {
        fontSize: 12,
    },
    hostBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    cardBody: {
        padding: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    cardMeta: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    cardMetaText: {
        fontSize: 13,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    attendees: {
        fontSize: 12,
    },
    emptyContainer: {
        paddingVertical: 64,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
    },
    fabIcon: {
        fontSize: 28,
        fontWeight: '400',
        lineHeight: 30,
    },
});
