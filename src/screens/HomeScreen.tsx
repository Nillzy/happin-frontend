import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Platform,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withRepeat,
    withSequence,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import Svg, {
    Rect,
    Path,
    Defs,
    LinearGradient as SvgLinearGradient,
    Stop,
} from 'react-native-svg';
import { MAP_PATHS_PRIMARY, MAP_PATHS_SECONDARY, MAP_PATHS_MINOR } from '@/constants/berlin-map-paths';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { getTimeBasedSlogan } from '../utils/getTimeBasedSlogan';
import Navbar from '../components/atoms/Navbar';
import Footer from '../components/atoms/Footer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const MAP_HEIGHT = 340;

// ── Static event data ──────────────────────────────────────────────────────────

const EVENTS = [
    {
        id: 0,
        title: 'Techno Night XL',
        venue: 'Berghain, Berlin',
        date: 'Sa, 26. Apr · 23:00',
        price: 'ab 12 €',
        color1: '#D4006B',
        color2: '#8B3DC8',
    },
    {
        id: 1,
        title: 'Neon Groove',
        venue: 'Tresor, Berlin',
        date: 'Fr, 25. Apr · 22:00',
        price: 'ab 15 €',
        color1: '#8B3DC8',
        color2: '#42dae2',
    },
    {
        id: 2,
        title: 'Jazz im Garten',
        venue: 'Tempodrom',
        date: 'So, 27. Apr · 19:00',
        price: 'Eintritt frei',
        color1: '#00677f',
        color2: '#8B3DC8',
    },
    {
        id: 3,
        title: 'Indie Sounds',
        venue: 'SO36, Berlin',
        date: 'Sa, 26. Apr · 21:00',
        price: 'ab 8 €',
        color1: '#FF6FA8',
        color2: '#D4006B',
    },
    {
        id: 4,
        title: 'Rave the City',
        venue: 'Arena Club',
        date: 'Fr, 25. Apr · 00:00',
        price: 'ab 18 €',
        color1: '#42dae2',
        color2: '#00677f',
    },
];

// ── Dot positions aligned to map intersections (% of width/height) ────────────

const DOT_POSITIONS = [
    { x: 0.13, y: 0.15 },
    { x: 0.31, y: 0.09 },
    { x: 0.52, y: 0.19 },
    { x: 0.68, y: 0.11 },
    { x: 0.84, y: 0.22 },
    { x: 0.09, y: 0.42 },
    { x: 0.24, y: 0.51 },
    { x: 0.41, y: 0.38 },
    { x: 0.58, y: 0.55 },
    { x: 0.73, y: 0.43 },
    { x: 0.90, y: 0.50 },
    { x: 0.16, y: 0.72 },
    { x: 0.34, y: 0.80 },
    { x: 0.51, y: 0.68 },
    { x: 0.67, y: 0.78 },
    { x: 0.83, y: 0.70 },
    { x: 0.44, y: 0.90 },
    { x: 0.76, y: 0.88 },
];

const DOT_COLORS = [
    '#FFB3CE', '#E0A8F8', '#42dae2', '#FFB3CE', '#E0A8F8',
    '#42dae2', '#FFB3CE', '#E0A8F8', '#42dae2', '#FFB3CE',
    '#E0A8F8', '#42dae2', '#FFB3CE', '#E0A8F8', '#42dae2',
    '#FFB3CE', '#E0A8F8', '#42dae2',
];

const FEATURES = [
    {
        icon: '🎵',
        title: 'Entdecke Events',
        description: 'Konzerte, Partys, Kultur – kuratiert für deinen Geschmack.',
    },
    {
        icon: '🎟️',
        title: 'Einfach buchen',
        description: 'Tickets in Sekunden. Keine Umwege, keine versteckten Gebühren.',
    },
    {
        icon: '👥',
        title: 'Mit Freunden',
        description: 'Teilt Events, verabredet euch, geht gemeinsam rein.',
    },
    {
        icon: '✨',
        title: 'Personalisiert',
        description: 'Je mehr du nutzt, desto besser trifft Happin deinen Vibe.',
    },
];

// ── PulsingDot ─────────────────────────────────────────────────────────────────

function PulsingDot({
                        color,
                        isActive,
                        delay,
                    }: {
    color: string;
    isActive: boolean;
    delay: number;
}) {
    const ringScale = useSharedValue(1);
    const ringOpacity = useSharedValue(0.6);
    const dotScale = useSharedValue(1);

    useEffect(() => {
        ringScale.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(2.4, { duration: 1400, easing: Easing.out(Easing.quad) }),
                    withTiming(1, { duration: 0 }),
                ),
                -1,
                false,
            ),
        );
        ringOpacity.value = withDelay(
            delay,
            withRepeat(
                withSequence(
                    withTiming(0, { duration: 1400, easing: Easing.out(Easing.quad) }),
                    withTiming(0.6, { duration: 0 }),
                ),
                -1,
                false,
            ),
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        dotScale.value = withSpring(isActive ? 2.2 : 1, {
            damping: 12,
            stiffness: 180,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive]);

    const ringStyle = useAnimatedStyle(() => ({
        transform: [{ scale: ringScale.value }],
        opacity: ringOpacity.value,
    }));

    const dotStyle = useAnimatedStyle(() => ({
        transform: [{ scale: dotScale.value }],
    }));

    return (
        <View style={styles.dotContainer}>
            <Animated.View
                style={[
                    styles.dotRing,
                    { borderColor: color },
                    ringStyle,
                ]}
            />
            <Animated.View
                style={[
                    styles.dotCore,
                    { backgroundColor: color },
                    dotStyle,
                ]}
            />
        </View>
    );
}

// ── EventCard ─────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: (typeof EVENTS)[0] }) {
    return (
        <View style={styles.eventCard}>
            <View
                style={[
                    styles.eventCardImage,
                    { backgroundColor: event.color1 },
                ]}
            >
                <View
                    style={[
                        styles.eventCardImageOverlay,
                        { backgroundColor: event.color2 },
                    ]}
                />
                <View style={styles.eventCardImageShimmer} />
            </View>
            <View style={styles.eventCardBody}>
                <Text style={styles.eventCardTitle} numberOfLines={1}>
                    {event.title}
                </Text>
                <Text style={styles.eventCardMeta} numberOfLines={1}>
                    📍 {event.venue}
                </Text>
                <Text style={styles.eventCardMeta} numberOfLines={1}>
                    🗓 {event.date}
                </Text>
                <View style={styles.eventCardFooter}>
                    <View style={styles.eventCardPriceBadge}>
                        <Text style={styles.eventCardPrice}>{event.price}</Text>
                    </View>
                    <View style={styles.eventCardBtn}>
                        <Text style={styles.eventCardBtnText}>Tickets</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

// ── SvgCityMap ────────────────────────────────────────────────────────────────
// Real OpenStreetMap street data for Berlin-Mitte, pre-projected to SVG coords.
// ViewBox 0 0 420 340, rendered into the map container at full width.

function SvgCityMap({ w }: { w: number }) {
    const H = MAP_HEIGHT;

    return (
        <Svg
            width={w}
            height={H}
            viewBox="0 0 420 340"
            preserveAspectRatio="xMidYMid slice"
        >
            <Defs>
                <SvgLinearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0.6" stopColor="#0d0e15" stopOpacity="0" />
                    <Stop offset="1" stopColor="#0d0e15" stopOpacity="1" />
                </SvgLinearGradient>
                <SvgLinearGradient id="fadeTop" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#0d0e15" stopOpacity="0.55" />
                    <Stop offset="0.25" stopColor="#0d0e15" stopOpacity="0" />
                </SvgLinearGradient>
                <SvgLinearGradient id="fadeLeft" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#0d0e15" stopOpacity="0.4" />
                    <Stop offset="0.15" stopColor="#0d0e15" stopOpacity="0" />
                </SvgLinearGradient>
                <SvgLinearGradient id="fadeRight" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0.85" stopColor="#0d0e15" stopOpacity="0" />
                    <Stop offset="1" stopColor="#0d0e15" stopOpacity="0.4" />
                </SvgLinearGradient>
            </Defs>

            {/* Background */}
            <Rect x={0} y={0} width={420} height={340} fill="#0d0e15" />

            {/* Streets — minor first so major roads render on top */}
            {MAP_PATHS_MINOR.map((d, i) => (
                <Path key={`m${i}`} d={d} stroke="#1e2030" strokeWidth={1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {MAP_PATHS_SECONDARY.map((d, i) => (
                <Path key={`s${i}`} d={d} stroke="#262840" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {MAP_PATHS_PRIMARY.map((d, i) => (
                <Path key={`p${i}`} d={d} stroke="#2e3050" strokeWidth={2.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}

            {/* Edge fades */}
            <Rect x={0} y={0} width={420} height={340} fill="url(#fadeBottom)" />
            <Rect x={0} y={0} width={420} height={340} fill="url(#fadeTop)" />
            <Rect x={0} y={0} width={420} height={340} fill="url(#fadeLeft)" />
            <Rect x={0} y={0} width={420} height={340} fill="url(#fadeRight)" />
        </Svg>
    );
}

// ── CityMap ───────────────────────────────────────────────────────────────────

function CityMap({ mapWidth }: { mapWidth: number }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [activeEvent, setActiveEvent] = useState(0);
    const cardOpacity = useSharedValue(0);
    const cardScale = useSharedValue(0.75);
    const cardTranslateY = useSharedValue(12);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cycleRef = useRef(0);

    const triggerNext = useCallback(() => {
        const nextDotIndex = (cycleRef.current * 3 + 2) % DOT_POSITIONS.length;
        const nextEventIndex = cycleRef.current % EVENTS.length;
        cycleRef.current += 1;

        setActiveIndex(nextDotIndex);
        setActiveEvent(nextEventIndex);

        cardOpacity.value = withSpring(1, { damping: 18, stiffness: 200 });
        cardScale.value = withSpring(1, { damping: 14, stiffness: 160 });
        cardTranslateY.value = withSpring(0, { damping: 14, stiffness: 160 });

        timerRef.current = setTimeout(() => {
            cardOpacity.value = withTiming(0, { duration: 400 });
            cardScale.value = withTiming(0.85, { duration: 400 });
            cardTranslateY.value = withTiming(8, { duration: 400 });

            timerRef.current = setTimeout(() => {
                setActiveIndex(null);
                timerRef.current = setTimeout(triggerNext, 800);
            }, 420);
        }, 2800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        timerRef.current = setTimeout(triggerNext, 1200);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [triggerNext]);

    const cardAnimStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [
            { scale: cardScale.value },
            { translateY: cardTranslateY.value },
        ],
    }));

    const activeDot = activeIndex !== null ? DOT_POSITIONS[activeIndex] : null;
    const cardWidth = Math.min(mapWidth * 0.62, 220);
    let cardLeft = activeDot ? activeDot.x * mapWidth - cardWidth / 2 : 0;
    cardLeft = Math.max(8, Math.min(cardLeft, mapWidth - cardWidth - 8));
    const cardTop = activeDot ? activeDot.y * MAP_HEIGHT - 170 : 0;
    const clampedCardTop = Math.max(8, cardTop);

    return (
        <View style={[styles.mapContainer, { width: mapWidth }]}>
            {/* SVG city map */}
            <SvgCityMap w={mapWidth} />

            {/* Animated dots overlaid on the SVG */}
            {DOT_POSITIONS.map((pos, i) => (
                <View
                    key={i}
                    style={[
                        styles.dotWrapper,
                        {
                            left: pos.x * mapWidth - 8,
                            top: pos.y * MAP_HEIGHT - 8,
                        },
                    ]}
                >
                    <PulsingDot
                        color={DOT_COLORS[i % DOT_COLORS.length]}
                        isActive={i === activeIndex}
                        delay={(i * 180) % 1200}
                    />
                </View>
            ))}

            {/* Event card popup */}
            {activeDot && (
                <Animated.View
                    style={[
                        styles.eventCardWrapper,
                        {
                            left: cardLeft,
                            top: clampedCardTop,
                            width: cardWidth,
                        },
                        cardAnimStyle,
                    ]}
                >
                    <EventCard event={EVENTS[activeEvent]} />
                </Animated.View>
            )}
        </View>
    );
}

// ── Landing Page ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
    const { colors } = useTheme();
    const [mapWidth, setMapWidth] = useState(SCREEN_WIDTH);
    const router = useRouter();
    const slogan = getTimeBasedSlogan();

    return (
        <ScrollView
            style={[styles.scroll, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
        >
            <Head><title>Happin</title></Head>
            {/* ── Nav ── */}
            <Navbar landingPage showNavItems={false} />

            {/* ── Hero: City Map ── */}
            <View
                style={styles.heroMap}
                onLayout={(e) => setMapWidth(e.nativeEvent.layout.width)}
            >
                {mapWidth > 0 && <CityMap mapWidth={mapWidth} />}
                {/* Top text overlay */}
                <View style={styles.heroOverlay} pointerEvents="none">
                    <View
                        style={[
                            styles.heroBadge,
                            { borderColor: `${colors.primary}33`, backgroundColor: `${colors.primary}18` },
                        ]}
                    >
                        <Text style={[styles.heroBadgeText, { color: colors.primary }]}>
                            ✦ Jetzt in Beta
                        </Text>
                    </View>
                </View>
            </View>

            {/* ── Headline Block ── */}
            <View style={styles.headline}>
                <Text style={[styles.headlineH1, { color: colors.onBackground }]}>
                    {slogan.firstLine}{'\n'}
                    <Text style={{ color: colors.primary }}>{slogan.secondLine}</Text>
                </Text>
                <Text style={[styles.headlineSub, { color: colors.onSurfaceVariant }]}>
                    Happin bringt dir die besten Events deiner Stadt –{'\n'}
                    personalisiert, social, direkt auf dein Handy.
                </Text>
                <View style={styles.headlineCtas}>
                    <TouchableOpacity
                        style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
                        onPress={() => router.push('/login')}
                    >
                        <Text style={[styles.btnPrimaryText, { color: colors.onPrimary }]}>
                            Kostenlos starten
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.btnSecondary, { borderColor: 'rgba(255,255,255,0.2)' }]}
                        onPress={() => router.push('/login')}>
                        <Text style={[styles.btnSecondaryText, { color: colors.onSurface }]}>
                            Mehr erfahren
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Stats row ── */}
            <View
                style={[
                    styles.statsRow,
                    {
                        borderTopColor: 'rgba(255,255,255,0.06)',
                        borderBottomColor: 'rgba(255,255,255,0.06)',
                    },
                ]}
            >
                {[
                    { value: '500+', label: 'Events / Monat' },
                    { value: '12 K', label: 'Aktive Nutzer' },
                    { value: '40+', label: 'Städte' },
                ].map((s, i) => (
                    <View key={i} style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.primary }]}>
                            {s.value}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>
                            {s.label}
                        </Text>
                    </View>
                ))}
            </View>

            {/* ── Features ── */}
            <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.tertiary }]}>
                    Was Happin kann
                </Text>
                <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                    Alles, was du brauchst
                </Text>
                <View style={styles.featureGrid}>
                    {FEATURES.map((f) => (
                        <View
                            key={f.title}
                            style={[
                                styles.featureCard,
                                {
                                    backgroundColor: colors.surfaceContainer,
                                    borderColor: 'rgba(255,255,255,0.07)',
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.featureAccent,
                                    { backgroundColor: colors.primary },
                                ]}
                            />
                            <Text style={styles.featureIcon}>{f.icon}</Text>
                            <Text style={[styles.featureTitle, { color: colors.onSurface }]}>
                                {f.title}
                            </Text>
                            <Text
                                style={[styles.featureDesc, { color: colors.onSurfaceVariant }]}
                            >
                                {f.description}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* ── CTA Banner ── */}
            <View
                style={[
                    styles.ctaBanner,
                    {
                        backgroundColor: colors.surfaceContainer,
                        borderColor: `${colors.primary}30`,
                    },
                ]}
            >
                <View
                    style={[styles.ctaAccent, { backgroundColor: colors.primary }]}
                />
                <Text style={[styles.ctaTitle, { color: colors.onSurface }]}>
                    Bereit für deinen{'\n'}nächsten Abend?
                </Text>
                <Text style={[styles.ctaSub, { color: colors.onSurfaceVariant }]}>
                    Kostenlos registrieren und sofort die besten Events in deiner Stadt entdecken.
                </Text>
                <TouchableOpacity
                    style={[styles.btnPrimary, styles.btnPrimaryLg, { backgroundColor: colors.primary }]}
                >
                    <Text style={[styles.btnPrimaryText, { color: colors.onPrimary }]}>
                        Jetzt loslegen
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── Footer ── */}
            <Footer />
        </ScrollView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    container: { flexGrow: 1 },

    // Hero Map
    heroMap: {
        width: '100%',
        height: MAP_HEIGHT,
        overflow: 'hidden',
        backgroundColor: '#0d0e15',
    },
    heroOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: 20,
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
    },
    heroBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
    },
    heroBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6,
    },

    // City map internals
    mapContainer: {
        height: MAP_HEIGHT,
        backgroundColor: '#0d0e15',
        position: 'relative',
        overflow: 'hidden',
    },
    dotWrapper: {
        position: 'absolute',
        width: 16,
        height: 16,
    },
    dotContainer: {
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dotRing: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1.5,
    },
    dotCore: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    eventCardWrapper: {
        position: 'absolute',
        zIndex: 10,
    },

    // Event card
    eventCard: {
        backgroundColor: '#1e1f26',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 12,
    },
    eventCardImage: {
        width: '100%',
        height: 80,
        overflow: 'hidden',
    },
    eventCardImageOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '60%',
        opacity: 0.5,
    },
    eventCardImageShimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    eventCardBody: {
        padding: 10,
        gap: 3,
    },
    eventCardTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#e3e1ec',
        marginBottom: 2,
    },
    eventCardMeta: {
        fontSize: 11,
        color: '#a7898e',
        lineHeight: 16,
    },
    eventCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    eventCardPriceBadge: {
        backgroundColor: 'rgba(255,177,192,0.12)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,177,192,0.2)',
    },
    eventCardPrice: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFB3CE',
    },
    eventCardBtn: {
        backgroundColor: '#D4006B',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    eventCardBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },

    // Headline
    headline: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 32,
    },
    headlineH1: {
        fontSize: isWeb ? 52 : 42,
        fontWeight: '800',
        letterSpacing: -1.5,
        lineHeight: isWeb ? 60 : 50,
        marginBottom: 16,
    },
    headlineSub: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 28,
    },
    headlineCtas: {
        flexDirection: 'row',
        gap: 12,
        flexWrap: 'wrap',
    },

    // Stats
    statsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        paddingVertical: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.2,
    },

    // Features
    section: {
        paddingHorizontal: 24,
        paddingVertical: 48,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 24,
    },
    featureGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    featureCard: {
        borderRadius: 14,
        padding: 18,
        borderWidth: 1,
        overflow: 'hidden',
        width: isWeb ? ('calc(50% - 6px)' as any) : (SCREEN_WIDTH - 60) / 2,
        minWidth: 140,
    },
    featureAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        opacity: 0.55,
    },
    featureIcon: {
        fontSize: 22,
        marginBottom: 8,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 5,
    },
    featureDesc: {
        fontSize: 12,
        lineHeight: 18,
    },

    // CTA
    ctaBanner: {
        marginHorizontal: 24,
        marginBottom: 48,
        borderRadius: 20,
        padding: 32,
        borderWidth: 1,
        overflow: 'hidden',
        alignItems: 'flex-start',
    },
    ctaAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        opacity: 0.7,
    },
    ctaTitle: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 10,
        lineHeight: 32,
    },
    ctaSub: {
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 24,
    },

    // Buttons
    btnPrimary: {
        paddingHorizontal: 22,
        paddingVertical: 13,
        borderRadius: 10,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnPrimaryLg: {
        paddingHorizontal: 28,
        paddingVertical: 15,
    },
    btnPrimaryText: {
        fontSize: 15,
        fontWeight: '700',
    },
    btnSecondary: {
        paddingHorizontal: 22,
        paddingVertical: 13,
        borderRadius: 10,
        borderWidth: 1,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnSecondaryText: {
        fontSize: 15,
        fontWeight: '600',
    },

});
