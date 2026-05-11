import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
    Image,
    Platform,
    TextInput,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import { api } from '../services/api';
import { authorize, getSession } from '../services/supabase';
import { useSavedEvents } from '../contexts/SavedEventsContext';
import { getGradientByIndex } from '../constants/gradients';
import type { EventListItem, EventListResponse } from '../types/events';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const CARD_MARGIN_H = 24;
const CARD_WIDTH = isWeb ? Math.min(SCREEN_WIDTH - CARD_MARGIN_H * 2, 600) : SCREEN_WIDTH - CARD_MARGIN_H * 2;

const CONTAINER_MAX_WIDTH = 2560;
const GRID_PADDING = 24;
const GRID_GAP_H = 20;
const GRID_GAP_V = 16;

function getNumColumns(width: number): number {
    if (width >= 2560) return 5;
    if (width >= 1920) return 4;
    if (width >= 1200) return 3;
    if (width >= 768) return 2;
    return 1;
}

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

const EVENTS_PER_PAGE = 12;

// Modul-Level Cache — überlebt Tab-Wechsel
let cachedEvents: EventListItem[] = [];
let cachedHasMore = false;

export default function EventListScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { period, role } = useLocalSearchParams<{ period?: string; role?: string }>();
    const isOrganizerView = role === 'organizer';
    const eventPeriod = (period === 'past' ? 'past' : 'upcoming') as 'upcoming' | 'past';

    const { toggleSaveEvent, isSaved } = useSavedEvents();

    const [events, setEvents] = useState<EventListItem[]>(cachedEvents);
    const [loading, setLoading] = useState(cachedEvents.length === 0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(cachedHasMore);
    const [error, setError] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const loadingMoreRef = React.useRef(false);
    const hasMoreRef = React.useRef(cachedHasMore);
    const eventsRef = React.useRef<EventListItem[]>(cachedEvents);
    const isOrganizerViewRef = React.useRef(isOrganizerView);
    const eventPeriodRef = React.useRef(eventPeriod);
    isOrganizerViewRef.current = isOrganizerView;
    eventPeriodRef.current = eventPeriod;

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const token = await getSession();
            let data: EventListResponse;
            if (isOrganizerViewRef.current) {
                if (!token) { router.replace('/login'); return; }
                data = await api.getUserEvents(token, eventPeriodRef.current, EVENTS_PER_PAGE, 0, 'organizer');
            } else {
                data = await api.getPublicEvents(EVENTS_PER_PAGE, 0, token || undefined);
            }
            const more = data.events.length === EVENTS_PER_PAGE;
            cachedEvents = data.events;
            cachedHasMore = more;
            eventsRef.current = data.events;
            hasMoreRef.current = more;
            setEvents(data.events);
            setHasMore(more);
        } catch (e) {
            setError('Fehler beim Laden der Events');
        } finally {
            setRefreshing(false);
        }
    }, []);

    const loadMore = useCallback(async () => {
        if (loadingMoreRef.current) return;
        if (!hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
            const token = await getSession();
            const offset = eventsRef.current.length;
            let data: EventListResponse;
            if (isOrganizerViewRef.current) {
                if (!token) { router.replace('/login'); return; }
                data = await api.getUserEvents(token, eventPeriodRef.current, EVENTS_PER_PAGE, offset, 'organizer');
            } else {
                data = await api.getPublicEvents(EVENTS_PER_PAGE, offset, token || undefined);
            }
            const next = [...eventsRef.current, ...data.events];
            const more = data.events.length === EVENTS_PER_PAGE;
            cachedEvents = next;
            cachedHasMore = more;
            eventsRef.current = next;
            hasMoreRef.current = more;
            setEvents(next);
            setHasMore(more);
        } catch (e) {
            setError('Fehler beim Laden der Events');
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        authorize().then((isAuthorized) => {
            if (!isAuthorized) router.replace('/login');
        });
    }, []);

    useEffect(() => {
        // Cache vorhanden — kein erneuter Load nötig
        if (cachedEvents.length > 0) return;

        const loadInitial = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = await getSession();
                let data: EventListResponse;
                if (isOrganizerView) {
                    if (!token) { router.replace('/login'); return; }
                    data = await api.getUserEvents(token, eventPeriod, EVENTS_PER_PAGE, 0, 'organizer');
                } else {
                    data = await api.getPublicEvents(EVENTS_PER_PAGE, 0, token || undefined);
                }
                const more = data.events.length === EVENTS_PER_PAGE;
                cachedEvents = data.events;
                cachedHasMore = more;
                eventsRef.current = data.events;
                hasMoreRef.current = more;
                setEvents(data.events);
                setHasMore(more);
            } catch (e) {
                setError('Fehler beim Laden der Events');
            } finally {
                setLoading(false);
            }
        };
        void loadInitial();
    }, []);

    useEffect(() => {
        if (!isWeb) return;
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });
        return () => subscription?.remove();
    }, []);

    // MOCK: Fake Event zum Testen der Card UI — entfernen wenn nicht mehr benötigt
    const displayEvents = events;

    const handleEventPress = (event: EventListItem) => {
        router.push(`/event/${event.event_id}`);
    };

    const handleToggleSave = (event: EventListItem, e?: any) => {
        if (e) e.stopPropagation();
        toggleSaveEvent(event);
    };

    const renderCard = ({ item, index }: { item: EventListItem; index: number }) => {
        const gradient = item.gradient_id != null ? getGradientByIndex(item.gradient_id) : getGradientByIndex(index);
        return (
            <TouchableOpacity
                activeOpacity={0.85}
                style={[
                    isWeb ? styles.cardWeb : styles.card,
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
                            <Text style={[styles.hostBadgeText, { color: colors.onPrimary }]}>Dein Event</Text>
                        </View>
                    )}
                    {item.is_free && (
                        <View style={styles.freeBadge}>
                            <Text style={styles.freeBadgeText}>Kostenlos</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.likeButton}
                        onPress={(e) => handleToggleSave(item, e)}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={isSaved(item.event_id) ? 'heart' : 'heart-outline'}
                            size={20}
                            color={isSaved(item.event_id) ? colors.primary : '#ffffff'}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    <Text style={[styles.cardMetaText, { color: colors.onSurfaceVariant }]}>
                        {formatDateGerman(item.starts_at)}
                        {item.location?.city ? ` · ${item.location.city}` : ''}
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
    };

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

    const renderFooter = () => {
        if (!hasMore && !loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    const numColumns = getNumColumns(dimensions.width);
    const containerWidth = Math.min(dimensions.width, CONTAINER_MAX_WIDTH);
    const availableWidth = containerWidth - GRID_PADDING * 2;
    const cardWidth = (availableWidth - GRID_GAP_H * (numColumns - 1)) / numColumns;

    const renderWebGrid = () => (
        <ScrollView
            style={styles.webScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) => {
                if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 100) {
                    void loadMore();
                }
            }}
            scrollEventThrottle={300}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.primary}
                />
            }
        >
            {displayEvents.length === 0 ? (
                renderEmpty()
            ) : (
                <View style={[styles.gridContainer, { maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center', width: '100%' }]}>
                    {displayEvents.map((item, index) => (
                        <View
                            key={String(item.event_id)}
                            style={[
                                styles.gridItem,
                                {
                                    width: cardWidth,
                                    marginRight: (index + 1) % numColumns === 0 ? 0 : GRID_GAP_H,
                                    marginBottom: GRID_GAP_V,
                                }
                            ]}
                        >
                            {renderCard({ item, index })}
                        </View>
                    ))}
                </View>
            )}
            {renderFooter()}
        </ScrollView>
    );

    const renderMobileList = () => (
        <FlatList
            data={displayEvents}
            keyExtractor={(item) => String(item.event_id)}
            renderItem={renderCard}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onEndReached={() => void loadMore()}
            onEndReachedThreshold={0.3}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.primary}
                />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
        />
    );

    return (
        <ScreenWithNav>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                {isWeb && <Navbar showCta={false} />}

                <View style={[styles.searchContainer, { backgroundColor: colors.background, borderBottomColor: colors.outlineVariant }]}>
                    <View style={[styles.searchBar, { backgroundColor: colors.surfaceContainerHigh }]}>
                        <Ionicons name="search" size={20} color={colors.onSurfaceVariant} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.onSurface }]}
                            placeholder="Events durchsuchen"
                            placeholderTextColor={colors.onSurfaceVariant}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => console.log('Filter öffnen')}
                        >
                            <Ionicons name="options-outline" size={22} color={colors.onSurface} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.savedButton, { backgroundColor: colors.surfaceContainerHigh }]}
                        onPress={() => router.push('/saved-events')}
                    >
                        <Ionicons name="heart-outline" size={22} color={colors.onSurface} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: colors.primary }]}
                            onPress={handleRefresh}
                        >
                            <Text style={[styles.retryText, { color: colors.onPrimary }]}>
                                Erneut versuchen
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    isWeb ? renderWebGrid() : renderMobileList()
                )}
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        ...(Platform.OS === 'web' ? { overflow: 'hidden' } as any : {}),
    },
    webScroll: {
        flex: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 20,
        gap: 12,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '400',
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    filterButton: {
        padding: 4,
    },
    savedButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
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
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 24,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: GRID_PADDING,
        alignItems: 'stretch',
    },
    gridItem: {},
    listContent: {
        paddingTop: 16,
        paddingBottom: 24,
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
    cardWeb: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        width: '100%',
        flex: 1,
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
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    hostBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    likeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
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
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        flex: 1,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    chipText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    freeBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(22, 163, 74, 0.88)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    freeBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    emptyContainer: {
        paddingVertical: 64,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
    },
    footerLoader: {
        paddingVertical: 24,
        alignItems: 'center',
    },
});
