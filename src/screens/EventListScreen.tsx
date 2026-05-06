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
import type { EventListItem, EventListResponse } from '../types/events';

/**
 * EventListScreen - Responsive Event Overview
 *
 * Displays all public events in a platform-adaptive layout:
 * - Web: Flexbox grid with 1-5 columns based on viewport width
 * - Mobile/Tablet: FlatList with virtualization for performance
 *
 * Breakpoints (Web):
 * - < 768px: 1 column
 * - 768-1199px: 2 columns
 * - 1200-1919px: 3 columns
 * - 1920-2559px: 4 columns (2K/QHD)
 * - ≥ 2560px: 5 columns (Ultrawide 21:9, 4K)
 *
 * Design compliance: DESIGN.md spacing tokens (grid_margin: 24px, grid_gutter: 16px)
 */

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const CARD_MARGIN_H = 24;
const CARD_WIDTH = isWeb ? Math.min(SCREEN_WIDTH - CARD_MARGIN_H * 2, 600) : SCREEN_WIDTH - CARD_MARGIN_H * 2;

// Grid layout configuration for Web (from DESIGN.md)
const CONTAINER_MAX_WIDTH = 2560;  // Support up to 4K/Ultrawide
const GRID_PADDING = 24;  // grid_margin
const GRID_GAP_H = 20;    // gutter horizontal
const GRID_GAP_V = 16;    // grid_gutter vertical

/**
 * Returns number of columns based on viewport width
 * Used for responsive grid layout on Web
 * Supports up to 5 columns for Ultrawide (21:9) and 4K displays
 */
function getNumColumns(width: number): number {
    if (width >= 2560) return 5; // 4K / Ultrawide 21:9 (3440x1440)
    if (width >= 1920) return 4; // 2K / QHD
    if (width >= 1200) return 3; // Desktop
    if (width >= 768) return 2;  // Tablet Landscape
    return 1;                     // Mobile / Tablet Portrait
}

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

// Pagination configuration
const EVENTS_PER_PAGE = 12;

export default function EventListScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { period, role } = useLocalSearchParams<{ period?: string; role?: string }>();
    const isOrganizerView = role === 'organizer';
    const eventPeriod = (period === 'past' ? 'past' : 'upcoming') as 'upcoming' | 'past';

    const { toggleSaveEvent, isSaved } = useSavedEvents();

    const [events, setEvents] = useState<EventListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        setError(null);

        try {
            const token = await getSession();
            const offset = events.length;
            let data: EventListResponse;

            if (isOrganizerView) {
                if (!token) { router.replace('/login'); return; }
                data = await api.getUserEvents(token, eventPeriod, EVENTS_PER_PAGE, offset);
            } else {
                data = await api.getPublicEvents(EVENTS_PER_PAGE, offset, token || undefined);
            }

            setEvents(prev => [...prev, ...data.events]);
            setHasMore(events.length + data.events.length < data.count);
        } catch (e) {
            setError('Fehler beim Laden der Events');
        } finally {
            setLoadingMore(false);
        }
    }, [events.length, hasMore, loadingMore, isOrganizerView, eventPeriod]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        setError(null);

        try {
            const token = await getSession();
            let data: EventListResponse;

            if (isOrganizerView) {
                if (!token) { router.replace('/login'); return; }
                data = await api.getUserEvents(token, eventPeriod, EVENTS_PER_PAGE, 0);
            } else {
                data = await api.getPublicEvents(EVENTS_PER_PAGE, 0, token || undefined);
            }

            setEvents(data.events);
            setHasMore(data.events.length < data.count);
        } catch (e) {
            setError('Fehler beim Laden der Events');
        } finally {
            setRefreshing(false);
        }
    }, [isOrganizerView, eventPeriod]);

    useEffect(() => {
        authorize().then((isAuthorized) => {
            if (!isAuthorized) router.replace('/login');
        });
    }, []);

    useEffect(() => {
        const loadInitial = async () => {
            setLoading(true);
            setError(null);

            try {
                const token = await getSession();
                let data: EventListResponse;

                if (isOrganizerView) {
                    if (!token) { router.replace('/login'); return; }
                    data = await api.getUserEvents(token, eventPeriod, EVENTS_PER_PAGE, 0);
                } else {
                    data = await api.getPublicEvents(EVENTS_PER_PAGE, 0, token || undefined);
                }

                setEvents(data.events);
                setHasMore(data.events.length < data.count);
            } catch (e) {
                setError('Fehler beim Laden der Events');
            } finally {
                setLoading(false);
            }
        };

        void loadInitial();
    }, []);

    // Listen to window resize for responsive grid on Web
    useEffect(() => {
        if (!isWeb) return;

        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });

        return () => subscription?.remove();
    }, []);

    const handleEventPress = (event: EventListItem) => {
        if (event.is_host) {
            router.push(`/event/${event.event_id}/manage`);
        } else {
            router.push(`/event/${event.event_id}`);
        }
    };

    const handleToggleSave = (event: EventListItem, e?: any) => {
        if (e) {
            e.stopPropagation();
        }
        toggleSaveEvent(event);
    };

    const renderCard = ({ item, index }: { item: EventListItem; index: number }) => {
        const gradient = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];

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
                    {/* Like Button */}
                    <TouchableOpacity
                        style={styles.likeButton}
                        onPress={(e) => handleToggleSave(item, e)}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={isSaved(item.event_id) ? 'heart' : 'heart-outline'}
                            size={24}
                            color={isSaved(item.event_id) ? colors.primary : '#ffffff'}
                        />
                    </TouchableOpacity>
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
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    const numColumns = getNumColumns(dimensions.width);

    // Calculate grid container width
    const containerWidth = Math.min(dimensions.width, CONTAINER_MAX_WIDTH);
    const availableWidth = containerWidth - GRID_PADDING * 2;
    const cardWidth = (availableWidth - GRID_GAP_H * (numColumns - 1)) / numColumns;

    const handleScroll = (event: any) => {
        if (!isWeb) return;

        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const paddingToBottom = 20;
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

        if (isCloseToBottom && hasMore && !loadingMore) {
            void loadMore();
        }
    };

    const renderWebGrid = () => (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            onScroll={handleScroll}
            scrollEventThrottle={400}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor={colors.primary}
                />
            }
        >
            {events.length === 0 ? (
                renderEmpty()
            ) : (
                <View style={[styles.gridContainer, { maxWidth: CONTAINER_MAX_WIDTH, alignSelf: 'center', width: '100%' }]}>
                    {events.map((item, index) => (
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
            data={events}
            keyExtractor={(item) => String(item.event_id)}
            renderItem={renderCard}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onEndReached={() => {
                if (hasMore && !loadingMore) {
                    void loadMore();
                }
            }}
            onEndReachedThreshold={0.5}
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

                {/* Search Bar with Filter and Saved */}
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
                            onPress={() => {
                                // TODO: Filter Modal öffnen
                                console.log('Filter öffnen');
                            }}
                        >
                            <Ionicons name="options-outline" size={22} color={colors.onSurface} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.savedButton, { backgroundColor: colors.surfaceContainerHigh }]}
                        onPress={() => {
                            router.push('/saved-events');
                        }}
                    >
                        <Ionicons name="bookmarks-outline" size={22} color={colors.onSurface} />
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
        paddingBottom: 0,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: GRID_PADDING,
    },
    gridItem: {
        // Width and margins are set dynamically
    },
    listContent: {
        paddingTop: 16,
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
    cardWeb: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        width: '100%',
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
        width: 40,
        height: 40,
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
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});
