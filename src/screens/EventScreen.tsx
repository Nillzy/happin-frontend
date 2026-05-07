import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    Dimensions,
    Platform,
    Animated,
    Pressable,
    Modal,
    Alert,
    useWindowDimensions,
    Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import EventCategories from '../components/event/EventCategories';
import EventImageGallery from '../components/atoms/EventImageGallery';
import MapView from '../components/MapView';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import { geocodeAddress } from '../services/geocoding';
import type { EventDetailResponse, RsvpStatus } from '../types/events';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_WIDTH * 0.75; // 3:4 aspect ratio

const GRADIENT_FALLBACK = ['#D4006B', '#8B3DC8'];

// Mock-Ticketoptionen als Fallback wenn event.ticket_options leer ist
const MOCK_TICKET_OPTIONS = [
    { name: 'Early Bird', price: 15.00, sort_order: 0, quantity_limit: 50 },
    { name: 'Standard', price: 29.90, sort_order: 1, quantity_limit: 200 },
    { name: 'VIP', price: 59.00, sort_order: 2, quantity_limit: 30, description: 'Eigener Bereich mit Lounge-Zugang, Willkommensdrink & Priority-Einlass' },
    { name: 'Gruppenticket (4 Pers.)', price: 99.00, sort_order: 3, quantity_limit: 20 },
];

const RSVP_OPTIONS: { status: RsvpStatus; icon: string; label: string; sublabel: string }[] = [
    { status: 'Accepted', icon: '✓', label: 'Zusagen', sublabel: 'Ich bin dabei' },
    { status: 'Pending', icon: '~', label: 'Unsicher', sublabel: 'Vielleicht bin ich dabei' },
    { status: 'Declined', icon: '✕', label: 'Absagen', sublabel: 'Ich kann leider nicht' },
];

function formatDateGerman(isoDate: string): string {
    const d = new Date(isoDate);
    return new Intl.DateTimeFormat('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    }).format(d);
}

function DesktopStickyBar({ event, colors, isDark, rsvpStatus, rsvpLoading, onRsvp, onTickets }: {
    event: EventDetailResponse;
    colors: any;
    isDark: boolean;
    rsvpStatus: RsvpStatus | null;
    rsvpLoading: boolean;
    onRsvp: () => void;
    onTickets: () => void;
}) {
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    const bgColor = isDark ? 'rgba(18,19,26,0.85)' : 'rgba(255,255,255,0.85)';

    if (event.is_free) {
        const btnBg = (event.is_public && rsvpStatus === 'Accepted') ? 'transparent' : colors.primary;
        const btnBorder = (event.is_public && rsvpStatus === 'Accepted') ? colors.outline : 'transparent';
        const btnTextColor = (event.is_public && rsvpStatus === 'Accepted') ? colors.onSurface : colors.onPrimary;
        return (
            <View style={[deskBarStyles.bar, { borderTopColor: borderColor, backgroundColor: bgColor }]}>
                <View style={deskBarStyles.info}>
                    <Text style={[deskBarStyles.price, { color: colors.onSurface }]}>Kostenlos</Text>
                    <Text style={[deskBarStyles.hint, { color: colors.onSurfaceVariant }]}>{event.participant_count} Teilnehmer</Text>
                </View>
                <TouchableOpacity
                    style={[deskBarStyles.btn, { backgroundColor: btnBg, borderColor: btnBorder, borderWidth: btnBorder === 'transparent' ? 0 : 1.5 }]}
                    onPress={onRsvp}
                    disabled={rsvpLoading}
                >
                    <Text style={[deskBarStyles.btnText, { color: btnTextColor }]}>
                        {rsvpLoading ? '...' : event.is_public ? (rsvpStatus === 'Accepted' ? 'Absagen' : 'Zusagen') : 'RSVP'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    const tickets = event.ticket_options?.length ? event.ticket_options : MOCK_TICKET_OPTIONS;
    const cheapest = Math.min(...tickets.map(t => t.price));
    return (
        <View style={[deskBarStyles.bar, { borderTopColor: borderColor, backgroundColor: bgColor }]}>
            <View style={deskBarStyles.info}>
                <Text style={[deskBarStyles.price, { color: colors.onSurface }]}>{cheapest === 0 ? 'Kostenlos' : `ab ${cheapest.toFixed(2)} €`}</Text>
                <Text style={[deskBarStyles.hint, { color: colors.onSurfaceVariant }]}>{tickets.length} Ticketoptionen</Text>
            </View>
            <TouchableOpacity style={[deskBarStyles.btn, { backgroundColor: colors.primary }]} onPress={onTickets}>
                <Text style={[deskBarStyles.btnText, { color: colors.onPrimary }]}>Tickets wählen</Text>
            </TouchableOpacity>
        </View>
    );
}

const deskBarStyles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingVertical: 16,
        paddingHorizontal: 4,
        marginTop: 24,
        borderRadius: 12,
    },
    info: { flex: 1, marginRight: 16 },
    price: { fontSize: 18, fontWeight: '800' },
    hint: { fontSize: 13, marginTop: 2 },
    btn: {
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: { fontSize: 15, fontWeight: '700' },
});


export default function EventScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string; eventId?: string }>();
    const id = params.id || params.eventId;
    const { width: windowWidth } = useWindowDimensions();

    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTicketIdx, setSelectedTicketIdx] = useState(0);
    const [ticketCount, setTicketCount] = useState(1);
    const drawerAnim = useRef(new Animated.Value(0)).current;

    const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus | null>(null);
    const [rsvpMenuVisible, setRsvpMenuVisible] = useState(false);
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [sliderIndex, setSliderIndex] = useState(0);

    const openDrawer = () => {
        setDrawerOpen(true);
        Animated.spring(drawerAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 11 }).start();
    };
    const closeDrawer = () => {
        Animated.timing(drawerAnim, { toValue: 0, useNativeDriver: true, duration: 250 }).start(() => {
            setDrawerOpen(false);
            setTicketCount(1);
        });
    };

    useEffect(() => {
        loadEvent();
    }, [id]);

    const loadEvent = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!id) {
                throw new Error('Event-ID fehlt');
            }


            const token = await getSession();
            const data = await api.getEventById(id, token || undefined);
            setEvent(data);
            setRsvpStatus(data.my_rsvp_status ?? null);
            const loc = data.location;
            if (loc) {
                geocodeAddress(
                    loc.house_number ? `${loc.street} ${loc.house_number}` : loc.street,
                    loc.city, loc.postal_code ?? null, loc.country ?? null,
                ).then((c) => { if (c) setMapCoords(c); });
            }
        } catch (e) {
            console.error('[EventScreen] Load error:', e);
            setError(e instanceof Error ? e.message : 'Event konnte nicht geladen werden');
        } finally {
            setLoading(false);
        }
    };

    const handleRsvp = async (newStatus: RsvpStatus) => {
        if (!event) return;
        const token = await getSession();
        if (!token) {
            router.navigate('/login');
            return;
        }
        setRsvpLoading(true);
        try {
            await api.rsvpEvent(event.event_id, newStatus, token);
            const prevStatus = rsvpStatus;
            setRsvpStatus(newStatus);
            if (newStatus === 'Accepted' && prevStatus !== 'Accepted') {
                setEvent({ ...event, participant_count: event.participant_count + 1 });
            } else if (newStatus !== 'Accepted' && prevStatus === 'Accepted') {
                setEvent({ ...event, participant_count: Math.max(0, event.participant_count - 1) });
            }
        } catch (err: unknown) {
            let msg = 'RSVP konnte nicht gespeichert werden.';
            if (err instanceof Error) {
                const match = err.message.match(/\{.*\}/);
                if (match) {
                    try { msg = JSON.parse(match[0]).detail ?? msg; } catch { /* ignore */ }
                }
            }
            Alert.alert('Fehler', msg);
        } finally {
            setRsvpLoading(false);
        }
    };

    const handleStickyBarPress = () => {
        if (!event) return;
        if (event.is_free) {
            if (event.is_public) {
                handleRsvp(rsvpStatus === 'Accepted' ? 'Declined' : 'Accepted');
            } else {
                setRsvpMenuVisible(true);
            }
        } else {
            openDrawer();
        }
    };

    const handleContact = () => {
        // TODO: Contact host
        console.log('Contact host');
    };

    const handleShare = async () => {
        const link = `https://happin.fun/event/${id}`;
        try {
            await Share.share({
                message: link,
            });
        } catch {
            // User cancelled share dialog
        }
    };

    if (loading) {
        return (
            <ScreenWithNav showBottomNav={false}>
                <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </ScreenWithNav>
        );
    }

    if (error || !event) {
        return (
            <ScreenWithNav showBottomNav={false}>
                <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error || 'Event nicht gefunden'}</Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.primary }]}
                        onPress={loadEvent}
                    >
                        <Text style={[styles.retryText, { color: colors.onPrimary }]}>Erneut versuchen</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWithNav>
        );
    }

    const hostInitial = event.host_name?.charAt(0).toUpperCase() || 'H';
    const categories = event.category ? event.category.split(',').map(c => c.trim()) : [];

    const isWeb = Platform.OS === 'web';
    const isDesktop = isWeb && windowWidth >= 900;

    // Slider images: hero first, then gallery
    const sliderImages: string[] = [];
    if (event.image_url) sliderImages.push(event.image_url);
    (event.media_urls ?? []).forEach((u) => { if (u !== event.image_url) sliderImages.push(u); });
    const sliderCount = sliderImages.length;
    const glassCard = [
        styles.glassCard,
        isWeb
            ? { backgroundColor: isDark ? 'rgba(18,19,26,0.55)' : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as any
            : { backgroundColor: isDark ? 'rgba(18,19,26,0.85)' : 'rgba(255,255,255,0.85)' },
    ];
    const glassActionBtn = [
        styles.actionButton,
        {
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
        },
        isWeb
            ? { backgroundColor: isDark ? 'rgba(30,31,38,0.6)' : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any
            : { backgroundColor: isDark ? 'rgba(30,31,38,0.85)' : 'rgba(255,255,255,0.85)' },
    ];

    return (
        <ScreenWithNav showBottomNav={false}>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                {/* Blurred background image */}
                {event.image_url ? (
                    <Image
                        source={{ uri: event.image_url }}
                        style={[styles.bgImage, isWeb ? { filter: 'blur(60px) saturate(1.8) brightness(0.7)' } as any : {}]}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient
                        colors={GRADIENT_FALLBACK as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bgImage}
                    />
                )}
                <View style={[styles.bgOverlay, { backgroundColor: isDark ? 'rgba(12,13,20,0.35)' : 'rgba(248,249,250,0.25)' }]} />

                {isDesktop ? (
                    /* ── Desktop: split layout ── */
                    <View style={styles.desktopLayout}>
                        {/* Left pane: image slider */}
                        <View style={styles.desktopLeft}>
                            {/* Back button */}
                            <TouchableOpacity
                                style={[styles.backButton, { backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } as any]}
                                onPress={() => router.canGoBack() ? router.back() : router.push('/events')}
                            >
                                <Ionicons name="arrow-back" size={24} color="#ffffff" />
                            </TouchableOpacity>

                            {/* Current image */}
                            {sliderImages.length > 0 ? (
                                <Image
                                    source={{ uri: sliderImages[sliderIndex] }}
                                    style={styles.desktopSliderImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <LinearGradient
                                    colors={GRADIENT_FALLBACK as [string, string]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={styles.desktopSliderImage}
                                />
                            )}

                            {/* Prev / Next arrows */}
                            {sliderCount > 1 && (
                                <>
                                    <TouchableOpacity
                                        style={[styles.sliderArrow, styles.sliderArrowLeft]}
                                        onPress={() => setSliderIndex((sliderIndex - 1 + sliderCount) % sliderCount)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="chevron-back" size={22} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.sliderArrow, styles.sliderArrowRight]}
                                        onPress={() => setSliderIndex((sliderIndex + 1) % sliderCount)}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="chevron-forward" size={22} color="#fff" />
                                    </TouchableOpacity>
                                </>
                            )}

                            {/* Dot indicators */}
                            {sliderCount > 1 && (
                                <View style={styles.sliderDots}>
                                    {sliderImages.map((_, i) => (
                                        <TouchableOpacity key={i} onPress={() => setSliderIndex(i)} activeOpacity={0.7}>
                                            <View style={[
                                                styles.sliderDot,
                                                i === sliderIndex
                                                    ? { backgroundColor: '#fff', width: 20 }
                                                    : { backgroundColor: 'rgba(255,255,255,0.45)', width: 8 },
                                            ]} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Title overlay at bottom of left pane */}
                            <View style={styles.desktopTitleOverlay}>
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                                    style={styles.desktopTitleGradient}
                                >
                                    <Text style={styles.heroTitle}>{event.title}</Text>
                                    <Text style={styles.heroDate}>{formatDateGerman(event.starts_at)}</Text>
                                </LinearGradient>
                            </View>
                        </View>

                        {/* Right pane: scrollable content */}
                        <ScrollView
                            style={styles.desktopRight}
                            contentContainerStyle={styles.desktopRightContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Host Card */}
                            <View style={[...glassCard, styles.hostCard]}>
                                <View style={styles.hostInfo}>
                                    <View style={[styles.hostAvatar, { backgroundColor: colors.primary }]}>
                                        <Text style={[styles.hostAvatarText, { color: colors.onPrimary }]}>{hostInitial}</Text>
                                    </View>
                                    <View style={styles.hostTextContainer}>
                                        <Text style={[styles.hostName, { color: colors.onSurface }]}>{event.host_name || 'Host'}</Text>
                                        <Text style={[styles.hostSubtitle, { color: colors.onSurfaceVariant }]}>invited you</Text>
                                    </View>
                                </View>
                                <TouchableOpacity>
                                    <Ionicons name="ellipsis-horizontal" size={24} color={colors.onSurfaceVariant} />
                                </TouchableOpacity>
                            </View>

                            {/* Action Buttons */}
                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[glassActionBtn, rsvpStatus !== 'Accepted' && { opacity: 0.4, backgroundColor: isDark ? 'rgba(80,80,80,0.6)' : 'rgba(200,200,200,0.7)' }]}
                                    onPress={rsvpStatus === 'Accepted' ? () => router.push(`/ticket/${id}`) : undefined}
                                    disabled={rsvpStatus !== 'Accepted'}
                                >
                                    <Ionicons name="qr-code-outline" size={24} color={rsvpStatus === 'Accepted' ? colors.onSurface : colors.onSurfaceVariant} />
                                    <Text style={[styles.actionButtonText, { color: rsvpStatus === 'Accepted' ? colors.onSurface : colors.onSurfaceVariant }]}>QR-Code</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={glassActionBtn} onPress={handleContact}>
                                    <Ionicons name="mail-outline" size={24} color={colors.onSurface} />
                                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Contact</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={glassActionBtn} onPress={handleShare}>
                                    <Ionicons name="share-outline" size={24} color={colors.onSurface} />
                                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Share</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={glassActionBtn}>
                                    <Ionicons name="ellipsis-horizontal" size={24} color={colors.onSurface} />
                                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>More</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Categories */}
                            {categories.length > 0 && (
                                <View style={styles.section}>
                                    <EventCategories categories={categories} editMode={false} />
                                </View>
                            )}

                            {/* About */}
                            {event.description && (
                                <View style={[...glassCard, styles.section, { padding: 20 }]}>
                                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>About Event</Text>
                                    <Text style={[styles.description, { color: colors.onSurface }]}>{event.description}</Text>
                                </View>
                            )}

                            {/* Location */}
                            {event.location && (
                                <View style={styles.section}>
                                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Location</Text>
                                    <View style={[...glassCard, styles.locationCard]}>
                                        <View style={styles.locationHeader}>
                                            <View style={styles.locationTextContainer}>
                                                <Text style={[styles.locationAddress, { color: colors.onSurface }]}>
                                                    {event.location.street && event.location.house_number
                                                        ? `${event.location.street} ${event.location.house_number}`
                                                        : event.location.city || 'Adresse nicht verfügbar'}
                                                </Text>
                                                <Text style={[styles.locationCity, { color: colors.onSurfaceVariant }]}>
                                                    {event.location.city && event.location.country
                                                        ? `${event.location.city}, ${event.location.country}`
                                                        : event.location.city || ''}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.mapPreview}>
                                            {mapCoords ? (
                                                <MapView
                                                    markers={[{ lat: mapCoords.lat, lng: mapCoords.lng, title: event.location?.city ?? '', eventId: '__preview__' }]}
                                                    centerLat={mapCoords.lat}
                                                    centerLng={mapCoords.lng}
                                                    zoom={15}
                                                    isDark={isDark}
                                                    showPopups={false}
                                                    interactive={false}
                                                />
                                            ) : (
                                                <View style={[styles.mapPreview, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' }]}>
                                                    <Ionicons name="map-outline" size={48} color={colors.onSurfaceVariant} />
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Host */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Host</Text>
                                    <TouchableOpacity onPress={handleContact}>
                                        <Text style={[styles.contactLink, { color: colors.primary }]}>Contact</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.hostRow}>
                                    <View style={[styles.hostAvatar, { backgroundColor: colors.primary }]}>
                                        <Text style={[styles.hostAvatarText, { color: colors.onPrimary }]}>{hostInitial}</Text>
                                    </View>
                                    <Text style={[styles.hostNameLarge, { color: colors.onSurface }]}>{event.host_name || 'Host'}</Text>
                                </View>
                            </View>

                            {/* Desktop sticky bar inline at bottom of scroll */}
                            <DesktopStickyBar
                                event={event}
                                colors={colors}
                                isDark={isDark}
                                rsvpStatus={rsvpStatus}
                                rsvpLoading={rsvpLoading}
                                onRsvp={handleStickyBarPress}
                                onTickets={openDrawer}
                            />

                            <View style={{ height: 32 }} />
                        </ScrollView>
                    </View>
                ) : (
                    /* ── Mobile: original layout ── */
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Hero Image with Title Overlay */}
                        <View style={styles.heroContainer}>
                            {event.image_url ? (
                                <Image source={{ uri: event.image_url }} style={styles.heroImage} resizeMode="cover" />
                            ) : (
                                <LinearGradient colors={GRADIENT_FALLBACK as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroImage} />
                            )}

                            <TouchableOpacity
                                style={[styles.backButton, { backgroundColor: colors.surfaceContainerHigh }]}
                                onPress={() => router.canGoBack() ? router.back() : router.push('/events')}
                            >
                                <Ionicons name="arrow-back" size={24} color="#ffffff" />
                            </TouchableOpacity>

                            <View style={styles.titleOverlay}>
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.titleGradient}>
                                    <Text style={styles.heroTitle}>{event.title}</Text>
                                    <Text style={styles.heroDate}>{formatDateGerman(event.starts_at)}</Text>
                                </LinearGradient>
                            </View>
                        </View>

                        <View style={styles.content}>
                            <View style={[...glassCard, styles.hostCard]}>
                                <View style={styles.hostInfo}>
                                    <View style={[styles.hostAvatar, { backgroundColor: colors.primary }]}>
                                        <Text style={[styles.hostAvatarText, { color: colors.onPrimary }]}>{hostInitial}</Text>
                                    </View>
                                    <View style={styles.hostTextContainer}>
                                        <Text style={[styles.hostName, { color: colors.onSurface }]}>{event.host_name || 'Host'}</Text>
                                        <Text style={[styles.hostSubtitle, { color: colors.onSurfaceVariant }]}>invited you</Text>
                                    </View>
                                </View>
                                <TouchableOpacity>
                                    <Ionicons name="ellipsis-horizontal" size={24} color={colors.onSurfaceVariant} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[glassActionBtn, rsvpStatus !== 'Accepted' && { opacity: 0.4, backgroundColor: isDark ? 'rgba(80,80,80,0.6)' : 'rgba(200,200,200,0.7)' }]}
                                    onPress={rsvpStatus === 'Accepted' ? () => router.push(`/ticket/${id}`) : undefined}
                                    disabled={rsvpStatus !== 'Accepted'}
                                >
                                    <Ionicons name="qr-code-outline" size={24} color={rsvpStatus === 'Accepted' ? colors.onSurface : colors.onSurfaceVariant} />
                                    <Text style={[styles.actionButtonText, { color: rsvpStatus === 'Accepted' ? colors.onSurface : colors.onSurfaceVariant }]}>QR-Code</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={glassActionBtn} onPress={handleContact}>
                                    <Ionicons name="mail-outline" size={24} color={colors.onSurface} />
                                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Contact</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={glassActionBtn} onPress={handleShare}>
                                    <Ionicons name="share-outline" size={24} color={colors.onSurface} />
                                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Share</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={glassActionBtn}>
                                    <Ionicons name="ellipsis-horizontal" size={24} color={colors.onSurface} />
                                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>More</Text>
                                </TouchableOpacity>
                            </View>

                            {categories.length > 0 && (
                                <View style={styles.section}>
                                    <EventCategories categories={categories} editMode={false} />
                                </View>
                            )}

                            {event.description && (
                                <View style={[...glassCard, styles.section, { padding: 20 }]}>
                                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>About Event</Text>
                                    <Text style={[styles.description, { color: colors.onSurface }]}>{event.description}</Text>
                                </View>
                            )}

                            {event.location && (
                                <View style={styles.section}>
                                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Location</Text>
                                    <View style={[...glassCard, styles.locationCard]}>
                                        <View style={styles.locationHeader}>
                                            <View style={styles.locationTextContainer}>
                                                <Text style={[styles.locationAddress, { color: colors.onSurface }]}>
                                                    {event.location.street && event.location.house_number
                                                        ? `${event.location.street} ${event.location.house_number}`
                                                        : event.location.city || 'Adresse nicht verfügbar'}
                                                </Text>
                                                <Text style={[styles.locationCity, { color: colors.onSurfaceVariant }]}>
                                                    {event.location.city && event.location.country
                                                        ? `${event.location.city}, ${event.location.country}`
                                                        : event.location.city || ''}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.mapPreview}>
                                            {mapCoords ? (
                                                <MapView
                                                    markers={[{ lat: mapCoords.lat, lng: mapCoords.lng, title: event.location?.city ?? '', eventId: '__preview__' }]}
                                                    centerLat={mapCoords.lat}
                                                    centerLng={mapCoords.lng}
                                                    zoom={15}
                                                    isDark={isDark}
                                                    showPopups={false}
                                                    interactive={false}
                                                />
                                            ) : (
                                                <View style={[styles.mapPreview, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' }]}>
                                                    <Ionicons name="map-outline" size={48} color={colors.onSurfaceVariant} />
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            )}

                            {event.media_urls && event.media_urls.length > 0 && (
                                <View style={styles.section}>
                                    <EventImageGallery images={event.media_urls} />
                                </View>
                            )}

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Host</Text>
                                    <TouchableOpacity onPress={handleContact}>
                                        <Text style={[styles.contactLink, { color: colors.primary }]}>Contact</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.hostRow}>
                                    <View style={[styles.hostAvatar, { backgroundColor: colors.primary }]}>
                                        <Text style={[styles.hostAvatarText, { color: colors.onPrimary }]}>{hostInitial}</Text>
                                    </View>
                                    <Text style={[styles.hostNameLarge, { color: colors.onSurface }]}>{event.host_name || 'Host'}</Text>
                                </View>
                            </View>

                            <View style={{ height: 100 }} />
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* Sticky Bottom Bar — mobile only */}
            {!isDesktop && (() => {
                if (event.is_free) {
                    const statusHint = rsvpStatus === 'Accepted' ? 'Du hast zugesagt'
                        : rsvpStatus === 'Declined' ? 'Du hast abgesagt'
                        : rsvpStatus === 'Pending' ? 'Noch unsicher'
                        : `${event.participant_count} Teilnehmer`;
                    const btnLabel = rsvpLoading ? '...'
                        : event.is_public
                            ? (rsvpStatus === 'Accepted' ? 'Absagen' : 'Zusagen')
                            : 'RSVP';
                    const btnBg = (event.is_public && rsvpStatus === 'Accepted')
                        ? 'transparent'
                        : colors.primary;
                    const btnBorder = (event.is_public && rsvpStatus === 'Accepted')
                        ? colors.outline
                        : 'transparent';
                    const btnTextColor = (event.is_public && rsvpStatus === 'Accepted')
                        ? colors.onSurface
                        : colors.onPrimary;
                    return (
                        <View style={[
                            styles.stickyBar,
                            { borderTopColor: colors.outlineVariant },
                            isWeb
                                ? { backgroundColor: isDark ? 'rgba(18,19,26,0.85)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as any
                                : { backgroundColor: colors.surface },
                        ]}>
                            <View style={styles.stickyBarInfo}>
                                <Text style={[styles.stickyBarPrice, { color: colors.onSurface }]}>
                                    Kostenlos
                                </Text>
                                <Text style={[styles.stickyBarHint, { color: colors.onSurfaceVariant }]}>
                                    {statusHint}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.stickyBarButton, { backgroundColor: btnBg, borderColor: btnBorder, borderWidth: btnBorder === 'transparent' ? 0 : 1.5 }]}
                                onPress={handleStickyBarPress}
                                disabled={rsvpLoading}
                            >
                                <Text style={[styles.stickyBarButtonText, { color: btnTextColor }]}>
                                    {btnLabel}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                }

                const tickets = event.ticket_options?.length ? event.ticket_options : MOCK_TICKET_OPTIONS;
                const cheapest = Math.min(...tickets.map(t => t.price));
                return (
                    <View style={[
                        styles.stickyBar,
                        { borderTopColor: colors.outlineVariant },
                        isWeb
                            ? { backgroundColor: isDark ? 'rgba(18,19,26,0.85)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as any
                            : { backgroundColor: colors.surface },
                    ]}>
                        <View style={styles.stickyBarInfo}>
                            <Text style={[styles.stickyBarPrice, { color: colors.onSurface }]}>
                                {cheapest === 0 ? 'Kostenlos' : `ab ${cheapest.toFixed(2)} €`}
                            </Text>
                            <Text style={[styles.stickyBarHint, { color: colors.onSurfaceVariant }]}>
                                {tickets.length} Ticketoptionen
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.stickyBarButton, { backgroundColor: colors.primary }]}
                            onPress={openDrawer}
                        >
                            <Text style={[styles.stickyBarButtonText, { color: colors.onPrimary }]}>
                                Tickets wählen
                            </Text>
                        </TouchableOpacity>
                    </View>
                );
            })()}

            {/* Ticket-Drawer Bottom Sheet */}
            {drawerOpen && event && (() => {
                const tickets = event.ticket_options?.length
                    ? event.ticket_options
                    : MOCK_TICKET_OPTIONS;
                const selected = tickets[selectedTicketIdx];
                const total = (selected?.price ?? 0) * ticketCount;

                const drawerTranslateY = drawerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                });

                return (
                    <>
                        {/* Backdrop */}
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={closeDrawer}
                        >
                            <Animated.View style={[
                                StyleSheet.absoluteFill,
                                { backgroundColor: 'rgba(0,0,0,0.5)', opacity: drawerAnim },
                            ]} />
                        </Pressable>

                        {/* Drawer */}
                        <Animated.View style={[
                            styles.drawer,
                            {
                                backgroundColor: colors.surface,
                                transform: [{ translateY: drawerTranslateY }],
                            },
                            isWeb
                                ? { backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', backgroundColor: isDark ? 'rgba(24,25,32,0.92)' : 'rgba(255,255,255,0.92)' } as any
                                : {},
                        ]}>
                            {/* Drag Handle */}
                            <View style={styles.drawerHandle}>
                                <View style={[styles.drawerHandleBar, { backgroundColor: colors.outlineVariant }]} />
                            </View>

                            {/* Header */}
                            <View style={styles.drawerHeader}>
                                <Text style={[styles.drawerTitle, { color: colors.onSurface }]}>
                                    Tickets wählen
                                </Text>
                                <TouchableOpacity onPress={closeDrawer} hitSlop={12}>
                                    <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
                                </TouchableOpacity>
                            </View>

                            {/* Ticket Options */}
                            <ScrollView style={styles.ticketList} showsVerticalScrollIndicator={false}>
                                {tickets.map((ticket, idx) => {
                                    const isSelected = idx === selectedTicketIdx;
                                    const isSoldOut = ticket.quantity_limit === 0;
                                    return (
                                        <TouchableOpacity
                                            key={idx}
                                            activeOpacity={isSoldOut ? 1 : 0.7}
                                            onPress={() => !isSoldOut && setSelectedTicketIdx(idx)}
                                            style={[
                                                styles.ticketOption,
                                                {
                                                    borderColor: isSelected ? colors.primary : colors.outlineVariant,
                                                    borderWidth: isSelected ? 2 : 1,
                                                    backgroundColor: isSoldOut
                                                        ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                                                        : isSelected
                                                            ? (isDark ? 'rgba(187,134,252,0.08)' : 'rgba(103,80,164,0.06)')
                                                            : 'transparent',
                                                    opacity: isSoldOut ? 0.5 : 1,
                                                },
                                            ]}
                                        >
                                            {/* Radio Circle */}
                                            <View style={[
                                                styles.ticketRadio,
                                                {
                                                    borderColor: isSelected ? colors.primary : colors.outlineVariant,
                                                    borderWidth: isSelected ? 2 : 1.5,
                                                },
                                            ]}>
                                                {isSelected && (
                                                    <View style={[styles.ticketRadioDot, { backgroundColor: colors.primary }]} />
                                                )}
                                            </View>

                                            {/* Ticket Info */}
                                            <View style={styles.ticketInfo}>
                                                <Text style={[styles.ticketName, { color: isSoldOut ? colors.onSurfaceVariant : colors.onSurface }]}>
                                                    {ticket.name}
                                                </Text>
                                                {(ticket as any).description && (
                                                    <Text
                                                        style={[styles.ticketDescription, { color: colors.onSurfaceVariant }]}
                                                        numberOfLines={isSelected ? undefined : 1}
                                                    >
                                                        {(ticket as any).description}
                                                    </Text>
                                                )}
                                                {isSoldOut ? (
                                                    <Text style={[styles.ticketMeta, { color: colors.error }]}>Ausverkauft</Text>
                                                ) : (
                                                    ticket.quantity_limit != null && (
                                                        <Text style={[styles.ticketMeta, { color: colors.onSurfaceVariant }]}>
                                                            {ticket.quantity_limit} verfügbar
                                                        </Text>
                                                    )
                                                )}
                                            </View>

                                            {/* Price */}
                                            <Text style={[styles.ticketPrice, { color: isSoldOut ? colors.onSurfaceVariant : colors.onSurface }]}>
                                                {ticket.price === 0 ? 'Kostenlos' : `${ticket.price.toFixed(2)} €`}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* Quantity Selector */}
                            <View style={[styles.quantityRow, { borderTopColor: colors.outlineVariant }]}>
                                <Text style={[styles.quantityLabel, { color: colors.onSurface }]}>Anzahl</Text>
                                <View style={styles.quantityStepper}>
                                    <TouchableOpacity
                                        style={[styles.stepperBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                        onPress={() => setTicketCount(c => Math.max(1, c - 1))}
                                    >
                                        <Ionicons name="remove" size={20} color={colors.onSurface} />
                                    </TouchableOpacity>
                                    <Text style={[styles.quantityValue, { color: colors.onSurface }]}>{ticketCount}</Text>
                                    <TouchableOpacity
                                        style={[styles.stepperBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                                        onPress={() => setTicketCount(c => Math.min(10, c + 1))}
                                    >
                                        <Ionicons name="add" size={20} color={colors.onSurface} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Summary + Checkout Button */}
                            <View style={styles.checkoutSection}>
                                <View style={styles.checkoutSummary}>
                                    <Text style={[styles.checkoutTotal, { color: colors.onSurfaceVariant }]}>
                                        {ticketCount}× {selected?.name}
                                    </Text>
                                    <Text style={[styles.checkoutPrice, { color: colors.onSurface }]}>
                                        {total === 0 ? 'Kostenlos' : `${total.toFixed(2)} €`}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[styles.checkoutButton, { backgroundColor: colors.primary }]}
                                    onPress={() => {
                                        // TODO: Checkout-Logik implementieren
                                        console.log('Checkout:', { ticket: selected?.name, count: ticketCount, total });
                                        closeDrawer();
                                    }}
                                >
                                    <Ionicons name="cart-outline" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.checkoutButtonText, { color: colors.onPrimary }]}>
                                        {total === 0 ? 'Kostenlos buchen' : 'Zur Kasse'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </>
                );
            })()}

            {/* RSVP Modal (for free private events) */}
            <Modal
                visible={rsvpMenuVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setRsvpMenuVisible(false)}
            >
                <Pressable style={rsvpStyles.backdrop} onPress={() => setRsvpMenuVisible(false)} />
                <View style={[rsvpStyles.sheet, { backgroundColor: colors.surfaceContainerLow }]}>
                    <View style={[rsvpStyles.handle, { backgroundColor: colors.outlineVariant }]} />
                    <Text style={[rsvpStyles.title, { color: colors.onSurface }]}>Teilnahme</Text>

                    {RSVP_OPTIONS.map((opt, idx) => {
                        const isActive = rsvpStatus === opt.status;
                        return (
                            <React.Fragment key={opt.status}>
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        handleRsvp(opt.status);
                                        setRsvpMenuVisible(false);
                                    }}
                                    style={[
                                        rsvpStyles.optionRow,
                                        {
                                            backgroundColor: isActive ? `${colors.primary}14` : 'transparent',
                                            borderColor: isActive ? `${colors.primary}28` : 'transparent',
                                        },
                                    ]}
                                >
                                    <View style={[
                                        rsvpStyles.iconBadge,
                                        { backgroundColor: isActive ? `${colors.primary}22` : colors.surfaceContainer },
                                    ]}>
                                        <Text style={[rsvpStyles.iconText, { color: isActive ? colors.primary : colors.onSurfaceVariant }]}>
                                            {opt.icon}
                                        </Text>
                                    </View>
                                    <View style={rsvpStyles.optionText}>
                                        <Text style={[rsvpStyles.optionLabel, { color: colors.onSurface }]}>{opt.label}</Text>
                                        <Text style={[rsvpStyles.optionSublabel, { color: colors.onSurfaceVariant }]}>{opt.sublabel}</Text>
                                    </View>
                                    {isActive && (
                                        <Text style={[rsvpStyles.checkmark, { color: colors.primary }]}>✓</Text>
                                    )}
                                </TouchableOpacity>
                                {idx < RSVP_OPTIONS.length - 1 && (
                                    <View style={[rsvpStyles.separator, { backgroundColor: colors.outlineVariant }]} />
                                )}
                            </React.Fragment>
                        );
                    })}

                    <View style={rsvpStyles.bottomSpacer} />
                </View>
            </Modal>

        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },

    // ── Desktop split layout ──────────────────────────────────────────────────
    desktopLayout: {
        flex: 1,
        flexDirection: 'row',
    },
    desktopLeft: {
        width: '40%',
        position: 'relative',
        overflow: 'hidden',
    },
    desktopSliderImage: {
        width: '100%',
        height: '100%',
    },
    sliderArrow: {
        position: 'absolute',
        top: '50%',
        marginTop: -22,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    sliderArrowLeft: {
        left: 14,
    },
    sliderArrowRight: {
        right: 14,
    },
    sliderDots: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        zIndex: 10,
    },
    sliderDot: {
        height: 8,
        borderRadius: 4,
    },
    desktopTitleOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 160,
    },
    desktopTitleGradient: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 28,
        paddingBottom: 28,
    },
    desktopRight: {
        flex: 1,
    },
    desktopRightContent: {
        paddingHorizontal: 32,
        paddingTop: 28,
        paddingBottom: 0,
    },
    bgImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    bgOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    glassCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        overflow: 'hidden',
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
        borderRadius: 12,
        minHeight: 48,
    },
    retryText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Hero Section
    heroContainer: {
        position: 'relative',
        height: HERO_HEIGHT,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 16,
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    titleOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    titleGradient: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    heroTitle: {
        fontSize: 32, // h2 from DESIGN.md
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    heroDate: {
        fontSize: 16, // body-md from DESIGN.md
        color: 'rgba(255,255,255,0.9)',
    },

    // Content
    content: {
        paddingHorizontal: 24, // grid_margin from DESIGN.md
        paddingTop: 24,
    },

    hostCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        marginBottom: 16,
    },
    hostInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hostAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    hostAvatarText: {
        fontSize: 20,
        fontWeight: '700',
    },
    hostTextContainer: {
        justifyContent: 'center',
    },
    hostName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    hostSubtitle: {
        fontSize: 14,
    },

    // Action Buttons Row (Luma-style)
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 32,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12, // card_radius from DESIGN.md
        gap: 4,
        minHeight: 72,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Sections
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    contactLink: {
        fontSize: 14,
        fontWeight: '600',
    },

    locationCard: {
        padding: 16,
    },
    locationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    locationTextContainer: {
        flex: 1,
    },
    locationAddress: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    locationCity: {
        fontSize: 14,
    },
    weatherContainer: {
        display: 'none',
    },
    weatherText: {
        display: 'none',
    },
    mapPreview: {
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
    },

    // Host Row
    hostRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    hostNameLarge: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 12,
    },

    // Description
    description: {
        fontSize: 15, // body-md from DESIGN.md
        lineHeight: 24,
    },

    // Sticky Bottom Bar
    stickyBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 32 : 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    stickyBarInfo: {
        flex: 1,
        marginRight: 16,
    },
    stickyBarPrice: {
        fontSize: 18,
        fontWeight: '800',
    },
    stickyBarHint: {
        fontSize: 13,
        marginTop: 2,
    },
    stickyBarButton: {
        paddingHorizontal: 28,
        paddingVertical: 18,
        borderRadius: 14,
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stickyBarButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },

    // Ticket Drawer (Bottom Sheet)
    drawer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 24,
    },
    drawerHandle: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    drawerHandleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    drawerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    drawerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    ticketList: {
        paddingHorizontal: 24,
        maxHeight: 280,
    },
    ticketOption: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
    },
    ticketRadio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    ticketRadioDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    ticketInfo: {
        flex: 1,
    },
    ticketName: {
        fontSize: 16,
        fontWeight: '600',
    },
    ticketDescription: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 3,
    },
    ticketMeta: {
        fontSize: 13,
        marginTop: 2,
    },
    ticketPrice: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 12,
    },
    quantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    quantityLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    quantityStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    stepperBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityValue: {
        fontSize: 18,
        fontWeight: '700',
        minWidth: 24,
        textAlign: 'center',
    },
    checkoutSection: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    checkoutSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    checkoutTotal: {
        fontSize: 14,
    },
    checkoutPrice: {
        fontSize: 20,
        fontWeight: '800',
    },
    checkoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        minHeight: 56,
    },
    checkoutButtonText: {
        fontSize: 17,
        fontWeight: '700',
    },
});

const rsvpStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 0,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderWidth: 1,
        gap: 14,
    },
    iconBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconText: {
        fontSize: 17,
        fontWeight: '700',
    },
    optionText: { flex: 1, gap: 2 },
    optionLabel: { fontSize: 15, fontWeight: '700' },
    optionSublabel: { fontSize: 12 },
    checkmark: { fontSize: 16, fontWeight: '800' },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 20,
        opacity: 0.4,
    },
    bottomSpacer: {
        height: Platform.OS === 'ios' ? 34 : 20,
    },
});
