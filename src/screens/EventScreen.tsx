import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Linking,
    PanResponder,
    TextInput,
    KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Calendar from 'expo-calendar';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import EventCategories from '../components/event/EventCategories';
import EventImageGallery from '../components/atoms/EventImageGallery';
import MapView from '../components/MapView';
import { getSession, getUserProfile } from '../services/supabase';
import { api, invalidateTicketsCache } from '../services/api';
import { geocodeAddress } from '../services/geocoding';
import { getGradientByIndex } from '../constants/gradients';
import type { EventDetailResponse, RsvpStatus, CustomFieldResponseItem } from '../types/events';
import CustomFieldForm from '../components/atoms/CustomFieldForm';
import { SkeletonBox } from '../components/atoms/SkeletonBox';
import ConfirmModal from '../components/atoms/ConfirmModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_WIDTH * 0.56; // ~16:9

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

function DesktopStickyBar({ event, isFree, colors, isDark, rsvpStatus, rsvpLoading, onRsvp, onTickets }: {
    event: EventDetailResponse;
    isFree: boolean;
    colors: any;
    isDark: boolean;
    rsvpStatus: RsvpStatus | null;
    rsvpLoading: boolean;
    onRsvp: () => void;
    onTickets: () => void;
}) {
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    const bgColor = isDark ? 'rgba(18,19,26,0.85)' : 'rgba(255,255,255,0.85)';

    if (isFree) {
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


    const tickets = event.ticket_options ?? [];
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
        paddingHorizontal: 16,
        marginTop: 24,
        borderRadius: 12,
    },
    info: { flex: 1, marginRight: 16 },
    price: { fontSize: 18, fontWeight: '800', marginLeft: 8 },
    hint: { fontSize: 13, marginTop: 2, marginLeft: 8 },
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


function openInMaps(lat: number, lng: number) {
    const url = Platform.OS === 'ios'
        ? `https://maps.apple.com/place?coordinate=${lat},${lng}`
        : `https://www.google.com/maps/place/${lat},${lng}`;
    Linking.openURL(url);
}

export default function EventScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string; eventId?: string; preview?: string }>();
    const id = params.id || params.eventId;
    const isPreview = params.preview === '1';
    const { width: windowWidth } = useWindowDimensions();

    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedTicketIdx, setSelectedTicketIdx] = useState(0);
    const [ticketCount, setTicketCount] = useState(1);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const drawerAnim = useRef(new Animated.Value(0)).current;

    const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus | null>(null);
    const [rsvpMenuVisible, setRsvpMenuVisible] = useState(false);
    const [rsvpLoading, setRsvpLoading] = useState(false);
    const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);
    const [customFieldsSubmitting, setCustomFieldsSubmitting] = useState(false);
    const [cfConfirmVisible, setCfConfirmVisible] = useState(false);
    const [initialResponses, setInitialResponses] = useState<Record<string, CustomFieldResponseItem[]>>({});
    const [myTickets, setMyTickets] = useState<{ ticket_id: string; label: string }[]>([]);
    const [ticketCountPickerOpen, setTicketCountPickerOpen] = useState(false);
    const [attendeeNames, setAttendeeNames] = useState<string[]>(['']);
    const [buyerDisplayName, setBuyerDisplayName] = useState('');
    const [sliderIndex, setSliderIndex] = useState(0);
    const [calendarModalVisible, setCalendarModalVisible] = useState(false);
    const [hostMenuVisible, setHostMenuVisible] = useState(false);

    // Custom Fields Bottom Sheet (like TicketDetailScreen)
    const CF_SHEET_HEIGHT = SCREEN_HEIGHT * 0.9;
    const cfTranslateY = useRef(new Animated.Value(CF_SHEET_HEIGHT)).current;
    const cfBackdropOpacity = useRef(new Animated.Value(0)).current;
    const cfIsFirstSubmissionRef = useRef(false);
    const cfHasRequiredFieldsRef = useRef(false);

    useEffect(() => {
        if (customFieldsModalOpen) {
            const hasAny = Object.values(initialResponses).some(r => r.length > 0);
            cfIsFirstSubmissionRef.current = !hasAny;
            cfHasRequiredFieldsRef.current = (event?.custom_fields ?? []).some(f => f.is_required);
            cfTranslateY.setValue(CF_SHEET_HEIGHT);
            cfBackdropOpacity.setValue(0);
            Animated.parallel([
                Animated.spring(cfTranslateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
                Animated.timing(cfBackdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
        }
    }, [customFieldsModalOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const dismissCustomFields = useCallback(() => {
        Animated.parallel([
            Animated.timing(cfTranslateY, { toValue: CF_SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
            Animated.timing(cfBackdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => setCustomFieldsModalOpen(false));
    }, [cfTranslateY, cfBackdropOpacity, CF_SHEET_HEIGHT]);

    const cancelAndRevokeRsvp = useCallback(() => {
        dismissCustomFields();
        if (event) {
            handleRsvp('Declined');
        }
    }, [dismissCustomFields, event]); // eslint-disable-line react-hooks/exhaustive-deps

    const tryDismissCustomFields = useCallback(() => {
        if (cfIsFirstSubmissionRef.current && cfHasRequiredFieldsRef.current) {
            Animated.spring(cfTranslateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
            setCfConfirmVisible(true);
        } else {
            dismissCustomFields();
        }
    }, [dismissCustomFields, cfTranslateY]);

    const handleCfScrollEndDrag = useCallback((e: any) => {
        const offsetY = e.nativeEvent.contentOffset.y;
        const velocityY = e.nativeEvent.velocity?.y ?? 0;
        if (offsetY <= 0 && velocityY > 0.5) {
            tryDismissCustomFields();
        }
    }, [tryDismissCustomFields]);

    const cfPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_: any, gs: any) => gs.dy > 5,
            onPanResponderMove: (_: any, gs: any) => {
                if (gs.dy > 0) cfTranslateY.setValue(gs.dy);
            },
            onPanResponderRelease: (_: any, gs: any) => {
                if (gs.dy > 80 || gs.vy > 0.5) {
                    if (cfIsFirstSubmissionRef.current && cfHasRequiredFieldsRef.current) {
                        Animated.spring(cfTranslateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
                        setCfConfirmVisible(true);
                    } else {
                        Animated.parallel([
                            Animated.timing(cfTranslateY, { toValue: CF_SHEET_HEIGHT, duration: 250, useNativeDriver: true }),
                            Animated.timing(cfBackdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
                        ]).start(() => setCustomFieldsModalOpen(false));
                    }
                } else {
                    Animated.spring(cfTranslateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
                }
            },
        })
    ).current;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadEvent = async (silent = false) => {
        try {
            if (!silent) {
                setLoading(true);
                setError(null);
            }

            if (!id) {
                throw new Error('Event-ID fehlt');
            }

            const token = await getSession();
            const data = await api.getEventById(id, token || undefined);
            setEvent(data);
            setRsvpStatus(data.my_rsvp_status ?? null);
            const loc = data.location;
            if (loc && loc.latitude != null && loc.longitude != null) {
                setMapCoords({ lat: loc.latitude, lng: loc.longitude });
            } else if (loc && !loc.latitude && loc.city) {
                geocodeAddress(
                    loc.house_number ? `${loc.street} ${loc.house_number}` : loc.street,
                    loc.city, loc.postal_code ?? null, loc.country ?? null,
                ).then((c) => { if (c) setMapCoords(c); });
            } else {
                setMapCoords(null);
            }
        } catch (e) {
            console.error('[EventScreen] Load error:', e);
            if (!silent) setError(e instanceof Error ? e.message : 'Event konnte nicht geladen werden');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleCalendarDownload = async () => {
        if (!event) return;

        if (Platform.OS === 'web') {
            try {
                const token = await getSession();
                const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
                const url = `${baseUrl}/api/v1/events/${event.event_id}/calendar.ics`;
                const headers: Record<string, string> = token
                    ? { Authorization: `Bearer ${token}` }
                    : {};
                const response = await fetch(url, { headers });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = objectUrl;
                a.download = `event-${event.event_id}.ics`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(objectUrl);
            } catch {
                Alert.alert('Fehler', 'Kalender-Export konnte nicht heruntergeladen werden.');
            }
            return;
        }

        try {
            const { status: existing } = await Calendar.getCalendarPermissionsAsync();
            if (existing !== 'granted') {
                const { status } = await Calendar.requestCalendarPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        'Kalenderzugriff verweigert',
                        'Bitte erlaube den Kalender-Zugriff in den Einstellungen, um Events hinzuzufügen.'
                    );
                    return;
                }
            }
            setCalendarModalVisible(true);
        } catch {
            Alert.alert('Fehler', 'Kalender-Zugriff konnte nicht angefragt werden.');
        }
    };

    const handleCalendarConfirm = async () => {
        if (!event) return;
        setCalendarModalVisible(false);
        try {
            let calendarId: string;
            if (Platform.OS === 'ios') {
                const defaultCalendar = await Calendar.getDefaultCalendarAsync();
                calendarId = defaultCalendar.id;
            } else {
                const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
                const writable = calendars.find(c => c.allowsModifications);
                if (!writable) {
                    Alert.alert('Fehler', 'Kein beschreibbarer Kalender auf dem Gerät gefunden.');
                    return;
                }
                calendarId = writable.id;
            }

            const startDate = new Date(event.starts_at);
            const endDate = event.ends_at
                ? new Date(event.ends_at)
                : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

            const locationParts = event.location
                ? [
                    event.location.street,
                    event.location.house_number,
                    event.location.postal_code,
                    event.location.city,
                  ].filter(Boolean)
                : [];
            const location = locationParts.length > 0 ? locationParts.join(' ') : undefined;

            await Calendar.createEventAsync(calendarId, {
                title: event.title,
                startDate,
                endDate,
                location,
                notes: event.description ?? undefined,
            });

            Alert.alert('Gespeichert', 'Das Event wurde zu deinem Kalender hinzugefügt.');
        } catch (e) {
            console.error('[EventScreen] Calendar createEvent error:', e);
            Alert.alert('Fehler', 'Das Event konnte nicht zum Kalender hinzugefügt werden.');
        }
    };

    const silentRefresh = async (purchasedOptionId?: string, purchasedCount?: number) => {
        if (!id) return;
        try {
            const token = await getSession();
            const data = await api.getEventById(id, token || undefined);
            setRsvpStatus(data.my_rsvp_status ?? null);
            setEvent(prev => {
                if (!prev) return data;
                return {
                    ...data,
                    ticket_options: purchasedOptionId
                        ? data.ticket_options.map(t =>
                            t.ticket_option_id === purchasedOptionId
                                ? { ...t, quantity_limit: t.quantity_limit != null ? Math.max(0, t.quantity_limit - (purchasedCount ?? 0)) : null }
                                : t
                          )
                        : data.ticket_options,
                };
            });
        } catch {
            // Stille Fehler ignorieren — User sieht noch die alten Daten
        }
    };

    const handleRsvp = async (newStatus: RsvpStatus, ticketCount: number = 1, names?: string[]) => {
        if (!event) return;
        const token = await getSession();
        if (!token) {
            router.navigate('/login');
            return;
        }
        setRsvpLoading(true);
        try {
            await api.rsvpEvent(event.event_id, newStatus, token, ticketCount, names);
            const prevStatus = rsvpStatus;
            setRsvpStatus(newStatus);
            if (newStatus === 'Accepted') {
                if (prevStatus !== 'Accepted') {
                    setEvent({ ...event, participant_count: event.participant_count + ticketCount });
                }
                const hasCustomFields = (event.custom_fields?.length ?? 0) > 0;
                const freshToken = await getSession();
                api.invalidateCaches(event.event_id);
                const freshEvent = await api.getEventById(event.event_id, freshToken || undefined);
                setEvent(freshEvent);
                const freshHasCustomFields = (freshEvent.custom_fields?.length ?? 0) > 0;
                if (hasCustomFields || freshHasCustomFields) {
                    let tickets = freshEvent.ticket || [];
                    if (tickets.length === 0 && freshToken) {
                        try {
                            const allTickets = await api.getUserTickets(freshToken);
                            tickets = allTickets.tickets
                                .filter(t => t.event_id === event.event_id)
                                .map(t => ({ ticket_id: t.ticket_id, guest_name: t.guest_name }));
                        } catch { /* ignore */ }
                    }
                    const ticketInfos = tickets.map((t, i) => ({
                        ticket_id: t.ticket_id,
                        label: t.guest_name || (tickets.length > 1 ? `Person ${i + 1}` : 'Person 1'),
                    }));
                    setMyTickets(ticketInfos);
                    if (freshToken) {
                        try {
                            const data = await api.getMyCustomFieldResponses(freshEvent.event_id, freshToken);
                            const mapped: Record<string, CustomFieldResponseItem[]> = {};
                            for (const item of data) {
                                mapped[item.ticket_id] = item.responses;
                            }
                            setInitialResponses(mapped);
                        } catch {
                            setInitialResponses({});
                        }
                    }
                    setCustomFieldsModalOpen(true);
                }
            } else if (prevStatus === 'Accepted') {
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
            api.invalidateCaches(id);
            loadEvent(true);
        }
    };

    const handleRsvpWithTicketCount = (newStatus: RsvpStatus) => {
        if (!event) return;
        const maxPerPerson = event.max_tickets_per_person ?? 1;
        if (newStatus === 'Accepted' && maxPerPerson > 1) {
            setAttendeeNames(['']);
            setTicketCountPickerOpen(true);
            getUserProfile().then(p => {
                setBuyerDisplayName(p?.displayName ?? p?.firstName ?? 'Gast');
            });
        } else {
            handleRsvp(newStatus);
        }
    };

    const confirmTicketCount = () => {
        setTicketCountPickerOpen(false);
        const resolved = attendeeNames.map((n, i) =>
            n.trim() || `${buyerDisplayName || 'Gast'} ${i + 1}`
        );
        handleRsvp('Accepted', resolved.length, resolved);
    };

    const handleCustomFieldSubmit = async (responses: Record<string, CustomFieldResponseItem[]>) => {
        if (!event) return;
        const token = await getSession();
        if (!token) return;
        setCustomFieldsSubmitting(true);
        try {
            for (const [ticketId, ticketResponses] of Object.entries(responses)) {
                if (!ticketId) continue;
                await api.submitCustomFieldResponses(event.event_id, ticketId, ticketResponses, token);
            }
            dismissCustomFields();
        } catch (err) {
            console.error('[EventScreen] Custom fields submit error:', err);
            Alert.alert('Fehler', 'Antworten konnten nicht gespeichert werden.');
        } finally {
            setCustomFieldsSubmitting(false);
        }
    };

    const handleStickyBarPress = () => {
        if (!event) return;
        if (effectiveIsFree) {
            if (event.is_public) {
                handleRsvpWithTicketCount(rsvpStatus === 'Accepted' ? 'Declined' : 'Accepted');
            } else {
                setRsvpMenuVisible(true);
            }
        } else {
            openDrawer();
        }
    };

    const handleShare = async () => {
        const link = `https://happin.fun/event/${id}`;
        const formattedDate = event ? new Intl.DateTimeFormat('de-DE', {
            day: 'numeric', month: 'long', year: 'numeric',
        }).format(new Date(event.starts_at)) : '';
        const shareMessage = event
            ? `Schau mal, dieses Event habe ich gefunden! 🎉\n\n"${event.title}" findet am ${formattedDate} statt – vielleicht interessiert dich das?\n\n${link}`
            : link;
        try {
            await Share.share({ message: shareMessage });
        } catch {
            // cancelled
        }
    };


    if (loading) {
        return (
            <ScreenWithNav showBottomNav={false}>
                <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                    {/* Hero placeholder */}
                    <SkeletonBox height={HERO_HEIGHT} borderRadius={0} />
                    <View style={{ padding: 20, gap: 12 }}>
                        <SkeletonBox height={28} width="80%" borderRadius={8} />
                        <SkeletonBox height={16} width="55%" borderRadius={6} />
                        <SkeletonBox height={16} width="45%" borderRadius={6} />
                        {/* Action buttons */}
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <SkeletonBox key={i} height={72} borderRadius={12} style={{ flex: 1 }} />
                            ))}
                        </View>
                        {/* Description lines */}
                        <View style={{ gap: 8, marginTop: 8 }}>
                            <SkeletonBox height={14} borderRadius={5} />
                            <SkeletonBox height={14} borderRadius={5} />
                            <SkeletonBox height={14} width="70%" borderRadius={5} />
                        </View>
                    </View>
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
                        onPress={() => loadEvent()}
                    >
                        <Text style={[styles.retryText, { color: colors.onPrimary }]}>Erneut versuchen</Text>
                    </TouchableOpacity>
                </View>
            </ScreenWithNav>
        );
    }

    const hostInitial = event.host_name?.charAt(0).toUpperCase() || 'H';
    const categories = event.category ? event.category.split(',').map(c => c.trim()) : [];

    // Ein Event gilt als kostenpflichtig sobald mind. eine Ticketoption mit Preis > 0 existiert
    const hasPaidTickets = (event.ticket_options ?? []).some(t => t.price > 0);
    const effectiveIsFree = event.is_free && !hasPaidTickets;

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
            <Head><title>{event.title} – Happin</title></Head>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                {/* Blurred background image */}
                {event.image_url ? (
                    <Image
                        source={{ uri: event.image_url }}
                        style={[styles.bgImage, isWeb ? { filter: 'blur(60px) saturate(1.8) brightness(0.7)' } as any : {}]}
                        blurRadius={isWeb ? 0 : 25}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient
                        colors={getGradientByIndex(event.gradient_id ?? 0)}
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
                                style={styles.backButton}
                                onPress={() => router.canGoBack() ? router.back() : router.push('/events')}
                            >
                                <Ionicons name="arrow-back" size={24} color="#ffffff" />
                            </TouchableOpacity>

                            {isPreview && (
                                <View style={styles.previewBadge}>
                                    <Text style={styles.previewBadgeText}>VORSCHAU</Text>
                                </View>
                            )}

                            {/* Current image */}
                            {sliderImages.length > 0 ? (
                                <Image
                                    source={{ uri: sliderImages[sliderIndex] }}
                                    style={styles.desktopSliderImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <LinearGradient
                                    colors={getGradientByIndex(event.gradient_id ?? 0)}
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
                            onScrollBeginDrag={() => setHostMenuVisible(false)}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Preview Badge */}
                            {isPreview && (
                                <View style={styles.previewBannerDesktop}>
                                    <Text style={styles.previewBadgeText}>VORSCHAU</Text>
                                </View>
                            )}

                            {/* Cancelled Banner */}
                            {event.is_deleted && (
                                <View style={cancelledBannerStyles.container}>
                                    <Ionicons name="close-circle" size={20} color="#fff" />
                                    <Text style={cancelledBannerStyles.text}>
                                        Dieses Event wurde abgesagt
                                    </Text>
                                </View>
                            )}

                            {/* Host Card */}
                            <View style={[...glassCard, styles.hostCard]}>
                                <View style={styles.hostInfo}>
                                    <View style={[styles.hostAvatar, { backgroundColor: colors.primary }]}>
                                        <Text style={[styles.hostAvatarText, { color: colors.onPrimary }]}>{hostInitial}</Text>
                                    </View>
                                    <View style={styles.hostTextContainer}>
                                        <Text style={[styles.hostName, { color: colors.onSurface }]}>{event.host_name || 'Host'}</Text>
                                        <Text style={[styles.hostSubtitle, { color: colors.onSurfaceVariant }]}>hat dich eingeladen</Text>
                                    </View>
                                </View>
                                <View>
                                    <TouchableOpacity onPress={() => setHostMenuVisible(!hostMenuVisible)}>
                                        <Ionicons name="ellipsis-horizontal" size={24} color={colors.onSurfaceVariant} />
                                    </TouchableOpacity>
                                    {hostMenuVisible && (
                                        <View style={[styles.hostMenuDropdown, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                                            <TouchableOpacity
                                                style={styles.hostMenuItem}
                                                onPress={() => { setHostMenuVisible(false); router.push('/account'); }}
                                            >
                                                <Ionicons name="camera-outline" size={18} color={colors.onSurface} />
                                                <Text style={[styles.hostMenuItemText, { color: colors.onSurface }]}>Profilbild ändern</Text>
                                            </TouchableOpacity>
                                            <View style={[styles.hostMenuSeparator, { backgroundColor: colors.outlineVariant }]} />
                                            <TouchableOpacity
                                                style={styles.hostMenuItem}
                                                onPress={() => { setHostMenuVisible(false); router.push('/account'); }}
                                            >
                                                <Ionicons name="pencil-outline" size={18} color={colors.onSurface} />
                                                <Text style={[styles.hostMenuItemText, { color: colors.onSurface }]}>Namen ändern</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={[styles.actionButtons, { marginBottom: 32 }, isPreview && { opacity: 0.4 }]} pointerEvents={isPreview ? 'none' : 'auto'}>
                                {(() => {
                                    const hasAccess = effectiveIsFree
                                        ? rsvpStatus === 'Accepted'
                                        : (event.ticket ?? []).length > 0;
                                    return hasAccess ? (
                                        <TouchableOpacity
                                            style={glassActionBtn}
                                            onPress={() => router.push(`/ticket/${id}`)}
                                        >
                                            <Ionicons name="qr-code-outline" size={22} color={colors.onSurface} />
                                            <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Ticket</Text>
                                        </TouchableOpacity>
                                    ) : null;
                                })()}
                                <TouchableOpacity style={glassActionBtn} onPress={handleCalendarDownload}>
                                    <Ionicons name="calendar-outline" size={22} color={colors.onSurface} />
                                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>ICS-Import</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={glassActionBtn} onPress={handleShare}>
                                    <Ionicons name="share-outline" size={22} color={colors.onSurface} />
                                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Teilen</Text>
                                </TouchableOpacity>
                                {event.is_host && (
                                    <TouchableOpacity style={glassActionBtn} onPress={() => router.push(`/event/${id}/manage`)}>
                                        <Ionicons name="settings-outline" size={22} color={colors.onSurface} />
                                        <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Verwalten</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Categories */}
                            {categories.length > 0 && (
                                <EventCategories categories={categories} editMode={false} />
                            )}

                            {/* About */}
                            {event.description && (
                                <View style={[...glassCard, styles.section, { padding: 20 }]}>
                                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Beschreibung</Text>
                                    <Text style={[styles.description, { color: colors.onSurface }]}>{event.description}</Text>
                                </View>
                            )}

                            {/* Location */}
                            {event.location && (
                                <View style={styles.section}>
                                    <View style={[...glassCard, styles.locationCard]}>
                                        <View style={styles.locationHeader}>
                                            <View style={styles.locationTextContainer}>
                                                {(() => {
                                                    const loc = event.location!;
                                                    const isPrivateStripped = event.location_is_private && !loc.street && loc.latitude == null;
                                                    if (isPrivateStripped) {
                                                        return (
                                                            <>
                                                                <Text style={[styles.locationAddress, { color: colors.onSurface }]}>
                                                                    {loc.city ?? loc.country ?? 'Ort nicht verfügbar'}
                                                                </Text>
                                                                <Text style={[styles.locationCity, { color: colors.onSurfaceVariant }]}>
                                                                    {loc.city && loc.country ? loc.country : ''}
                                                                </Text>
                                                            </>
                                                        );
                                                    }
                                                    return (
                                                        <>
                                                            <Text style={[styles.locationAddress, { color: colors.onSurface }]}>
                                                                {loc.street && loc.house_number
                                                                    ? `${loc.street} ${loc.house_number}`
                                                                    : loc.street
                                                                    ? loc.street
                                                                    : (loc.latitude != null && loc.longitude != null)
                                                                    ? `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`
                                                                    : loc.city
                                                                    ? loc.city
                                                                    : 'Adresse nicht verfügbar'}
                                                            </Text>
                                                            <Text style={[styles.locationCity, { color: colors.onSurfaceVariant }]}>
                                                                {loc.street
                                                                    ? (loc.postal_code && loc.city
                                                                        ? `${loc.postal_code} ${loc.city}`
                                                                        : loc.city || '')
                                                                    : (loc.latitude != null && loc.longitude != null && loc.city)
                                                                    ? loc.city
                                                                    : ''}
                                                            </Text>
                                                        </>
                                                    );
                                                })()}
                                            </View>
                                        </View>
                                        {event.location_is_private && !event.location.street && event.location.latitude == null ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 6 }}>
                                                <Ionicons name="lock-closed-outline" size={14} color={colors.onSurfaceVariant} />
                                                <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, textAlign: 'center', flexShrink: 1 }}>
                                                    Der Host hat eingestellt, dass nur zugesagte Gäste den genauen Standort sehen können.
                                                </Text>
                                            </View>
                                        ) : (
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            onPress={() => mapCoords && openInMaps(mapCoords.lat, mapCoords.lng)}
                                            style={styles.mapPreview}
                                        >
                                            {mapCoords ? (
                                                <MapView
                                                    markers={[{ lat: mapCoords.lat, lng: mapCoords.lng, title: '', eventId: '__preview__' }]}
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
                                        </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* Desktop sticky bar inline at bottom of scroll */}
                            <View style={isPreview ? { opacity: 0.4 } : undefined} pointerEvents={isPreview ? 'none' : 'auto'}>
                                <DesktopStickyBar
                                    event={event}
                                    isFree={effectiveIsFree}
                                    colors={colors}
                                    isDark={isDark}
                                    rsvpStatus={rsvpStatus}
                                    rsvpLoading={rsvpLoading}
                                    onRsvp={handleStickyBarPress}
                                    onTickets={openDrawer}
                                />
                            </View>

                            <View style={{ height: 32 }} />
                        </ScrollView>
                    </View>
                ) : (
                    /* ── Mobile: original layout ── */
                    <ScrollView showsVerticalScrollIndicator={false} onScrollBeginDrag={() => setHostMenuVisible(false)}>
                        {/* Hero Image with Title Overlay */}
                        <View style={styles.heroContainer}>
                            {event.image_url ? (
                                <Image source={{ uri: event.image_url }} style={styles.heroImage} resizeMode="cover" />
                            ) : (
                                <LinearGradient colors={getGradientByIndex(event.gradient_id ?? 0)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroImage} />
                            )}

                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => router.canGoBack() ? router.back() : router.push('/events')}
                            >
                                <Ionicons name="arrow-back" size={24} color="#ffffff" />
                            </TouchableOpacity>

                            {isPreview && (
                                <View style={styles.previewBadge}>
                                    <Text style={styles.previewBadgeText}>VORSCHAU</Text>
                                </View>
                            )}

                            <View style={styles.titleOverlay}>
                                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.titleGradient}>
                                    <Text style={styles.heroTitle}>{event.title}</Text>
                                    <Text style={styles.heroDate}>{formatDateGerman(event.starts_at)}</Text>
                                </LinearGradient>
                            </View>
                        </View>

                        {/* Cancelled Banner */}
                        {event.is_deleted && (
                            <View style={cancelledBannerStyles.container}>
                                <Ionicons name="close-circle" size={20} color="#fff" />
                                <Text style={cancelledBannerStyles.text}>
                                    Dieses Event wurde abgesagt
                                </Text>
                            </View>
                        )}

                        <View style={styles.content}>
                            <View style={[...glassCard, styles.hostCard]}>
                                <View style={styles.hostInfo}>
                                    <View style={[styles.hostAvatar, { backgroundColor: colors.primary }]}>
                                        <Text style={[styles.hostAvatarText, { color: colors.onPrimary }]}>{hostInitial}</Text>
                                    </View>
                                    <View style={styles.hostTextContainer}>
                                        <Text style={[styles.hostName, { color: colors.onSurface }]}>{event.host_name || 'Host'}</Text>
                                        <Text style={[styles.hostSubtitle, { color: colors.onSurfaceVariant }]}>hat dich eingeladen</Text>
                                    </View>
                                </View>
                                <View>
                                    <TouchableOpacity onPress={() => setHostMenuVisible(!hostMenuVisible)}>
                                        <Ionicons name="ellipsis-horizontal" size={24} color={colors.onSurfaceVariant} />
                                    </TouchableOpacity>
                                    {hostMenuVisible && (
                                        <View style={[styles.hostMenuDropdown, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                                            <TouchableOpacity
                                                style={styles.hostMenuItem}
                                                onPress={() => { setHostMenuVisible(false); router.push('/account'); }}
                                            >
                                                <Ionicons name="camera-outline" size={18} color={colors.onSurface} />
                                                <Text style={[styles.hostMenuItemText, { color: colors.onSurface }]}>Profilbild ändern</Text>
                                            </TouchableOpacity>
                                            <View style={[styles.hostMenuSeparator, { backgroundColor: colors.outlineVariant }]} />
                                            <TouchableOpacity
                                                style={styles.hostMenuItem}
                                                onPress={() => { setHostMenuVisible(false); router.push('/account'); }}
                                            >
                                                <Ionicons name="pencil-outline" size={18} color={colors.onSurface} />
                                                <Text style={[styles.hostMenuItemText, { color: colors.onSurface }]}>Namen ändern</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Action Buttons */}
                            <View style={[styles.actionButtons, { marginBottom: 32 }, isPreview && { opacity: 0.4 }]} pointerEvents={isPreview ? 'none' : 'auto'}>
                                {(() => {
                                    const hasAccess = effectiveIsFree
                                        ? rsvpStatus === 'Accepted'
                                        : (event.ticket ?? []).length > 0;
                                    return hasAccess ? (
                                        <TouchableOpacity
                                            style={glassActionBtn}
                                            onPress={() => router.push(`/ticket/${id}`)}
                                        >
                                            <Ionicons name="qr-code-outline" size={22} color={colors.onSurface} />
                                            <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Ticket</Text>
                                        </TouchableOpacity>
                                    ) : null;
                                })()}
                                <TouchableOpacity style={glassActionBtn} onPress={handleCalendarDownload}>
                                    <Ionicons name="calendar-outline" size={22} color={colors.onSurface} />
                                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>ICS-Import</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={glassActionBtn} onPress={handleShare}>
                                    <Ionicons name="share-outline" size={22} color={colors.onSurface} />
                                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Teilen</Text>
                                </TouchableOpacity>
                                {event.is_host && (
                                    <TouchableOpacity style={glassActionBtn} onPress={() => router.push(`/event/${id}/manage`)}>
                                        <Ionicons name="settings-outline" size={22} color={colors.onSurface} />
                                        <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Verwalten</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {categories.length > 0 && (
                                <EventCategories categories={categories} editMode={false} />
                            )}

                            {event.description && (
                                <View style={[...glassCard, styles.section, { padding: 20 }]}>
                                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Beschreibung</Text>
                                    <Text style={[styles.description, { color: colors.onSurface }]}>{event.description}</Text>
                                </View>
                            )}

                            {event.location && (
                                <View style={styles.section}>
                                    <View style={[...glassCard, styles.locationCard]}>
                                        <View style={styles.locationHeader}>
                                            <View style={styles.locationTextContainer}>
                                                {(() => {
                                                    const loc = event.location!;
                                                    const isPrivateStripped = event.location_is_private && !loc.street && loc.latitude == null;
                                                    if (isPrivateStripped) {
                                                        return (
                                                            <>
                                                                <Text style={[styles.locationAddress, { color: colors.onSurface }]}>
                                                                    {loc.city ?? loc.country ?? 'Ort nicht verfügbar'}
                                                                </Text>
                                                                <Text style={[styles.locationCity, { color: colors.onSurfaceVariant }]}>
                                                                    {loc.city && loc.country ? loc.country : ''}
                                                                </Text>
                                                            </>
                                                        );
                                                    }
                                                    return (
                                                        <>
                                                            <Text style={[styles.locationAddress, { color: colors.onSurface }]}>
                                                                {loc.street && loc.house_number
                                                                    ? `${loc.street} ${loc.house_number}`
                                                                    : loc.street
                                                                    ? loc.street
                                                                    : (loc.latitude != null && loc.longitude != null)
                                                                    ? `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`
                                                                    : loc.city
                                                                    ? loc.city
                                                                    : 'Adresse nicht verfügbar'}
                                                            </Text>
                                                            <Text style={[styles.locationCity, { color: colors.onSurfaceVariant }]}>
                                                                {loc.street
                                                                    ? (loc.postal_code && loc.city
                                                                        ? `${loc.postal_code} ${loc.city}`
                                                                        : loc.city || '')
                                                                    : (loc.latitude != null && loc.longitude != null && loc.city)
                                                                    ? loc.city
                                                                    : ''}
                                                            </Text>
                                                        </>
                                                    );
                                                })()}
                                            </View>
                                        </View>
                                        {event.location_is_private && !event.location.street && event.location.latitude == null ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 6 }}>
                                                <Ionicons name="lock-closed-outline" size={14} color={colors.onSurfaceVariant} />
                                                <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, textAlign: 'center', flexShrink: 1 }}>
                                                    Der Host hat eingestellt, dass nur zugesagte Gäste den genauen Standort sehen können.
                                                </Text>
                                            </View>
                                        ) : (
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            onPress={() => mapCoords && openInMaps(mapCoords.lat, mapCoords.lng)}
                                            style={styles.mapPreview}
                                        >
                                            {mapCoords ? (
                                                <MapView
                                                    markers={[{ lat: mapCoords.lat, lng: mapCoords.lng, title: '', eventId: '__preview__' }]}
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
                                        </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            )}

                            {event.media_urls && event.media_urls.length > 0 && (
                                <View style={styles.section}>
                                    <EventImageGallery images={event.media_urls} />
                                </View>
                            )}

                            <View style={{ height: 100 }} />
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* Sticky Bottom Bar — mobile only */}
            {!isDesktop && (() => {
                if (effectiveIsFree) {
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
                            isPreview && { opacity: 0.4 },
                        ]} pointerEvents={isPreview ? 'none' : 'auto'}>
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

                const tickets = event.ticket_options ?? [];
                const cheapest = Math.min(...tickets.map(t => t.price));
                return (
                    <View style={[
                        styles.stickyBar,
                        { borderTopColor: colors.outlineVariant },
                        isWeb
                            ? { backgroundColor: isDark ? 'rgba(18,19,26,0.85)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as any
                            : { backgroundColor: colors.surface },
                        isPreview && { opacity: 0.4 },
                    ]} pointerEvents={isPreview ? 'none' : 'auto'}>
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
                const tickets = event.ticket_options ?? [];
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
                                    style={[styles.checkoutButton, { backgroundColor: colors.primary }, checkoutLoading && { opacity: 0.6 }]}
                                    disabled={checkoutLoading || !selected}
                                    onPress={async () => {
                                        if (!selected) return;
                                        setCheckoutLoading(true);
                                        const purchasedOptionId = selected.ticket_option_id;
                                        const purchasedCount = ticketCount;
                                        try {
                                            const token = await getSession();
                                            if (!token) { Alert.alert('Fehler', 'Bitte melde dich an.'); return; }
                                            await api.createTickets(
                                                event.event_id,
                                                purchasedOptionId ?? null,
                                                purchasedCount,
                                                token
                                            );
                                            invalidateTicketsCache();
                                            api.invalidateCaches(event.event_id);
                                            closeDrawer();
                                            await silentRefresh(purchasedOptionId, purchasedCount);
                                        } catch (err: any) {
                                            Alert.alert('Fehler', err?.message ?? 'Ticket konnte nicht gebucht werden.');
                                        } finally {
                                            setCheckoutLoading(false);
                                        }
                                    }}
                                >
                                    <Ionicons name="cart-outline" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                                    <Text style={[styles.checkoutButtonText, { color: colors.onPrimary }]}>
                                        {checkoutLoading ? 'Wird gebucht…' : total === 0 ? 'Kostenlos buchen' : 'Zur Kasse'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </>
                );
            })()}

            {/* Host menu backdrop */}
            {hostMenuVisible && (
                <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={() => setHostMenuVisible(false)}
                />
            )}

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
                                        handleRsvpWithTicketCount(opt.status);
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

            {/* Calendar Confirmation Modal */}
            <Modal
                visible={calendarModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setCalendarModalVisible(false)}
            >
                <Pressable style={rsvpStyles.backdrop} onPress={() => setCalendarModalVisible(false)} />
                <View style={[rsvpStyles.sheet, { backgroundColor: colors.surfaceContainerLow }]}>
                    <View style={[rsvpStyles.handle, { backgroundColor: colors.outlineVariant }]} />

                    <View style={calendarStyles.titleRow}>
                        <Ionicons name="calendar" size={22} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={[rsvpStyles.title, { color: colors.onSurface, marginBottom: 0 }]}>
                            Zum Kalender hinzufügen
                        </Text>
                    </View>

                    <View style={calendarStyles.eventInfo}>
                        <Text style={[calendarStyles.eventTitle, { color: colors.onSurface }]}>
                            {event?.title}
                        </Text>
                        <Text style={[calendarStyles.eventMeta, { color: colors.onSurfaceVariant }]}>
                            {event?.starts_at ? formatDateGerman(event.starts_at) : ''}
                        </Text>
                        {event?.location && (
                            <Text style={[calendarStyles.eventMeta, { color: colors.onSurfaceVariant }]}>
                                {[event.location.street, event.location.house_number, event.location.postal_code, event.location.city]
                                    .filter(Boolean)
                                    .join(' ')}
                            </Text>
                        )}
                    </View>

                    <View style={calendarStyles.actions}>
                        <TouchableOpacity
                            style={[calendarStyles.confirmButton, { backgroundColor: colors.primary }]}
                            onPress={handleCalendarConfirm}
                        >
                            <Text style={[calendarStyles.confirmButtonText, { color: colors.onPrimary }]}>
                                Hinzufügen
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={calendarStyles.cancelButton}
                            onPress={() => setCalendarModalVisible(false)}
                        >
                            <Text style={[calendarStyles.cancelButtonText, { color: colors.onSurfaceVariant }]}>
                                Abbrechen
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={rsvpStyles.bottomSpacer} />
                </View>
            </Modal>

            {/* Attendee Names Picker Modal (when max_tickets_per_person > 1) */}
            <Modal
                visible={ticketCountPickerOpen}
                animationType="slide"
                transparent
                onRequestClose={() => setTicketCountPickerOpen(false)}
            >
                <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                    <Pressable style={rsvpStyles.backdrop} onPress={() => setTicketCountPickerOpen(false)} />
                    <View style={[rsvpStyles.sheet, { backgroundColor: colors.surfaceContainerLow }]}>
                        <View style={[rsvpStyles.handle, { backgroundColor: colors.outlineVariant }]} />
                        <Text style={[rsvpStyles.title, { color: colors.onSurface }]}>Wer kommt mit?</Text>
                        <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center', marginTop: -4, marginBottom: 16 }}>
                            Max. {event?.max_tickets_per_person ?? 1} Personen (inkl. dir)
                        </Text>
                        <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                            {attendeeNames.map((name, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10, gap: 8 }}>
                                    <TextInput
                                        style={{
                                            flex: 1,
                                            height: 44,
                                            borderRadius: 12,
                                            backgroundColor: colors.surfaceContainerHigh,
                                            paddingHorizontal: 14,
                                            fontSize: 15,
                                            color: colors.onSurface,
                                        }}
                                        placeholder={`${buyerDisplayName || 'Gast'} ${idx + 1}`}
                                        placeholderTextColor={colors.onSurfaceVariant}
                                        value={name}
                                        onChangeText={text => {
                                            const updated = [...attendeeNames];
                                            updated[idx] = text;
                                            setAttendeeNames(updated);
                                        }}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setAttendeeNames(attendeeNames.filter((_, i) => i !== idx))}
                                        disabled={attendeeNames.length <= 1}
                                        style={{ opacity: attendeeNames.length <= 1 ? 0.35 : 1 }}
                                    >
                                        <Ionicons name="trash-outline" size={22} color={colors.onSurfaceVariant} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            onPress={() => setAttendeeNames([...attendeeNames, ''])}
                            disabled={attendeeNames.length >= (event?.max_tickets_per_person ?? 1)}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                marginHorizontal: 20,
                                marginTop: 4,
                                marginBottom: 16,
                                paddingVertical: 12,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: colors.outlineVariant,
                                opacity: attendeeNames.length >= (event?.max_tickets_per_person ?? 1) ? 0.35 : 1,
                            }}
                        >
                            <Ionicons name="add" size={20} color={colors.primary} />
                            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>Teilnehmer hinzufügen</Text>
                        </TouchableOpacity>
                        <View style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
                            <TouchableOpacity
                                style={{ backgroundColor: colors.primary, borderRadius: 9999, paddingVertical: 16, alignItems: 'center' }}
                                onPress={confirmTicketCount}
                            >
                                <Text style={{ color: colors.onPrimary, fontSize: 15, fontWeight: '600' }}>Zusagen</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Loading Overlay between ticket count confirm and custom fields modal */}
            {rsvpLoading && (event?.custom_fields?.length ?? 0) > 0 && !customFieldsModalOpen && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', zIndex: 999 }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}

            {/* Custom Fields Bottom Sheet (same pattern as TicketDetailScreen) */}
            {event && (event.custom_fields?.length ?? 0) > 0 && customFieldsModalOpen && (() => {
                return (
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        <Animated.View style={[cfStyles.backdrop, { opacity: cfBackdropOpacity }]}>
                            <Pressable style={StyleSheet.absoluteFill} onPress={tryDismissCustomFields} />
                        </Animated.View>

                        <Animated.View
                            style={[
                                cfStyles.sheet,
                                { backgroundColor: colors.background, transform: [{ translateY: cfTranslateY }] },
                            ]}
                        >
                            <View {...cfPanResponder.panHandlers} style={cfStyles.handleArea}>
                                <View style={[cfStyles.handle, { backgroundColor: colors.outlineVariant }]} />
                            </View>

                            <View style={cfStyles.header}>
                                <Text style={[cfStyles.headerTitle, { color: colors.onSurface }]}>
                                    Zusätzliche Angaben
                                </Text>
                                <TouchableOpacity onPress={tryDismissCustomFields} style={cfStyles.closeButton}>
                                    <Ionicons name="close" size={28} color={colors.onSurface} />
                                </TouchableOpacity>
                            </View>

                            <CustomFieldForm
                                fields={event.custom_fields!}
                                tickets={myTickets.length > 0 ? myTickets : [{ ticket_id: '', label: 'Person 1' }]}
                                initialValues={initialResponses}
                                onSubmit={handleCustomFieldSubmit}
                                onCancel={tryDismissCustomFields}
                                submitting={customFieldsSubmitting}
                                hideTitle
                                onScrollEndDrag={handleCfScrollEndDrag}
                            />
                        </Animated.View>
                    </View>
                );
            })()}

            <ConfirmModal
                visible={cfConfirmVisible}
                title="Abbrechen?"
                message="Wenn du die Pflichtfelder nicht ausfüllst, wird deine Zusage zurückgenommen."
                cancelLabel="Weiter ausfüllen"
                confirmLabel="Teilnahme absagen"
                onCancel={() => setCfConfirmVisible(false)}
                onConfirm={() => {
                    setCfConfirmVisible(false);
                    cancelAndRevokeRsvp();
                }}
            />

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
        backgroundColor: 'rgba(0,0,0,0.45)',
        zIndex: 10,
    },
    previewBadge: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 56 : 22,
        left: 0,
        right: 0,
        alignItems: 'center',
        pointerEvents: 'none' as any,
    },
    previewBannerDesktop: {
        alignItems: 'center',
        marginBottom: 16,
    },
    previewBadgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 20,
        overflow: 'hidden',
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
    hostMenuDropdown: {
        position: 'absolute',
        top: 32,
        right: 0,
        minWidth: 180,
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 100,
    },
    hostMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 10,
    },
    hostMenuItemText: {
        fontSize: 15,
        fontWeight: '500',
    },
    hostMenuSeparator: {
        height: 1,
        marginHorizontal: 12,
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
        textAlign: 'center',
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

const cfStyles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.9,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        overflow: 'hidden',
    },
    handleArea: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 16,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        padding: 8,
    },
});

const calendarStyles = StyleSheet.create({
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    eventInfo: {
        paddingHorizontal: 20,
        marginBottom: 24,
        gap: 4,
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    eventMeta: {
        fontSize: 14,
    },
    actions: {
        paddingHorizontal: 20,
        gap: 10,
    },
    confirmButton: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
});

const cancelledBannerStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FF3B30',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    text: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
});
