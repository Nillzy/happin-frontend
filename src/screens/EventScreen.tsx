import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Image,
    Platform,
    Modal,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { useRoute } from '@react-navigation/native';
import Navbar from '../components/atoms/Navbar';
import Footer from '../components/atoms/Footer';
import { api } from '../services/api';
import type { EventDetailResponse } from '../types/events';

// ── Types ──────────────────────────────────────────────────────────────────────

type RsvpStatus = 'going' | 'not_going' | 'maybe' | null;

const RSVP_OPTIONS: {
    status: Exclude<RsvpStatus, null>;
    icon: string;
    label: string;
    sublabel: string;
}[] = [
    { status: 'going',     icon: '✓', label: 'Zusagen',  sublabel: 'Ich bin dabei'             },
    { status: 'maybe',     icon: '~', label: 'Unsicher', sublabel: 'Vielleicht bin ich dabei'  },
    { status: 'not_going', icon: '✕', label: 'Absagen',  sublabel: 'Ich kann leider nicht'     },
];

// ── Mock data (fallback when no eventId is provided) ─────────────────────────

interface EventData {
    title: string;
    subtitle: string;
    heroImage: string;
    date: string;
    time: string;
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

const MOCK_EVENT: EventData = {
    title: 'Neon Horizon',
    subtitle: 'Electronic Music Festival',
    heroImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80',
    date: 'Samstag, 26. April 2026',
    time: '22:00 – 06:00 Uhr',
    location: 'Tresor, Berlin',
    locationDetail: 'Köpenicker Str. 70, 10179 Berlin',
    categories: ['Techno', 'Electronic', '18+', 'Indoor'],
    price: 'ab 18 €',
    capacity: '1.200 Plätze',
    attending: 847,
    description:
        'Eine Nacht, die unter die Haut geht. Neon Horizon bringt die besten Techno-Acts der Berliner Underground-Szene auf eine einzige Bühne — fünf Stunden Druckwellen, Nebel und Neonlicht.\n\nDas Line-up umfasst international renommierte DJs sowie lokale Talente, die zeigen, was Berliner Clubkultur ausmacht. Drei Floors, curated Sounds, keine Kompromisse.',
    host: {
        name: 'Tresor Berlin',
        role: 'Veranstalter',
        avatar: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=100&q=80',
        events: 312,
    },
    lineup: ['Paula Temple', 'Surgeon', 'Blawan', 'Phase Fatale'],
};

function mapApiToEventData(raw: EventDetailResponse): EventData {
    const d = new Date(raw.date);
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
        location: locationName,
        locationDetail,
        categories,
        price: 'Preis auf Anfrage',
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
}: {
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const [status, setStatus] = useState<RsvpStatus>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const scale = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
        scale.value = withSequence(
            withTiming(0.94, { duration: 80 }),
            withSpring(1, { damping: 10, stiffness: 280 }),
        );
        setMenuVisible(true);
    };

    const activeOpt = RSVP_OPTIONS.find((o) => o.status === status);

    const btnBg =
        status === 'going'
            ? colors.primary
            : status === null
            ? colors.primary
            : colors.surfaceContainerHigh;

    const btnBorder =
        status === 'maybe'
            ? `${colors.primary}60`
            : status === 'not_going'
            ? colors.outlineVariant
            : 'transparent';

    const btnTextColor =
        status === 'going' || status === null ? colors.onPrimary : colors.onSurfaceVariant;

    const btnLabel = activeOpt ? `${activeOpt.icon}  ${activeOpt.label}` : 'RSVP';

    return (
        <>
            <Animated.View style={animStyle}>
                <TouchableOpacity
                    onPress={handlePress}
                    activeOpacity={0.9}
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
                onSelect={setStatus}
                onClose={() => setMenuVisible(false)}
                colors={colors}
            />
        </>
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
    icon: string;
    primary: string;
    secondary?: string;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    return (
        <View style={s.infoRow}>
            <View style={[s.infoIconWrap, { backgroundColor: colors.surfaceContainer }]}>
                <Text style={s.infoIcon}>{icon}</Text>
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
    const route = useRoute<any>();
    const eventId = route.params?.eventId as number | undefined;

    const [event, setEvent] = useState<EventData>(MOCK_EVENT);
    const [loading, setLoading] = useState(!!eventId);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (!eventId) return;
        let cancelled = false;
        setLoading(true);
        api.getEventById(eventId)
            .then((data) => {
                if (!cancelled) setEvent(mapApiToEventData(data));
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [eventId]);

    const descriptionLines = event.description.split('\n\n');
    const shortDesc = descriptionLines[0];

    if (loading) {
        return (
            <View style={[s.root, { backgroundColor: colors.background }]}>
                <Navbar showBack />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

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
                <View style={s.heroContainer}>
                    <Image
                        source={{ uri: event.heroImage }}
                        style={s.heroImage}
                        resizeMode="cover"
                    />
                    <View style={s.heroOverlayTop} />
                    <View style={s.heroOverlayBottom} pointerEvents="none" />

                    {/* Hero title overlay */}
                    <View style={s.heroTitleBlock}>
                        <View style={s.heroChips}>
                            {event.categories.slice(0, 2).map((cat) => (
                                <View key={cat} style={s.heroBadge}>
                                    <Text style={s.heroBadgeText}>{cat}</Text>
                                </View>
                            ))}
                        </View>
                        <Text style={s.heroTitle}>{event.title}</Text>
                        <Text style={s.heroSubtitle}>{event.subtitle}</Text>
                    </View>
                </View>

                {/* ── Card body ── */}
                <View style={[s.card, { backgroundColor: colors.background }]}>

                    {/* Price + Attending + RSVP row */}
                    <View style={s.topActionRow}>
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
                        <RsvpButton colors={colors} />
                    </View>

                    <View style={[s.divider, { backgroundColor: colors.outlineVariant }]} />

                    {/* Date / Time / Location */}
                    <View style={s.infoBlock}>
                        <InfoRow icon="📅" primary={event.date} secondary={event.time} colors={colors} />
                        <InfoRow icon="📍" primary={event.location} secondary={event.locationDetail} colors={colors} />
                        <InfoRow icon="🎟" primary={event.price} secondary={`Kapazität: ${event.capacity}`} colors={colors} />
                    </View>

                    <View style={[s.divider, { backgroundColor: colors.outlineVariant }]} />

                    {/* Categories */}
                    <View style={s.section}>
                        <Text style={[s.sectionTitle, { color: colors.onSurface }]}>Kategorien</Text>
                        <View style={s.chipRow}>
                            {event.categories.map((cat) => (
                                <Chip key={cat} label={cat} colors={colors} />
                            ))}
                        </View>
                    </View>

                    <View style={[s.divider, { backgroundColor: colors.outlineVariant }]} />

                    {/* About */}
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

                    <View style={[s.divider, { backgroundColor: colors.outlineVariant }]} />

                    {/* Line-up */}
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
                            <Image
                                source={{ uri: event.host.avatar }}
                                style={[s.hostAvatar, { borderColor: colors.primary }]}
                            />
                            <View style={s.hostInfo}>
                                <Text style={[s.hostName, { color: colors.onSurface }]}>{event.host.name}</Text>
                                <Text style={[s.hostRole, { color: colors.onSurfaceVariant }]}>
                                    {event.host.role} · {event.host.events} Events
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={[
                                    s.followBtn,
                                    {
                                        borderColor: colors.primary,
                                        backgroundColor: `${colors.primary}14`,
                                    },
                                ]}
                                activeOpacity={0.8}
                            >
                                <Text style={[s.followBtnText, { color: colors.primary }]}>Folgen</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Footer />
                    <View style={s.bottomSpacer} />
                </View>
            </ScrollView>
        </View>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const HERO_HEIGHT = 380;

const s = StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 0 },

    heroContainer: {
        height: HERO_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    heroOverlayTop: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 120,
        backgroundColor: 'rgba(13,14,21,0.55)',
    },
    heroOverlayBottom: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 200,
        backgroundColor: 'rgba(13,14,21,0.85)',
    },
    heroTitleBlock: {
        position: 'absolute',
        bottom: 28, left: 22, right: 22,
    },
    heroChips: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    heroBadge: {
        backgroundColor: 'rgba(255,177,192,0.22)',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,177,192,0.35)',
    },
    heroBadgeText: {
        color: '#ffb1c0',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    heroTitle: {
        color: '#ffffff',
        fontSize: 38,
        fontWeight: '800',
        letterSpacing: -1,
        lineHeight: 44,
    },
    heroSubtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 15, marginTop: 4, fontWeight: '500' },

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
    statsGroup: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    statValue: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
    statLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 1 },
    statDivider: { width: 1, height: 32, opacity: 0.4 },

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
    infoIcon: { fontSize: 17 },
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
    followBtn: { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7 },
    followBtnText: { fontSize: 13, fontWeight: '700' },

    bottomSpacer: { height: 48 },
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
