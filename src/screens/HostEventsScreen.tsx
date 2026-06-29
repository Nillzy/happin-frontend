import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Platform,
    TouchableOpacity,
    Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/contexts/ThemeContext';
import Navbar from '../components/atoms/Navbar';
import Footer from '../components/atoms/Footer';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import { EventListItem } from '../types/events';
import { api } from '../services/api';
import { getSession } from '../services/supabase';
import { getGradientByIndex } from '../constants/gradients';

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

export default function HostEventsScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { hostId } = useLocalSearchParams<{ hostId: string }>();

    const [events, setEvents] = useState<EventListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [hostName, setHostName] = useState<string>('');

    const loadEvents = useCallback(async (offset: number = 0) => {
        if (!hostId) return;

        try {
            const token = await getSession();
            if (!token) {
                router.replace('/login');
                return;
            }
            const response = await api.getEventsByHost(hostId, 50, offset, token);

            if (offset === 0) {
                setEvents(response.events);
                // Get host name from first event
                if (response.events.length > 0) {
                    const firstEvent = await api.getEventById(response.events[0].event_id, token);
                    setHostName(firstEvent.host_name || 'Organisator');
                }
            } else {
                setEvents(prev => [...prev, ...response.events]);
            }

            setTotalCount(response.count);
            setHasMore(response.events.length === 50);
        } catch (error) {
            console.error('Failed to load host events:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [hostId]);

    useEffect(() => {
        loadEvents(0);
    }, [loadEvents]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            setLoadingMore(true);
            loadEvents(events.length);
        }
    };

    const handleEventPress = (eventId: string) => {
        router.push(`/event/${eventId}`);
    };

    if (loading) {
        return (
            <ScreenWithNav>
                <View style={[styles.root, { backgroundColor: colors.background }]}>
                    <Navbar showCta={false} />
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                </View>
            </ScreenWithNav>
        );
    }

    return (
        <ScreenWithNav>
            <Head>
                <title>Events von {hostName} – Happin</title>
            </Head>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <Navbar showCta={false} />

                <View style={[styles.container, Platform.OS === 'web' && styles.containerWeb]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.onSurface }]}>
                            Events von {hostName}
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                            {totalCount} {totalCount === 1 ? 'Event' : 'Events'}
                        </Text>
                    </View>

                    {/* Events List */}
                    {events.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
                                Keine öffentlichen Events gefunden
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={events}
                            keyExtractor={(item) => item.event_id}
                            renderItem={({ item, index }) => {
                                const gradient = item.gradient_id != null ? getGradientByIndex(item.gradient_id) : getGradientByIndex(index);
                                return (
                                    <TouchableOpacity
                                        activeOpacity={0.85}
                                        style={[
                                            styles.card,
                                            {
                                                backgroundColor: colors.surfaceContainer,
                                                borderColor: colors.outlineVariant,
                                            },
                                        ]}
                                        onPress={() => handleEventPress(item.event_id)}
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
                                            {item.is_free && (
                                                <View style={styles.freeBadge}>
                                                    <Text style={styles.freeBadgeText}>Kostenlos</Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.cardBody}>
                                            <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={2}>
                                                {item.title}
                                            </Text>

                                            <Text style={[styles.cardMetaText, { color: colors.onSurfaceVariant }]}>
                                                {formatDateGerman(item.starts_at)}
                                                {item.location?.city
                                                    ? ` · ${item.location.city}`
                                                    : (item.location?.latitude != null && item.location?.longitude != null)
                                                    ? ` · ${item.location.latitude.toFixed(2)}, ${item.location.longitude.toFixed(2)}`
                                                    : item.location?.country
                                                    ? ` · ${item.location.country}`
                                                    : ''}
                                                {` · ${item.participant_count} Teilnehmer`}
                                            </Text>

                                            <View style={styles.cardFooter}>
                                                {item.category && (
                                                    <View style={styles.chipRow}>
                                                        {item.category.split(',').slice(0, 2).map((cat, idx) => (
                                                            <View key={idx} style={[styles.chip, { backgroundColor: colors.surfaceContainerHigh }]}>
                                                                <Text style={[styles.chipText, { color: colors.primary }]}>
                                                                    {cat.trim()}
                                                                </Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={
                                loadingMore ? (
                                    <View style={styles.loadingMore}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    </View>
                                ) : null
                            }
                        />
                    )}

                    <Footer />
                </View>
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
    },
    containerWeb: {
        maxWidth: 1200,
        width: '100%',
        alignSelf: 'center',
    },
    header: {
        paddingTop: 24,
        paddingBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 24,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    loadingMore: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
    },
    imageContainer: {
        position: 'relative',
        width: '100%',
        height: 200,
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    freeBadge: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        backgroundColor: '#10b98180',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backdropFilter: 'blur(8px)',
    },
    freeBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardBody: {
        padding: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    cardMetaText: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 8,
    },
    cardFooter: {
        marginTop: 4,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '600',
    },
});
