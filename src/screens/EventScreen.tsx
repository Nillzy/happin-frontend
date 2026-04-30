import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image,
    Platform,
    Modal,
    Pressable,
    ActivityIndicator,
    Switch,
    Alert,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';
import { AuthGate } from '@/src/components/auth/AuthGate';
import Navbar from '../components/atoms/Navbar';
import Footer from '../components/atoms/Footer';
import EventHero from '../components/event/EventHero';
import EventInfoBlock from '../components/event/EventInfoBlock';
import EventCategories from '../components/event/EventCategories';
import EventDescription from '../components/event/EventDescription';
import EditButton from '../components/atoms/EditButton';
import EditModal from '../components/atoms/EditModal';
import { CalendarIcon, LocationIcon, TicketIcon } from '../components/atoms/icons';
import DatePicker from '../components/atoms/DatePicker';
import TimePicker from '../components/atoms/TimePicker';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import type { EventDetailResponse, EventUpdateRequest, TicketOption } from '../types/events';

// ── Types ──────────────────────────────────────────────────────────────────────

type RsvpStatus = 'Accepted' | 'Declined' | 'Pending' | null;

const RSVP_OPTIONS: {
    status: Exclude<RsvpStatus, null>;
    icon: string;
    label: string;
    sublabel: string;
}[] = [
    { status: 'Accepted', icon: '✓', label: 'Zusagen',  sublabel: 'Ich bin dabei'            },
    { status: 'Pending',  icon: '~', label: 'Unsicher', sublabel: 'Vielleicht bin ich dabei' },
    { status: 'Declined', icon: '✕', label: 'Absagen',  sublabel: 'Ich kann leider nicht'    },
];

const RSVP_STATUS_LABELS: Record<NonNullable<RsvpStatus>, string> = {
    Accepted: '✓  Zugesagt',
    Declined: '✕  Abgesagt',
    Pending:  '~  Unsicher',
};

type EditSection = 'title' | 'description' | 'datetime' | 'location' | 'category' | 'capacity' | 'tickets' | null;

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
    return cents.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function formatPriceDisplay(isFree: boolean, options: TicketOption[]): string {
    if (isFree) return 'Kostenlos';
    if (options.length === 0) return 'Eintritt festlegen';
    if (options.length === 1) return formatPrice(options[0].price);
    const min = Math.min(...options.map((o) => o.price));
    return `Ab ${formatPrice(min)}`;
}

interface EventData {
    title: string;
    subtitle: string;
    heroImage: string;
    date: string;
    time: string;
    endDate: string;
    endTime: string;
    location: string;
    locationDetail: string;
    categories: string[];
    price: string;
    capacity: string;
    attending: number;
    description: string;
    host: { name: string; role: string; avatar: string; events: number };
    lineup: string[];
}

function mapApiToEventData(raw: EventDetailResponse): EventData {
    const d = new Date(raw.starts_at);
    const dateStr = new Intl.DateTimeFormat('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(d);
    const timeStr = new Intl.DateTimeFormat('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(d) + ' Uhr';

    let endDateStr = '';
    let endTimeStr = '';
    if (raw.ends_at) {
        const ed = new Date(raw.ends_at);
        endDateStr = new Intl.DateTimeFormat('de-DE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(ed);
        endTimeStr = new Intl.DateTimeFormat('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(ed) + ' Uhr';
    }

    const loc = raw.location;
    const locationName = loc ? `${loc.city}` : '';
    const locationDetail = loc
        ? [loc.street, loc.house_number, loc.postal_code, loc.city].filter(Boolean).join(', ')
        : '';

    const categories = raw.category ? raw.category.split(',').map((c) => c.trim()) : [];

    return {
        title: raw.title,
        subtitle: raw.description?.slice(0, 50) ?? '',
        heroImage: raw.image_url ?? '',
        date: dateStr,
        time: timeStr,
        endDate: endDateStr,
        endTime: endTimeStr,
        location: locationName,
        locationDetail,
        categories,
        price: formatPriceDisplay(raw.is_free, raw.ticket_options ?? []),
        capacity: raw.max_capacity ? `${raw.max_capacity} Plätze` : 'Unbegrenzt',
        attending: raw.participant_count,
        description: raw.description ?? '',
        host: {
            name: raw.host_name ?? 'Veranstalter',
            role: 'Veranstalter',
            avatar: '',
            events: 0,
        },
        lineup: [],
    };
}

// ── RSVP Menu ─────────────────────────────────────────────────────────────────

function RsvpMenu({
    visible,
    current,
    onSelect,
    onClose,
    colors,
}: {
    visible: boolean;
    current: RsvpStatus;
    onSelect: (s: Exclude<RsvpStatus, null>) => void;
    onClose: () => void;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <Pressable style={ms.backdrop} onPress={onClose} />
            <View style={[ms.sheet, { backgroundColor: colors.surfaceContainerLow }]}>
                <View style={[ms.handle, { backgroundColor: colors.outlineVariant }]} />
                <Text style={[ms.title, { color: colors.onSurface }]}>Teilnahme</Text>

                {RSVP_OPTIONS.map((opt, idx) => {
                    const isActive = current === opt.status;
                    return (
                        <RsvpOptionRow
                            key={opt.status}
                            opt={opt}
                            isActive={isActive}
                            isLast={idx === RSVP_OPTIONS.length - 1}
                            colors={colors}
                            onPress={() => {
                                onSelect(opt.status);
                                onClose();
                            }}
                        />
                    );
                })}

                <View style={ms.bottomSpacer} />
            </View>
        </Modal>
    );
}

function RsvpOptionRow({
    opt,
    isActive,
    isLast,
    colors,
    onPress,
}: {
    opt: (typeof RSVP_OPTIONS)[number];
    isActive: boolean;
    isLast: boolean;
    colors: ReturnType<typeof useTheme>['colors'];
    onPress: () => void;
}) {
    const scale = useSharedValue(1);
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const handlePress = () => {
        scale.value = withSequence(
            withTiming(0.96, { duration: 70 }),
            withSpring(1, { damping: 12, stiffness: 300 }),
        );
        onPress();
    };

    return (
        <>
            <Animated.View style={animStyle}>
                <TouchableOpacity
                    onPress={handlePress}
                    activeOpacity={0.85}
                    style={[
                        ms.optionRow,
                        {
                            backgroundColor: isActive ? `${colors.primary}14` : 'transparent',
                            borderColor: isActive ? `${colors.primary}28` : 'transparent',
                        },
                    ]}
                >
                    <View
                        style={[
                            ms.iconBadge,
                            {
                                backgroundColor: isActive
                                    ? `${colors.primary}22`
                                    : colors.surfaceContainer,
                            },
                        ]}
                    >
                        <Text style={[ms.iconText, { color: isActive ? colors.primary : colors.onSurfaceVariant }]}>
                            {opt.icon}
                        </Text>
                    </View>
                    <View style={ms.optionText}>
                        <Text style={[ms.optionLabel, { color: colors.onSurface }]}>{opt.label}</Text>
                        <Text style={[ms.optionSublabel, { color: colors.onSurfaceVariant }]}>{opt.sublabel}</Text>
                    </View>
                    {isActive && (
                        <Text style={[ms.checkmark, { color: colors.primary }]}>✓</Text>
                    )}
                </TouchableOpacity>
            </Animated.View>
            {!isLast && (
                <View style={[ms.separator, { backgroundColor: colors.outlineVariant }]} />
            )}
        </>
    );
}

// ── RSVP Button ───────────────────────────────────────────────────────────────

function RsvpButton({
    colors,
    eventId,
    isPublic,
    initialStatus,
    token,
    onParticipantCountChange,
    onStatusChange,
}: {
    colors: ReturnType<typeof useTheme>['colors'];
    eventId: string;
    isPublic: boolean;
    initialStatus: RsvpStatus;
    token: string | null;
    onParticipantCountChange: (delta: number) => void;
    onStatusChange: (status: RsvpStatus) => void;
}) {
    const router = useRouter();
    const [status, setStatus] = useState<RsvpStatus>(initialStatus);
    const [menuVisible, setMenuVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const scale = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const callRsvp = async (newStatus: Exclude<RsvpStatus, null>) => {
        if (!token) return;
        setLoading(true);
        try {
            await api.rsvpEvent(eventId, newStatus, token);
            if (newStatus === 'Accepted' && status !== 'Accepted') onParticipantCountChange(1);
            if (newStatus !== 'Accepted' && status === 'Accepted') onParticipantCountChange(-1);
            setStatus(newStatus);
            onStatusChange(newStatus);
        } catch (err: unknown) {
            let msg = 'RSVP konnte nicht gespeichert werden.';
            if (err instanceof Error) {
                const match = err.message.match(/\{.*\}/);
                if (match) {
                    try { msg = JSON.parse(match[0]).detail ?? msg; } catch {}
                }
            }
            Alert.alert('Fehler', msg);
        } finally {
            setLoading(false);
        }
    };

    const handlePress = () => {
        scale.value = withSequence(
            withTiming(0.94, { duration: 80 }),
            withSpring(1, { damping: 10, stiffness: 280 }),
        );
        if (!token) {
            router.navigate('/login');
            return;
        }
        if (isPublic) {
            callRsvp(status === 'Accepted' ? 'Declined' : 'Accepted');
        } else {
            setMenuVisible(true);
        }
    };

    const isAccepted = status === 'Accepted';
    const btnLabel = loading ? '...' : isPublic ? (isAccepted ? 'Absagen' : 'Zusagen') : 'RSVP';

    let btnBg: string;
    let btnBorder: string;
    let btnTextColor: string;

    if (isPublic) {
        btnBg = isAccepted ? 'transparent' : colors.primary;
        btnBorder = isAccepted ? colors.outline : 'transparent';
        btnTextColor = isAccepted ? colors.onSurface : colors.onPrimary;
    } else {
        btnBg = colors.primary;
        btnBorder = 'transparent';
        btnTextColor = colors.onPrimary;
    }

    return (
        <View>
            <Animated.View style={animStyle}>
                <TouchableOpacity
                    onPress={handlePress}
                    activeOpacity={0.9}
                    disabled={loading}
                    style={[
                        s.rsvpBtn,
                        { backgroundColor: btnBg, borderColor: btnBorder },
                    ]}
                >
                        <Text style={[s.rsvpBtnText, { color: btnTextColor }]}>{btnLabel}</Text>
                    </TouchableOpacity>
                </Animated.View>

            <RsvpMenu
                visible={menuVisible}
                current={status}
                onSelect={(s) => { callRsvp(s); }}
                onClose={() => setMenuVisible(false)}
                colors={colors}
            />
        </View>
    );
}

// ── Category chip ──────────────────────────────────────────────────────────────

function Chip({
    label,
    colors,
}: {
    label: string;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    return (
        <View
            style={[
                s.chip,
                {
                    backgroundColor: `${colors.primary}18`,
                    borderColor: `${colors.primary}30`,
                },
            ]}
        >
            <Text style={[s.chipText, { color: colors.primary }]}>{label}</Text>
        </View>
    );
}

// ── Info row ───────────────────────────────────────────────────────────────────

function InfoRow({
    icon,
    primary,
    secondary,
    colors,
}: {
    icon: React.ReactNode;
    primary: string;
    secondary?: string;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    return (
        <View style={s.infoRow}>
            <View style={[s.infoIconWrap, { backgroundColor: colors.surfaceContainer }]}>
                {icon}
            </View>
            <View style={s.infoText}>
                <Text style={[s.infoPrimary, { color: colors.onSurface }]}>{primary}</Text>
                {secondary && (
                    <Text style={[s.infoSecondary, { color: colors.onSurfaceVariant }]}>{secondary}</Text>
                )}
            </View>
        </View>
    );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function EventScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId: string }>();
    const { session, loading: authLoading } = useAuth();

    const [rawEvent, setRawEvent] = useState<EventDetailResponse | null>(null);
    const [event, setEvent] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    // Draft edit mode state
    const isDraft = rawEvent?.status === 'draft';
    const [editing, setEditing] = useState<EditSection>(null);
    const [editedSections, setEditedSections] = useState<Set<EditSection>>(new Set());
    const [tempData, setTempData] = useState<Record<string, string | boolean>>({});
    const [publishing, setPublishing] = useState(false);
    const [ticketOptions, setTicketOptions] = useState<TicketOption[]>([]);
    const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(null);

    // Auth guard: Wait for auth to load, then redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !session) {
            // Use setTimeout to avoid "navigate before mounting" error
            setTimeout(() => router.replace('/login'), 0);
        }
    }, [authLoading, session, router]);

    const fetchEvent = async () => {
        if (!eventId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const token = await getSession();
            const data = await api.getEventById(eventId, token ?? undefined);
            setRawEvent(data);
            setEvent(mapApiToEventData(data));
            setRsvpStatus((data.my_rsvp_status as RsvpStatus) ?? null);
        } catch {
            setRawEvent(null);
            setEvent(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEvent(); }, [eventId]);

    useEffect(() => {
        if (rawEvent?.ticket_options) {
            setTicketOptions(rawEvent.ticket_options);
        }
    }, [rawEvent]);

    if (authLoading || loading || !event || !rawEvent) {
        return (
            <View style={[s.root, { backgroundColor: colors.background }]}>
                <Navbar showBack />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    {(authLoading || loading) ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : (
                        <Text style={{ color: colors.onSurfaceVariant, fontSize: 15 }}>
                            Event nicht gefunden.
                        </Text>
                    )}
                </View>
            </View>
        );
    }

    const descriptionLines = event.description.split('\n\n');
    const shortDesc = descriptionLines[0];

    // ── Draft edit helpers ──

    const openEdit = (section: EditSection) => {
        setTempData({});
        setEditing(section);
    };

    const saveEdit = async () => {
        if (!eventId) return;
        const token = await getSession();
        if (!token) return;

        let patch: EventUpdateRequest = {};

        if (editing === 'title' && tempData.title !== undefined) {
            patch.title = tempData.title as string;
        } else if (editing === 'description' && tempData.description !== undefined) {
            patch.description = (tempData.description as string) || null;
        } else if (editing === 'datetime') {
            const date = (tempData.date as string) || rawEvent.starts_at.slice(0, 10);
            const time = (tempData.time as string) || rawEvent.starts_at.slice(11, 16);
            patch.starts_at = `${date}T${time}:00`;
            if (tempData.endDate && tempData.endTime) {
                patch.ends_at = `${tempData.endDate}T${tempData.endTime}:00`;
            }
        } else if (editing === 'location') {
            patch.location = {};
            if (tempData.city !== undefined) patch.location.city = tempData.city as string;
            if (tempData.street !== undefined) patch.location.street = (tempData.street as string) || undefined;
            if (tempData.houseNumber !== undefined) patch.location.house_number = (tempData.houseNumber as string) || undefined;
            if (tempData.postalCode !== undefined) patch.location.postal_code = (tempData.postalCode as string) || undefined;
            if (tempData.country !== undefined) patch.location.country = (tempData.country as string) || undefined;
        } else if (editing === 'category' && tempData.category !== undefined) {
            patch.category = (tempData.category as string) || null;
        } else if (editing === 'capacity') {
            if (tempData.maxCapacity !== undefined) {
                const n = Number(tempData.maxCapacity);
                patch.max_capacity = n > 0 ? n : null;
            }
            if (tempData.isPublic !== undefined) {
                patch.is_public = tempData.isPublic as boolean;
            }
        }

        if (Object.keys(patch).length > 0) {
            try {
                const updated = await api.updateEvent(eventId, patch, token);
                setRawEvent(updated);
                setEvent(mapApiToEventData(updated));
            } catch (err) {
                console.error('Event update failed:', err);
            }
        }

        setEditedSections((prev) => new Set(prev).add(editing));
        setEditing(null);
        setTempData({});
    };

    const handlePublish = async () => {
        if (!eventId) return;
        setPublishing(true);
        try {
            const token = await getSession();
            if (!token) return;
            const updated = await api.updateEvent(eventId, { status: 'published' }, token);
            setRawEvent(updated);
            setEvent(mapApiToEventData(updated));
        } catch { /* keep current state */ }
        finally { setPublishing(false); }
    };

    const handleSetFree = async () => {
        if (!eventId) return;
        const token = await getSession();
        if (!token) return;
        try {
            const updated = await api.updateEvent(eventId, { is_free: true }, token);
            setRawEvent(updated);
            setEvent(mapApiToEventData(updated));
            setTicketOptions([]);
            setEditedSections((prev) => new Set(prev).add('tickets'));
        } catch (err) { console.error('Set free failed:', err); }
        setEditing(null);
    };

    const handleSaveTickets = async () => {
        if (!eventId) return;
        const token = await getSession();
        if (!token) return;
        try {
            const saved = await api.syncTicketOptions(eventId, ticketOptions, token);
            setTicketOptions(saved);
            if (rawEvent.is_free) {
                const updated = await api.updateEvent(eventId, { is_free: false }, token);
                setRawEvent(updated);
                setEvent(mapApiToEventData(updated));
            } else {
                setRawEvent({ ...rawEvent, ticket_options: saved });
                setEvent(mapApiToEventData({ ...rawEvent, ticket_options: saved }));
            }
            setEditedSections((prev) => new Set(prev).add('tickets'));
        } catch (err) { console.error('Ticket save failed:', err); }
        setEditing(null);
    };

    const addTicketOption = () => {
        setTicketOptions((prev) => [
            ...prev,
            { name: '', description: '', price: 0, quantity_limit: null, sort_order: prev.length },
        ]);
    };

    const updateTicketOption = (index: number, field: keyof TicketOption, value: string | number | null) => {
        setTicketOptions((prev) => prev.map((opt, i) => i === index ? { ...opt, [field]: value } : opt));
    };

    const removeTicketOption = (index: number) => {
        setTicketOptions((prev) => prev.filter((_, i) => i !== index).map((opt, i) => ({ ...opt, sort_order: i })));
    };

    // Current values for edit modals
    const getVal = (key: string, fallback: string) => (tempData[key] as string) ?? fallback;

    // Derived display values for draft edit mode info blocks
    const timeSecondary = event.endDate
        ? `${event.time} – ${event.endDate === event.date ? event.endTime : `${event.endTime} (${event.endDate})`}`
        : event.time;
    const infoRows = [
        { icon: <CalendarIcon size={22} color={colors.onSurfaceVariant} />, primary: event.date, secondary: timeSecondary },
    ];
    const locationRows = [
        { icon: <LocationIcon size={22} color={colors.onSurfaceVariant} />, primary: event.location || 'Ort nicht gesetzt', secondary: event.locationDetail || undefined },
    ];
    const ticketRows = [
        { icon: <TicketIcon size={22} color={colors.onSurfaceVariant} />, primary: event.price, secondary: !rawEvent.is_free && ticketOptions.length > 0 ? `${ticketOptions.length} Ticket-Option${ticketOptions.length > 1 ? 'en' : ''}` : undefined },
    ];

    return (
        <View style={[s.root, { backgroundColor: colors.background }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <Navbar showBack />

            <ScrollView
                style={s.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scrollContent}
            >
                {/* ── Hero ── */}
                <EventHero
                    title={event.title}
                    subtitle={event.subtitle}
                    categories={event.categories}
                    imageUrl={event.heroImage || undefined}
                    editMode={isDraft}
                    edited={editedSections.has('title')}
                    onEdit={() => openEdit('title')}
                />

                {/* ── Card body ── */}
                <View style={[s.card, { backgroundColor: colors.background }]}>

                    {isDraft && (
                        <View style={es.previewBadge}>
                            <Text style={[es.previewBadgeText, { color: colors.tertiary }]}>
                                Entwurf
                            </Text>
                        </View>
                    )}

                    {/* Price + Attending + RSVP/Publish row */}
                    <View style={s.topActionRow}>
                        <View style={s.statsAndStatus}>
                            <View style={s.statsGroup}>
                                <View>
                                    <Text style={[s.statValue, { color: colors.onSurface }]}>{event.price}</Text>
                                    <Text style={[s.statLabel, { color: colors.onSurfaceVariant }]}>Eintritt</Text>
                                </View>
                                <View style={[s.statDivider, { backgroundColor: colors.outlineVariant }]} />
                                <View>
                                    <Text style={[s.statValue, { color: colors.onSurface }]}>{event.attending}</Text>
                                    <Text style={[s.statLabel, { color: colors.onSurfaceVariant }]}>Teilnehmer</Text>
                                </View>
                            </View>
                            {!isDraft && !rawEvent.is_host && rsvpStatus && (() => {
                                const pillColors = {
                                    Accepted: colors.tertiary,
                                    Declined: colors.error,
                                    Pending: colors.onSurfaceVariant,
                                };
                                const c = pillColors[rsvpStatus];
                                return (
                                    <View style={[s.statusPill, { backgroundColor: `${c}20` }]}>
                                        <Text style={[s.statusPillText, { color: c }]}>
                                            {RSVP_STATUS_LABELS[rsvpStatus]}
                                        </Text>
                                    </View>
                                );
                            })()}
                        </View>
                        {!isDraft && rawEvent.is_host ? (
                            <TouchableOpacity
                                onPress={() => router.push(`/event/${rawEvent.event_id}/manage`)}
                                style={[s.rsvpBtn, { backgroundColor: colors.secondaryContainer }]}
                            >
                                <Text style={[s.rsvpBtnText, { color: colors.onSecondaryContainer }]}>Verwalten</Text>
                            </TouchableOpacity>
                        ) : !isDraft && (
                            <RsvpButton
                                colors={colors}
                                eventId={rawEvent.event_id}
                                isPublic={rawEvent.is_public}
                                initialStatus={rawEvent.my_rsvp_status ?? null}
                                token={session?.access_token ?? null}
                                onParticipantCountChange={(delta) => {
                                    const updated = { ...rawEvent, participant_count: rawEvent.participant_count + delta };
                                    setRawEvent(updated);
                                    setEvent(mapApiToEventData(updated));
                                }}
                                onStatusChange={setRsvpStatus}
                            />
                        )}
                    </View>

                    <View style={[s.divider, { backgroundColor: colors.outlineVariant }]} />

                    {/* Date / Time / Location */}
                    {isDraft ? (
                        <>
                            <EventInfoBlock
                                rows={infoRows}
                                editMode
                                edited={editedSections.has('datetime')}
                                onEdit={() => openEdit('datetime')}
                            />
                            <EventInfoBlock
                                rows={locationRows}
                                editMode
                                edited={editedSections.has('location')}
                                onEdit={() => openEdit('location')}
                            />
                            <EventInfoBlock
                                rows={ticketRows}
                                editMode
                                edited={editedSections.has('tickets')}
                                onEdit={() => openEdit('tickets')}
                            />
                        </>
                    ) : (
                        <View style={s.infoBlock}>
                            <InfoRow icon={<CalendarIcon size={22} color={colors.onSurfaceVariant} />} primary={event.date} secondary={timeSecondary} colors={colors} />
                            <InfoRow icon={<LocationIcon size={22} color={colors.onSurfaceVariant} />} primary={event.location} secondary={event.locationDetail} colors={colors} />
                            <InfoRow icon={<TicketIcon size={22} color={colors.onSurfaceVariant} />} primary={event.price} secondary={event.capacity} colors={colors} />
                        </View>
                    )}

                    <View style={[s.divider, { backgroundColor: colors.outlineVariant }]} />

                    {/* Categories */}
                    {isDraft ? (
                        <EventCategories
                            categories={event.categories}
                            editMode
                            edited={editedSections.has('category')}
                            onEdit={() => openEdit('category')}
                        />
                    ) : (
                        <View style={s.section}>
                            <Text style={[s.sectionTitle, { color: colors.onSurface }]}>Kategorien</Text>
                            <View style={s.chipRow}>
                                {event.categories.map((cat) => (
                                    <Chip key={cat} label={cat} colors={colors} />
                                ))}
                            </View>
                        </View>
                    )}

                    <View style={[s.divider, { backgroundColor: colors.outlineVariant }]} />

                    {/* About */}
                    {isDraft ? (
                        <EventDescription
                            description={event.description}
                            editMode
                            edited={editedSections.has('description')}
                            onEdit={() => openEdit('description')}
                        />
                    ) : (
                        <View style={s.section}>
                            <Text style={[s.sectionTitle, { color: colors.onSurface }]}>Über dieses Event</Text>
                            <Text style={[s.description, { color: colors.onSurfaceVariant }]}>
                                {expanded ? event.description : shortDesc}
                            </Text>
                            <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
                                <Text style={[s.readMore, { color: colors.primary }]}>
                                    {expanded ? 'Weniger anzeigen' : 'Mehr lesen'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={[s.divider, { backgroundColor: colors.outlineVariant }]} />

                    {/* Settings (draft only) */}
                    {isDraft && (
                        <>
                            <View style={es.section}>
                                <View style={es.sectionHeader}>
                                    <Text style={[es.sectionTitle, { color: colors.onSurface }]}>Einstellungen</Text>
                                    <EditButton onPress={() => openEdit('capacity')} edited={editedSections.has('capacity')} />
                                </View>
                                <View style={es.settingsRow}>
                                    <View style={es.settingItem}>
                                        <Text style={[es.settingLabel, { color: colors.onSurfaceVariant }]}>Sichtbarkeit</Text>
                                        <Text style={[es.settingValue, { color: colors.onSurface }]}>
                                            {rawEvent.is_public ? 'Öffentlich' : 'Privat'}
                                        </Text>
                                    </View>
                                    <View style={es.settingItem}>
                                        <Text style={[es.settingLabel, { color: colors.onSurfaceVariant }]}>Kapazität</Text>
                                        <Text style={[es.settingValue, { color: colors.onSurface }]}>
                                            {rawEvent.max_capacity || 'Unbegrenzt'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <View style={[s.divider, { backgroundColor: colors.outlineVariant }]} />
                        </>
                    )}

                    {/* Line-up (published only) */}
                    {!isDraft && event.lineup.length > 0 && (
                        <>
                            <View style={s.section}>
                                <Text style={[s.sectionTitle, { color: colors.onSurface }]}>Line-up</Text>
                                <View style={s.lineupGrid}>
                                    {event.lineup.map((artist) => (
                                        <View
                                            key={artist}
                                            style={[
                                                s.lineupItem,
                                                {
                                                    backgroundColor: colors.surfaceContainerLow,
                                                    borderColor: colors.outlineVariant,
                                                },
                                            ]}
                                        >
                                            <View style={[s.lineupAccent, { backgroundColor: colors.primary }]} />
                                            <Text style={[s.lineupName, { color: colors.onSurface }]}>{artist}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                            <View style={[s.divider, { backgroundColor: colors.outlineVariant }]} />
                        </>
                    )}

                    {/* Host */}
                    <View style={s.section}>
                        <Text style={[s.sectionTitle, { color: colors.onSurface }]}>Veranstalter</Text>
                        <View
                            style={[
                                s.hostCard,
                                {
                                    backgroundColor: colors.surfaceContainerLow,
                                    borderColor: colors.outlineVariant,
                                },
                            ]}
                        >
                            {event.host.avatar ? (
                                <Image
                                    source={{ uri: event.host.avatar }}
                                    style={[s.hostAvatar, { borderColor: colors.primary }]}
                                />
                            ) : (
                                <View style={[s.hostAvatar, { borderColor: colors.primary, backgroundColor: colors.surfaceContainer }]} />
                            )}
                            <View style={s.hostInfo}>
                                <Text style={[s.hostName, { color: colors.onSurface }]}>{event.host.name}</Text>
                                <Text style={[s.hostRole, { color: colors.onSurfaceVariant }]}>
                                    {event.host.role}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Publish button (draft) */}
                    {isDraft && (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={[es.publishButton, { backgroundColor: colors.primary }, publishing && { opacity: 0.7 }]}
                            onPress={handlePublish}
                            disabled={publishing}
                        >
                            {publishing ? (
                                <ActivityIndicator color={colors.onPrimary} />
                            ) : (
                                <Text style={[es.publishButtonText, { color: colors.onPrimary }]}>
                                    Event veröffentlichen
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}

                    <Footer />
                    <View style={s.bottomSpacer} />
                </View>
            </ScrollView>

            {/* ── Edit Modals (draft only) ── */}
            {isDraft && (
                <>
                    <EditModal
                        visible={editing === 'title'}
                        onClose={() => setEditing(null)}
                        title="Titel bearbeiten"
                        onSave={saveEdit}
                    >
                        <TextInput
                            style={[es.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                            value={getVal('title', rawEvent.title)}
                            onChangeText={(v) => setTempData((p) => ({ ...p, title: v }))}
                            placeholder="Event-Titel"
                            placeholderTextColor={colors.onSurfaceVariant}
                            maxLength={255}
                            autoFocus
                        />
                    </EditModal>

                    <EditModal
                        visible={editing === 'description'}
                        onClose={() => setEditing(null)}
                        title="Beschreibung"
                        onSave={saveEdit}
                    >
                        <TextInput
                            style={[es.modalInput, es.modalInputMultiline, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                            value={getVal('description', rawEvent.description ?? '')}
                            onChangeText={(v) => setTempData((p) => ({ ...p, description: v }))}
                            placeholder="Beschreibe dein Event..."
                            placeholderTextColor={colors.onSurfaceVariant}
                            multiline
                            autoFocus
                        />
                    </EditModal>

                    <EditModal
                        visible={editing === 'datetime'}
                        onClose={() => setEditing(null)}
                        title="Datum & Uhrzeit"
                        onSave={saveEdit}
                    >
                        <View style={es.modalFieldGroup}>
                            <Text style={[es.modalLabel, { color: colors.onSurfaceVariant }]}>Beginn</Text>
                            <View style={[es.modalRow, { zIndex: 60 }]}>
                                <View style={es.modalHalf}>
                                    <DatePicker
                                        value={getVal('date', rawEvent.starts_at.slice(0, 10))}
                                        onChange={(v) => setTempData((p) => ({ ...p, date: v }))}
                                        minDate={new Date()}
                                    />
                                </View>
                                <View style={es.modalHalf}>
                                    <TimePicker
                                        value={getVal('time', rawEvent.starts_at.slice(11, 16))}
                                        onChange={(v) => setTempData((p) => ({ ...p, time: v }))}
                                    />
                                </View>
                            </View>
                        </View>
                        <View style={es.modalFieldGroup}>
                            <Text style={[es.modalLabel, { color: colors.onSurfaceVariant }]}>Ende (optional)</Text>
                            <View style={[es.modalRow, { zIndex: 50 }]}>
                                <View style={es.modalHalf}>
                                    <DatePicker
                                        value={getVal('endDate', rawEvent.ends_at?.slice(0, 10) ?? '')}
                                        onChange={(v) => setTempData((p) => ({ ...p, endDate: v }))}
                                        minDate={new Date()}
                                    />
                                </View>
                                <View style={es.modalHalf}>
                                    <TimePicker
                                        value={getVal('endTime', rawEvent.ends_at?.slice(11, 16) ?? '')}
                                        onChange={(v) => setTempData((p) => ({ ...p, endTime: v }))}
                                    />
                                </View>
                            </View>
                        </View>
                    </EditModal>

                    <EditModal
                        visible={editing === 'location'}
                        onClose={() => setEditing(null)}
                        title="Veranstaltungsort"
                        onSave={saveEdit}
                    >
                        <View style={es.modalFieldGroup}>
                            <Text style={[es.modalLabel, { color: colors.onSurfaceVariant }]}>Stadt</Text>
                            <TextInput
                                style={[es.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                                value={getVal('city', rawEvent.location?.city ?? '')}
                                onChangeText={(v) => setTempData((p) => ({ ...p, city: v }))}
                                placeholder="z.B. Berlin"
                                placeholderTextColor={colors.onSurfaceVariant}
                            />
                        </View>
                        <View style={es.modalRow}>
                            <View style={{ flex: 2 }}>
                                <Text style={[es.modalLabel, { color: colors.onSurfaceVariant }]}>Straße</Text>
                                <TextInput
                                    style={[es.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                                    value={getVal('street', rawEvent.location?.street ?? '')}
                                    onChangeText={(v) => setTempData((p) => ({ ...p, street: v }))}
                                    placeholder="Straßenname"
                                    placeholderTextColor={colors.onSurfaceVariant}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[es.modalLabel, { color: colors.onSurfaceVariant }]}>Nr.</Text>
                                <TextInput
                                    style={[es.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                                    value={getVal('houseNumber', rawEvent.location?.house_number ?? '')}
                                    onChangeText={(v) => setTempData((p) => ({ ...p, houseNumber: v }))}
                                    placeholder="Nr."
                                    placeholderTextColor={colors.onSurfaceVariant}
                                />
                            </View>
                        </View>
                        <View style={es.modalRow}>
                            <View style={es.modalHalf}>
                                <Text style={[es.modalLabel, { color: colors.onSurfaceVariant }]}>PLZ</Text>
                                <TextInput
                                    style={[es.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                                    value={getVal('postalCode', rawEvent.location?.postal_code ?? '')}
                                    onChangeText={(v) => setTempData((p) => ({ ...p, postalCode: v }))}
                                    placeholder="PLZ"
                                    placeholderTextColor={colors.onSurfaceVariant}
                                />
                            </View>
                            <View style={es.modalHalf}>
                                <Text style={[es.modalLabel, { color: colors.onSurfaceVariant }]}>Land</Text>
                                <TextInput
                                    style={[es.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                                    value={getVal('country', rawEvent.location?.country ?? '')}
                                    onChangeText={(v) => setTempData((p) => ({ ...p, country: v }))}
                                    placeholder="z.B. Deutschland"
                                    placeholderTextColor={colors.onSurfaceVariant}
                                />
                            </View>
                        </View>
                    </EditModal>

                    <EditModal
                        visible={editing === 'category'}
                        onClose={() => setEditing(null)}
                        title="Kategorien"
                        onSave={saveEdit}
                    >
                        <TextInput
                            style={[es.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                            value={getVal('category', rawEvent.category ?? '')}
                            onChangeText={(v) => setTempData((p) => ({ ...p, category: v }))}
                            placeholder="z.B. Musik, Sport, Kultur"
                            placeholderTextColor={colors.onSurfaceVariant}
                            autoFocus
                        />
                        <Text style={[es.modalHint, { color: colors.onSurfaceVariant }]}>
                            Mehrere Kategorien mit Komma trennen
                        </Text>
                    </EditModal>

                    <EditModal
                        visible={editing === 'capacity'}
                        onClose={() => setEditing(null)}
                        title="Kapazität & Sichtbarkeit"
                        onSave={saveEdit}
                    >
                        <View style={es.modalFieldGroup}>
                            <Text style={[es.modalLabel, { color: colors.onSurfaceVariant }]}>Max. Teilnehmer</Text>
                            <TextInput
                                style={[es.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                                value={getVal('maxCapacity', rawEvent.max_capacity?.toString() ?? '')}
                                onChangeText={(v) => setTempData((p) => ({ ...p, maxCapacity: v }))}
                                placeholder="Leer = Unbegrenzt"
                                placeholderTextColor={colors.onSurfaceVariant}
                                keyboardType="number-pad"
                            />
                        </View>
                        <View style={es.modalFieldGroup}>
                            <Text style={[es.modalLabel, { color: colors.onSurfaceVariant }]}>Sichtbarkeit</Text>
                            <View style={[es.toggleRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                                <View style={es.toggleText}>
                                    <Text style={[es.toggleLabel, { color: colors.onSurface }]}>
                                        {(tempData.isPublic ?? rawEvent.is_public) ? 'Öffentlich' : 'Privat'}
                                    </Text>
                                    <Text style={[es.toggleSub, { color: colors.onSurfaceVariant }]}>
                                        {(tempData.isPublic ?? rawEvent.is_public)
                                            ? 'Jeder kann dein Event sehen'
                                            : 'Nur mit Einladungslink'}
                                    </Text>
                                </View>
                                <Switch
                                    value={(tempData.isPublic as boolean | undefined) ?? rawEvent.is_public}
                                    onValueChange={(v) => setTempData((p) => ({ ...p, isPublic: v }))}
                                    trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
                                    thumbColor={colors.onPrimary}
                                />
                            </View>
                        </View>
                    </EditModal>

                    {/* Ticket Options Modal */}
                    <EditModal
                        visible={editing === 'tickets'}
                        onClose={() => {
                            setTicketOptions(rawEvent.ticket_options ?? []);
                            setEditing(null);
                        }}
                        title="Eintritt"
                        onSave={handleSaveTickets}
                    >
                        <TouchableOpacity
                            onPress={handleSetFree}
                            style={[es.freeButton, {
                                backgroundColor: rawEvent.is_free ? `${colors.primary}18` : colors.surfaceContainer,
                                borderColor: rawEvent.is_free ? colors.primary : colors.outlineVariant,
                            }]}
                            activeOpacity={0.7}
                        >
                            <Text style={[es.freeButtonText, { color: rawEvent.is_free ? colors.primary : colors.onSurface }]}>
                                Kostenlos
                            </Text>
                            {rawEvent.is_free && <Text style={{ color: colors.primary, fontWeight: '700' }}>✓</Text>}
                        </TouchableOpacity>

                        <View style={es.ticketDivider}>
                            <View style={[es.ticketDividerLine, { backgroundColor: colors.outlineVariant }]} />
                            <Text style={[es.ticketDividerText, { color: colors.onSurfaceVariant }]}>oder</Text>
                            <View style={[es.ticketDividerLine, { backgroundColor: colors.outlineVariant }]} />
                        </View>

                        {ticketOptions.map((opt, idx) => (
                            <View key={idx} style={[es.ticketCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                                <View style={es.ticketCardHeader}>
                                    <Text style={[es.ticketCardTitle, { color: colors.onSurface }]}>
                                        Ticket {idx + 1}
                                    </Text>
                                    <TouchableOpacity onPress={() => removeTicketOption(idx)} hitSlop={8}>
                                        <Text style={{ color: colors.error, fontSize: 18, fontWeight: '700' }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                                <TextInput
                                    style={[es.modalInput, { color: colors.onSurface, backgroundColor: colors.background, borderColor: colors.outlineVariant, marginBottom: 10 }]}
                                    value={opt.name}
                                    onChangeText={(v) => updateTicketOption(idx, 'name', v)}
                                    placeholder="Name (z.B. Early Bird)"
                                    placeholderTextColor={colors.onSurfaceVariant}
                                />
                                <TextInput
                                    style={[es.modalInput, { color: colors.onSurface, backgroundColor: colors.background, borderColor: colors.outlineVariant, marginBottom: 10 }]}
                                    value={opt.description ?? ''}
                                    onChangeText={(v) => updateTicketOption(idx, 'description', v || null)}
                                    placeholder="Beschreibung (optional)"
                                    placeholderTextColor={colors.onSurfaceVariant}
                                />
                                <View style={es.modalRow}>
                                    <View style={es.modalHalf}>
                                        <Text style={[es.modalLabel, { color: colors.onSurfaceVariant }]}>Preis (€)</Text>
                                        <TextInput
                                            style={[es.modalInput, { color: colors.onSurface, backgroundColor: colors.background, borderColor: colors.outlineVariant }]}
                                            value={opt.price > 0 ? opt.price.toString() : ''}
                                            onChangeText={(v) => updateTicketOption(idx, 'price', parseFloat(v) || 0)}
                                            placeholder="0.00"
                                            placeholderTextColor={colors.onSurfaceVariant}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                    <View style={es.modalHalf}>
                                        <Text style={[es.modalLabel, { color: colors.onSurfaceVariant }]}>Limit (optional)</Text>
                                        <TextInput
                                            style={[es.modalInput, { color: colors.onSurface, backgroundColor: colors.background, borderColor: colors.outlineVariant }]}
                                            value={opt.quantity_limit?.toString() ?? ''}
                                            onChangeText={(v) => updateTicketOption(idx, 'quantity_limit', v ? parseInt(v, 10) || null : null)}
                                            placeholder="Unbegrenzt"
                                            placeholderTextColor={colors.onSurfaceVariant}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity
                            onPress={addTicketOption}
                            style={[es.addTicketButton, { borderColor: colors.primary }]}
                            activeOpacity={0.7}
                        >
                            <Text style={[es.addTicketButtonText, { color: colors.primary }]}>+ Ticket-Option hinzufügen</Text>
                        </TouchableOpacity>
                    </EditModal>
                </>
            )}
        </View>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 0 },

    card: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
        paddingTop: 28,
        paddingHorizontal: 22,
        minHeight: 600,
    },

    topActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statsAndStatus: { gap: 10 },
    statsGroup: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    statValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
    statLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 1 },
    statDivider: { width: 1, height: 32, opacity: 0.4 },

    rsvpWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusPill: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 99,
        alignItems: 'center',
    },
    statusPillText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
    rsvpBtn: {
        paddingHorizontal: 22,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1.5,
        minWidth: 110,
        alignItems: 'center',
    },
    rsvpBtnText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },

    divider: { height: StyleSheet.hairlineWidth, marginBottom: 24, opacity: 0.5 },

    infoBlock: { gap: 16, marginBottom: 24 },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    infoIconWrap: {
        width: 40, height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    infoText: { flex: 1, justifyContent: 'center', paddingTop: 2 },
    infoPrimary: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
    infoSecondary: { fontSize: 13, marginTop: 2, lineHeight: 18 },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 14 },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
    chipText: { fontSize: 13, fontWeight: '600' },

    description: { fontSize: 15, lineHeight: 24, marginBottom: 10 },
    readMore: { fontSize: 14, fontWeight: '700' },

    lineupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    lineupItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        paddingVertical: 10,
        paddingRight: 14,
        paddingLeft: 0,
        overflow: 'hidden',
        gap: 10,
        minWidth: '46%',
        flex: 1,
    },
    lineupAccent: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
    lineupName: { fontSize: 14, fontWeight: '700' },

    hostCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        gap: 14,
    },
    hostAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2 },
    hostInfo: { flex: 1, gap: 3 },
    hostName: { fontSize: 15, fontWeight: '700' },
    hostRole: { fontSize: 13 },

    bottomSpacer: { height: 48 },
});

// ── Edit mode styles ──────────────────────────────────────────────────────────

const es = StyleSheet.create({
    previewBadge: {
        marginBottom: 16,
    },
    previewBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    settingsRow: {
        flexDirection: 'row',
        gap: 24,
    },
    settingItem: {
        flex: 1,
    },
    settingLabel: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 4,
    },
    settingValue: {
        fontSize: 15,
        fontWeight: '600',
    },
    publishButton: {
        marginBottom: 24,
        paddingVertical: 16,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    publishButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
    },
    modalInputMultiline: {
        minHeight: 120,
        textAlignVertical: 'top',
    },
    modalFieldGroup: {
        marginBottom: 16,
    },
    modalLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    modalRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    modalHalf: {
        flex: 1,
    },
    modalHint: {
        fontSize: 12,
        marginTop: 6,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    toggleText: {
        flex: 1,
        marginRight: 12,
    },
    toggleLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    toggleSub: {
        fontSize: 12,
        marginTop: 2,
    },
    freeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 8,
    },
    freeButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    ticketDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
    },
    ticketDividerLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
    },
    ticketDividerText: {
        marginHorizontal: 12,
        fontSize: 13,
        fontWeight: '500',
    },
    ticketCard: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
    },
    ticketCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    ticketCardTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    addTicketButton: {
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    addTicketButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
});

// ── RSVP Menu styles ───────────────────────────────────────────────────────────

const ms = StyleSheet.create({
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
        width: 36, height: 4,
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
        width: 44, height: 44,
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
