import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Platform,
    Dimensions,
    RefreshControl,
    LayoutAnimation,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import { SkeletonHostCard, SkeletonTicketCard } from '../components/atoms/SkeletonBox';
import { api } from '../services/api';
import { getSession } from '../services/supabase';
import { EventListItem } from '../types/events';
import QRCode from 'react-native-qrcode-svg';

const CONTAINER_MAX_WIDTH = 900;
const GRID_GAP = 16;

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

function formatCountdown(isoString: string): string | null {
    try {
        const now = Date.now();
        const target = new Date(isoString).getTime();
        if (isNaN(target)) return null;

        const diffMs = target - now;
        if (diffMs <= 0) return null;

        const minutes = Math.floor(diffMs / 60_000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `in ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
        if (hours > 0) return `in ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
        return `in ${minutes} Min`;
    } catch {
        return null;
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
    const isWeb = Platform.OS === 'web';

    const [dimensions, setDimensions] = useState(Dimensions.get('window'));
    const [organizedEvents, setOrganizedEvents] = useState<EventListItem[]>([]);
    const [attendingEvents, setAttendingEvents] = useState<EventListItem[]>([]);
    const [pastEvents, setPastEvents] = useState<EventListItem[]>([]);
    const [ticketMap, setTicketMap] = useState<Record<string, { qr_token: string; count: number }>>({});
    const [organizedLoading, setOrganizedLoading] = useState(true);
    const [attendingLoading, setAttendingLoading] = useState(true);
    const [pastLoading, setPastLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!isWeb) return;
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });
        return () => subscription?.remove();
    }, [isWeb]);

    const numColumns = dimensions.width >= 768 ? 2 : 1;

    const [organizedCollapsed, setOrganizedCollapsed] = useState(false);
    const [attendingCollapsed, setAttendingCollapsed] = useState(false);
    const [pastCollapsed, setPastCollapsed] = useState(true);

    const loadEvents = useCallback(async (isRefresh = false) => {
        setError(null);

        const token = await getSession();
        if (!token) {
            router.replace('/login');
            return;
        }

        if (!isRefresh) {
            setOrganizedLoading(true);
            setAttendingLoading(true);
            setPastLoading(true);
        }

        const animateLayout = () => {
            if (Platform.OS !== 'android') {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
        };

        let failures = 0;

        const organizedP = api.getUserEvents(token, 'upcoming', 100, 0, 'organizer')
            .then(data => { animateLayout(); setOrganizedEvents(data.events); })
            .catch(() => { failures++; })
            .finally(() => setOrganizedLoading(false));

        const attendingP = api.getUserEvents(token, 'upcoming', 100, 0, 'attendee')
            .then(data => { animateLayout(); setAttendingEvents(data.events); })
            .catch(() => { failures++; })
            .finally(() => setAttendingLoading(false));

        const pastP = api.getUserEvents(token, 'past', 100, 0)
            .then(data => { animateLayout(); setPastEvents(data.events); })
            .catch(() => { failures++; })
            .finally(() => setPastLoading(false));

        api.getUserTickets(token).then(ticketData => {
            const map: Record<string, { qr_token: string; count: number }> = {};
            for (const t of ticketData.tickets) {
                if (!map[t.event_id]) {
                    map[t.event_id] = { qr_token: t.qr_token, count: 1 };
                } else {
                    map[t.event_id].count += 1;
                }
            }
            setTicketMap(map);
        }).catch(() => {});

        await Promise.all([organizedP, attendingP, pastP]);
        if (failures === 3) {
            setError('Events konnten nicht geladen werden');
        }
    }, [router]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadEvents(true);
        setRefreshing(false);
    }, [loadEvents]);

    useEffect(() => {
        void loadEvents();
    }, [loadEvents]);


    const displayOrganized = organizedEvents;
    const displayAttending = attendingEvents;

    const renderHostCard = (event: EventListItem, index: number) => {
        const gradient = GRADIENT_PAIRS[index % GRADIENT_PAIRS.length];
        const isPublic = event.is_public;
        const isDeleted = event.is_deleted === true;

        const accepted = (event as any).rsvp_accepted ?? event.participant_count ?? 0;
        const declined = (event as any).rsvp_declined ?? 0;
        const waitlist = (event as any).waitlist_count ?? 0;
        const revenueCents = (event as any).ticket_revenue_cents ?? 0;
        const revenueFormatted = (revenueCents / 100).toLocaleString('de-DE', {
            style: 'currency',
            currency: 'EUR',
        });
        const ticketsSold = event.participant_count ?? 0;
        const capacityText = event.max_capacity
            ? `${isPublic && !event.is_free ? ticketsSold : accepted}/${event.max_capacity}`
            : `${isPublic && !event.is_free ? ticketsSold : accepted}`;

        return (
            <TouchableOpacity
                key={event.event_id}
                style={[styles.hostCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }, isDeleted && { opacity: 0.55 }]}
                onPress={() => router.push(`/event/${event.event_id}/manage`)}
                activeOpacity={0.85}
            >
                <View style={styles.hostCardRow}>
                    <View style={styles.hostCardThumb}>
                        {event.image_url ? (
                            <Image
                                source={{ uri: event.image_url }}
                                style={styles.hostCardThumbImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <LinearGradient
                                colors={gradient as [string, string]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.hostCardThumbImage}
                            />
                        )}
                    </View>

                    <View style={styles.hostCardBody}>
                        <Text style={[styles.hostCardTitle, { color: colors.onSurface }]} numberOfLines={2}>
                            {event.title}
                        </Text>
                    </View>

                    <View style={[
                        styles.hostCardLabel,
                        { backgroundColor: isDeleted ? 'rgba(255,59,48,0.12)' : isPublic ? `${colors.tertiary}18` : `${colors.secondary}18` }
                    ]}>
                        <Text style={[
                            styles.hostCardLabelText,
                            { color: isDeleted ? '#FF3B30' : isPublic ? colors.tertiary : colors.secondary }
                        ]}>
                            {isDeleted ? 'Abgesagt' : isPublic ? 'Öffentlich' : 'Privat'}
                        </Text>
                    </View>
                </View>

                <Text style={[styles.hostCardDate, { color: colors.onSurfaceVariant }]}>
                    {formatEventDate(event.starts_at)}
                    {event.location?.city ? ` · ${event.location.city}` : ''}
                    {formatCountdown(event.starts_at) ? (
                        <Text style={{ color: colors.primary, fontWeight: '600' }}>
                            {` · ${formatCountdown(event.starts_at)}`}
                        </Text>
                    ) : null}
                </Text>

                <View style={[styles.hostCardStats, { borderTopColor: colors.outlineVariant }]}>
                    {isPublic ? (
                        <>
                            <View style={styles.hostCardStatItem}>
                                <Text style={[styles.hostCardStatValue, { color: colors.onSurface }]}>
                                    {capacityText}
                                </Text>
                                <Text style={[styles.hostCardStatLabel, { color: colors.onSurfaceVariant }]}>
                                    {isPublic && !event.is_free ? 'Tickets' : 'Teilnehmer'}
                                </Text>
                            </View>
                            {waitlist > 0 && (
                                <>
                                    <View style={[styles.hostCardStatDivider, { backgroundColor: colors.outlineVariant }]} />
                                    <View style={styles.hostCardStatItem}>
                                        <Text style={[styles.hostCardStatValue, { color: colors.outline }]}>
                                            {waitlist}
                                        </Text>
                                        <Text style={[styles.hostCardStatLabel, { color: colors.onSurfaceVariant }]}>
                                            Warteliste
                                        </Text>
                                    </View>
                                </>
                            )}
                            {!event.is_free && (
                                <>
                                    <View style={[styles.hostCardStatDivider, { backgroundColor: colors.outlineVariant }]} />
                                    <View style={styles.hostCardStatItem}>
                                        <Text style={[styles.hostCardStatValue, { color: colors.primary }]}>
                                            {revenueFormatted}
                                        </Text>
                                        <Text style={[styles.hostCardStatLabel, { color: colors.onSurfaceVariant }]}>
                                            Umsatz
                                        </Text>
                                    </View>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <View style={styles.hostCardStatItem}>
                                <Text style={[styles.hostCardStatValue, { color: '#16a34a' }]}>
                                    {accepted}
                                </Text>
                                <Text style={[styles.hostCardStatLabel, { color: colors.onSurfaceVariant }]}>
                                    Zusagen
                                </Text>
                            </View>
                            <View style={[styles.hostCardStatDivider, { backgroundColor: colors.outlineVariant }]} />
                            <View style={styles.hostCardStatItem}>
                                <Text style={[styles.hostCardStatValue, { color: colors.error }]}>
                                    {declined}
                                </Text>
                                <Text style={[styles.hostCardStatLabel, { color: colors.onSurfaceVariant }]}>
                                    Absagen
                                </Text>
                            </View>
                            <View style={[styles.hostCardStatDivider, { backgroundColor: colors.outlineVariant }]} />
                            <View style={styles.hostCardStatItem}>
                                <Text style={[styles.hostCardStatValue, { color: colors.onSurface }]}>
                                    {event.max_capacity
                                        ? `${accepted}/${event.max_capacity}`
                                        : `${accepted}`}
                                </Text>
                                <Text style={[styles.hostCardStatLabel, { color: colors.onSurfaceVariant }]}>
                                    Teilnehmer
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderTicketCard = (event: EventListItem, showQR: boolean = true) => {
        const isDeleted = event.is_deleted === true;
        return (
            <TouchableOpacity
                key={event.event_id}
                style={[
                    styles.card,
                    { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant },
                    isDeleted && { opacity: 0.55, borderColor: 'rgba(255,59,48,0.3)' },
                ]}
                onPress={() => router.push(showQR ? `/ticket/${event.event_id}` : `/event/${event.event_id}`)}
                activeOpacity={0.85}
            >
                <View style={styles.cardBodyWithQR}>
                    <View style={styles.cardBodyContent}>
                        <Text style={[styles.cardTitle, { color: colors.onSurface }]} numberOfLines={2}>
                            {event.title}
                        </Text>
                        {isDeleted && (
                            <View style={styles.cancelledBadge}>
                                <Text style={styles.cancelledBadgeText}>Abgesagt</Text>
                            </View>
                        )}

                        <Text style={[styles.cardMetaText, { color: colors.onSurfaceVariant }]}>
                            {formatEventDate(event.starts_at)}
                            {event.location?.city ? ` · ${event.location.city}` : ''}
                            {` · ${event.participant_count} Teilnehmer`}
                        </Text>

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

                    {showQR && (
                        <View style={styles.qrContainerSmall}>
                            <QRCode
                                value={ticketMap[event.event_id]?.qr_token || `happin://ticket/${event.event_id}`}
                                size={76}
                                backgroundColor="#FFFFFF"
                            />
                            {ticketMap[event.event_id]?.count > 1 && (
                                <View style={[styles.ticketBadge, { backgroundColor: colors.primary }]}>
                                    <Text style={[styles.ticketBadgeText, { color: colors.onPrimary }]}>
                                        {ticketMap[event.event_id].count}×
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEventCard = (event: EventListItem, index: number) => {
        if (event.is_host) return renderHostCard(event, index);
        return renderTicketCard(event);
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

    // Section
    const containerWidth = Math.min(dimensions.width, CONTAINER_MAX_WIDTH);
    const gridPadding = 24;
    const availableGridWidth = containerWidth - gridPadding * 2;
    const cardWidth = numColumns > 1
        ? (availableGridWidth - GRID_GAP * (numColumns - 1)) / numColumns
        : undefined;

    const renderSection = (
        title: string,
        events: EventListItem[],
        isCollapsed: boolean,
        onToggle: () => void,
        forceTicketStyle: boolean = false,
        sectionLoading: boolean = false,
    ) => (
        <View style={styles.section}>
            {renderSectionHeader(title, events.length, true, isCollapsed, onToggle)}
            {!isCollapsed && (
                sectionLoading && events.length === 0 ? (
                    <View style={[styles.cardGrid, numColumns > 1 && styles.cardGridMultiCol]}>
                        {Array.from({ length: 2 }).map((_, i) => (
                            <View key={i} style={cardWidth != null ? { width: cardWidth } : undefined}>
                                {title === 'Von dir organisiert'
                                    ? <SkeletonHostCard />
                                    : <SkeletonTicketCard />
                                }
                            </View>
                        ))}
                    </View>
                ) : events.length === 0 ? (
                    <View style={styles.emptySection}>
                        <Text style={[styles.emptySectionText, { color: colors.onSurfaceVariant }]}>
                            Noch keine Events in diesem Bereich
                        </Text>
                    </View>
                ) : (
                    <View style={[
                        styles.cardGrid,
                        numColumns > 1 && styles.cardGridMultiCol,
                    ]}>
                        {events.map((event, index) => (
                            <View
                                key={event.event_id}
                                style={cardWidth != null ? { width: cardWidth } : undefined}
                            >
                                {forceTicketStyle
                                    ? renderTicketCard(event, false)
                                    : renderEventCard(event, index)}
                            </View>
                        ))}
                    </View>
                )
            )}
        </View>
    );

    if (error) {
        return (
            <ScreenWithNav>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    {Platform.OS === 'web' && <Navbar showCta={false} />}
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: colors.error }]}>
                            ⚠️ {error}
                        </Text>
                        <TouchableOpacity
                            style={[styles.retryButton, { backgroundColor: colors.primary }]}
                            onPress={() => loadEvents()}
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
            <Head><title>Meine Events – Happin</title></Head>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Navbar showCta={false} />

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[
                        styles.scrollContent,
                        isWeb && styles.scrollContentWeb,
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={colors.primary}
                        />
                    }
                >
                    <View style={[styles.innerContainer, isWeb && { maxWidth: CONTAINER_MAX_WIDTH }]}>
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: colors.onSurface }]}>
                                Deine Events
                            </Text>
                        </View>

                        {displayOrganized.length > 0 && renderSection(
                            'Von dir organisiert',
                            displayOrganized,
                            organizedCollapsed,
                            () => setOrganizedCollapsed(!organizedCollapsed),
                            false,
                            organizedLoading,
                        )}

                        {renderSection(
                            'Deine Tickets',
                            displayAttending,
                            attendingCollapsed,
                            () => setAttendingCollapsed(!attendingCollapsed),
                            false,
                            attendingLoading,
                        )}

                        {(pastEvents.length > 0 || pastLoading) && renderSection(
                            'Vergangene Events',
                            pastEvents,
                            pastCollapsed,
                            () => setPastCollapsed(!pastCollapsed),
                            true,
                            pastLoading,
                        )}
                    </View>
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
    scrollContentWeb: {
        alignItems: 'center',
    },
    innerContainer: {
        width: '100%',
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
    emptySection: {
        marginHorizontal: 24,
        paddingVertical: 24,
        alignItems: 'center',
    },
    emptySectionText: {
        fontSize: 14,
        fontWeight: '400',
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
    // Card Grid
    cardGrid: {
        marginHorizontal: 24,
        gap: 16,
    },
    cardGridMultiCol: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },

    // Host Card (kompakt)
    hostCard: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    hostCardRow: {
        flexDirection: 'row',
        padding: 12,
        gap: 12,
        alignItems: 'center',
    },
    hostCardThumb: {
        width: 56,
        height: 56,
        borderRadius: 12,
        overflow: 'hidden',
    },
    hostCardThumbImage: {
        width: '100%',
        height: '100%',
    },
    hostCardBody: {
        flex: 1,
        gap: 2,
    },
    hostCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 22,
    },
    hostCardLabel: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    hostCardLabelText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    hostCardDate: {
        fontSize: 13,
        fontWeight: '400',
        paddingHorizontal: 12,
        paddingBottom: 8,
    },
    hostCardStats: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    hostCardStatItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    hostCardStatValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    hostCardStatLabel: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    hostCardStatDivider: {
        width: 1,
        alignSelf: 'stretch',
        marginVertical: 2,
    },

    // Ticket Card
    card: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
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
        padding: 4,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
    },
    ticketBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 24,
        alignItems: 'center',
    },
    ticketBadgeText: {
        fontSize: 11,
        fontWeight: '700',
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
    cancelledBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,59,48,0.12)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginTop: 2,
    },
    cancelledBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FF3B30',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
});
