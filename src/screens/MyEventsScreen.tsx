import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import { api } from '../services/api';
import { getSession } from '../services/supabase';
import { EventListItem } from '../types/events';

// Gradient Fallbacks
const GRADIENT_PAIRS = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
];

function formatEventDate(isoString: string): string {
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return 'Datum folgt';

        const day = date.getDate();
        const month = date.toLocaleDateString('de-DE', { month: 'short' });
        const time = date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
        });
        return `${day}. ${month} • ${time}`;
    } catch {
        return 'Datum folgt';
    }
}

/**
 * MyEventsScreen
 *
 * Cards:
 * - Tickets: QR-Code statt Titelbild
 * - Host: Titelbild wie Explore
 */
export default function MyEventsScreen() {
    const { colors } = useTheme();
    const router = useRouter();

    const [upcomingEvents, setUpcomingEvents] = useState<EventListItem[]>([]);
    const [pastEvents, setPastEvents] = useState<EventListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Collapsed State für alle Sections
    const [ticketsCollapsed, setTicketsCollapsed] = useState(false);
    const [hostingCollapsed, setHostingCollapsed] = useState(false);
    const [pastTicketsCollapsed, setPastTicketsCollapsed] = useState(true);
    const [pastHostingCollapsed, setPastHostingCollapsed] = useState(true);

    const loadEvents = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const token = await getSession();
            if (!token) {
                router.replace('/login');
                return;
            }

            const [upcomingData, pastData] = await Promise.all([
                api.getUserEvents(token, 'upcoming', 100, 0),
                api.getUserEvents(token, 'past', 100, 0),
            ]);

            setUpcomingEvents(upcomingData.events);
            setPastEvents(pastData.events);
        } catch (err) {
            console.error('Failed to load events:', err);
            setError('Events konnten nicht geladen werden');
        } finally {
            setLoading(false);
        }
    }, [router]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadEvents();
        setRefreshing(false);
    }, [loadEvents]);

    useEffect(() => {
        void loadEvents();
    }, [loadEvents]);

    const upcomingTickets = upcomingEvents.filter(e => !e.is_host);
    const pastTickets = pastEvents.filter(e => !e.is_host);
    const upcomingHosting = upcomingEvents.filter(e => e.is_host);
    const pastHosting = pastEvents.filter(e => e.is_host);

    // Event Card rendern
    const renderEventCard = (event: EventListItem, index: number, isTicket: boolean) => {
        const gradient = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];

        if (isTicket) {
            // Ticket-Card: Card Body mit QR-Code rechts (kein Titelbild)
            return (
                <View
                    key={event.event_id}
                    style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                >
                    {/* Card Body mit QR-Code rechts */}
                    <View style={styles.cardBodyWithQR}>
                        <TouchableOpacity
                            style={styles.cardBodyContent}
                            onPress={() => router.push(`/event/${event.event_id}`)}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={2}>
                                {event.title}
                            </Text>

                            <View style={styles.cardMeta}>
                                <Text style={[styles.cardMetaText, { color: colors.onSurfaceVariant }]}>
                                    {formatEventDate(event.starts_at)}
                                </Text>
                                {event.location?.city && (
                                    <Text style={[styles.cardMetaText, { color: colors.onSurfaceVariant }]}>
                                        {event.location.city}
                                    </Text>
                                )}
                            </View>

                            {event.category && (
                                <View style={styles.chipContainer}>
                                    {event.category.split(',').slice(0, 2).map((cat, idx) => (
                                        <View key={idx} style={[styles.chip, { backgroundColor: colors.surfaceContainerHigh }]}>
                                            <Text style={[styles.chipText, { color: colors.primary }]}>
                                                {cat.trim()}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* QR-Code rechts */}
                        <TouchableOpacity
                            style={styles.qrContainerSmall}
                            onPress={() => router.push(`/ticket/${event.event_id}`)}
                            activeOpacity={0.85}
                        >
                            <View style={[styles.qrGridSmall, { backgroundColor: '#FFFFFF' }]}>
                                {[...Array(16)].map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.qrPixelSmall,
                                            { backgroundColor: i % 3 !== 0 ? '#000000' : 'transparent' }
                                        ]}
                                    />
                                ))}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Teilnehmer unten rechts */}
                    <View style={styles.cardBottomRight}>
                        <Text style={[styles.attendees, { color: colors.onSurfaceVariant }]}>
                            {event.participant_count} Teilnehmer
                        </Text>
                    </View>
                </View>
            );
        }

        // Host-Card: Eine TouchableOpacity für die ganze Card
        return (
            <TouchableOpacity
                key={event.event_id}
                style={[styles.card, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                onPress={() => router.push(`/event/${event.event_id}/manage`)}
                activeOpacity={0.85}
            >
                {/* Image/QR Container */}
                <View style={styles.imageContainer}>
                    {/* Titelbild für Host-Events */}
                    {event.image_url ? (
                        <Image
                            source={{ uri: event.image_url }}
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
                    <View style={[styles.hostBadge, { backgroundColor: `${colors.secondary}E6` }]}>
                        <Text style={[styles.hostBadgeText, { color: colors.onSecondary }]}>Host</Text>
                    </View>
                </View>

                {/* Card Body */}
                <View style={styles.cardBody}>
                    <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={2}>
                        {event.title}
                    </Text>

                    <View style={styles.cardMeta}>
                        <Text style={[styles.cardMetaText, { color: colors.onSurfaceVariant }]}>
                            {formatEventDate(event.starts_at)}
                        </Text>
                        {event.location?.city && (
                            <Text style={[styles.cardMetaText, { color: colors.onSurfaceVariant }]}>
                                {event.location.city}
                            </Text>
                        )}
                    </View>

                    {event.category && (
                        <View style={styles.chipContainer}>
                            {event.category.split(',').slice(0, 2).map((cat, idx) => (
                                <View key={idx} style={[styles.chip, { backgroundColor: colors.surfaceContainerHigh }]}>
                                    <Text style={[styles.chipText, { color: colors.primary }]}>
                                        {cat.trim()}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Teilnehmer unten rechts */}
                <View style={styles.cardBottomRight}>
                    <Text style={[styles.attendees, { color: colors.onSurfaceVariant }]}>
                        {event.participant_count} Teilnehmer
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Section Header
    const renderSectionHeader = (
        title: string,
        count: number,
        isCollapsible: boolean = false,
        isCollapsed: boolean = false,
        onToggle?: () => void
    ) => (
        <TouchableOpacity
            style={styles.sectionHeader}
            onPress={isCollapsible ? onToggle : undefined}
            activeOpacity={isCollapsible ? 0.7 : 1}
            disabled={!isCollapsible}
        >
            <View style={styles.sectionHeaderLeft}>
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                    {title}
                </Text>
                <View style={styles.sectionBadge}>
                    <Text style={[styles.sectionBadgeText, { color: colors.primary }]}>
                        {count}
                    </Text>
                </View>
            </View>
            {isCollapsible && (
                <View style={{ transform: [{ rotate: isCollapsed ? '0deg' : '90deg' }] }}>
                    <Text style={[styles.chevron, { color: colors.onSurfaceVariant }]}>›</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    // Empty State
    const renderSectionEmpty = (text: string) => (
        <View style={[styles.sectionEmpty, { backgroundColor: colors.surfaceContainerLow }]}>
            <Text style={[styles.sectionEmptyText, { color: colors.onSurfaceVariant }]}>
                {text}
            </Text>
        </View>
    );

    // Section
    const renderSection = (
        title: string,
        count: number,
        events: EventListItem[],
        emptyText: string,
        isTicket: boolean = false,
        isCollapsible: boolean = false,
        isCollapsed: boolean = false,
        onToggle?: () => void
    ) => (
        <View style={styles.section}>
            {renderSectionHeader(title, count, isCollapsible, isCollapsed, onToggle)}
            {!isCollapsed && (
                events.length > 0 ? (
                    <View style={styles.cardGrid}>
                        {events.map((event, index) => renderEventCard(event, index, isTicket))}
                    </View>
                ) : (
                    renderSectionEmpty(emptyText)
                )
            )}
        </View>
    );

    if (loading) {
        return (
            <ScreenWithNav>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <Navbar showCta={false} />
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                </View>
            </ScreenWithNav>
        );
    }

    if (error) {
        return (
            <ScreenWithNav>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <Navbar showCta={false} />
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: colors.error }]}>
                            ⚠️ {error}
                        </Text>
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: colors.primary }]}
                            onPress={loadEvents}
                        >
                            <Text style={[styles.retryText, { color: colors.onPrimary }]}>
                                Erneut versuchen
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScreenWithNav>
        );
    }

    return (
        <ScreenWithNav>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Navbar showCta={false} />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                >
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.onSurface }]}>
                            Deine Events
                        </Text>
                    </View>

                    {renderSection(
                        'Tickets',
                        upcomingTickets.length,
                        upcomingTickets,
                        'Du hast aktuell keine Tickets für Events',
                        true,
                        true,
                        ticketsCollapsed,
                        () => setTicketsCollapsed(!ticketsCollapsed)
                    )}

                    {renderSection(
                        'Events als Host',
                        upcomingHosting.length,
                        upcomingHosting,
                        'Du hostest aktuell keine Events',
                        false,
                        true,
                        hostingCollapsed,
                        () => setHostingCollapsed(!hostingCollapsed)
                    )}

                    {renderSection(
                        'Vergangene Tickets',
                        pastTickets.length,
                        pastTickets,
                        'Du hast noch keine Events besucht',
                        true,
                        true,
                        pastTicketsCollapsed,
                        () => setPastTicketsCollapsed(!pastTicketsCollapsed)
                    )}

                    {renderSection(
                        'Vergangene Events als Host',
                        pastHosting.length,
                        pastHosting,
                        'Keine vergangenen Events',
                        false,
                        true,
                        pastHostingCollapsed,
                        () => setPastHostingCollapsed(!pastHostingCollapsed)
                    )}
                </ScrollView>
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 48,
    },
    header: {
        marginHorizontal: 24,
        marginTop: 24,
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: -0.5,
    },

    // Section
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 24,
        marginBottom: 16,
        paddingVertical: 8,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    sectionBadge: {
        minWidth: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionBadgeText: {
        fontSize: 18,
        fontWeight: '700',
    },
    chevron: {
        fontSize: 24,
        fontWeight: '300',
    },
    sectionEmpty: {
        marginHorizontal: 24,
        paddingVertical: 32,
        paddingHorizontal: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    sectionEmptyText: {
        fontSize: 14,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // Card Grid
    cardGrid: {
        marginHorizontal: 24,
        gap: 16,
    },

    // Card (ähnlich EventListScreen)
    card: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    imageContainer: {
        width: '100%',
        height: 100,
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    qrContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    qrGrid: {
        width: '100%',
        maxWidth: 120,
        aspectRatio: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 3,
    },
    qrPixel: {
        width: '22%',
        height: '22%',
        borderRadius: 2,
    },
    hostBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    hostBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    cardBody: {
        padding: 12,
        gap: 6,
    },
    cardBodyWithQR: {
        flexDirection: 'row',
        padding: 12,
        gap: 12,
        alignItems: 'center',
    },
    cardBodyContent: {
        flex: 1,
        gap: 6,
    },
    cardBottomRight: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        alignItems: 'flex-end',
    },
    qrContainerSmall: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
    },
    qrGridSmall: {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
        padding: 6,
        borderRadius: 8,
    },
    qrPixelSmall: {
        width: '20%',
        height: '20%',
        borderRadius: 1,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 24,
    },
    cardMeta: {
        gap: 4,
    },
    cardMetaText: {
        fontSize: 13,
        fontWeight: '400',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    chipContainer: {
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
        letterSpacing: 0.5,
    },
    attendees: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Loading/Error
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
    },
    errorText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 9999,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    retryText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
