import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Share,
    Modal,
    Pressable,
    Image,
    useWindowDimensions,
    Linking,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import { getGradientByIndex } from '../constants/gradients';
import { SkeletonBox } from '../components/atoms/SkeletonBox';
import type { EventDetailResponse, CustomField } from '../types/events';
import type { Participant, ParticipantCounts, TicketOptionSummary } from '../types/host';

// ── QR Code SVG Icon ─────────────────────────────────────────────────────────

function QrCodeIcon({ size = 28, color = '#fff' }: { size?: number; color?: string }) {
    const s = size;
    const u = s / 7; // unit = 1 cell out of 7
    return (
        <View style={{ width: s, height: s }}>
            {/* Top-left finder pattern */}
            <View style={{ position: 'absolute', left: 0, top: 0, width: u * 3, height: u * 3, borderWidth: u * 0.5, borderColor: color, borderRadius: u * 0.4 }} />
            <View style={{ position: 'absolute', left: u, top: u, width: u, height: u, backgroundColor: color, borderRadius: u * 0.2 }} />
            {/* Top-right finder pattern */}
            <View style={{ position: 'absolute', right: 0, top: 0, width: u * 3, height: u * 3, borderWidth: u * 0.5, borderColor: color, borderRadius: u * 0.4 }} />
            <View style={{ position: 'absolute', right: u, top: u, width: u, height: u, backgroundColor: color, borderRadius: u * 0.2 }} />
            {/* Bottom-left finder pattern */}
            <View style={{ position: 'absolute', left: 0, bottom: 0, width: u * 3, height: u * 3, borderWidth: u * 0.5, borderColor: color, borderRadius: u * 0.4 }} />
            <View style={{ position: 'absolute', left: u, bottom: u, width: u, height: u, backgroundColor: color, borderRadius: u * 0.2 }} />
            {/* Data dots (simplified) */}
            <View style={{ position: 'absolute', right: u * 0.5, top: u * 3.5, width: u * 0.8, height: u * 0.8, backgroundColor: color, borderRadius: u * 0.15 }} />
            <View style={{ position: 'absolute', right: u * 1.8, top: u * 3.5, width: u * 0.8, height: u * 0.8, backgroundColor: color, borderRadius: u * 0.15 }} />
            <View style={{ position: 'absolute', right: u * 0.5, top: u * 4.7, width: u * 0.8, height: u * 0.8, backgroundColor: color, borderRadius: u * 0.15 }} />
            <View style={{ position: 'absolute', right: u * 1.8, top: u * 5.6, width: u * 0.8, height: u * 0.8, backgroundColor: color, borderRadius: u * 0.15 }} />
            <View style={{ position: 'absolute', left: u * 3.5, top: u * 3.5, width: u * 0.8, height: u * 0.8, backgroundColor: color, borderRadius: u * 0.15 }} />
            <View style={{ position: 'absolute', left: u * 4.7, top: u * 4.7, width: u * 0.8, height: u * 0.8, backgroundColor: color, borderRadius: u * 0.15 }} />
            <View style={{ position: 'absolute', left: u * 3.5, top: u * 5.6, width: u * 0.8, height: u * 0.8, backgroundColor: color, borderRadius: u * 0.15 }} />
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function EventHostScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId: string }>();
    const { width: windowWidth } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isDesktop = isWeb && windowWidth >= 768;

    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [counts, setCounts] = useState<ParticipantCounts>({ accepted: 0, declined: 0, pending: 0 });
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [ticketOptionSummary, setTicketOptionSummary] = useState<TicketOptionSummary[]>([]);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteConfirmed, setDeleteConfirmed] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    const loadData = async () => {
        if (!eventId) return;

        try {
            setLoading(true);
            setError(null);

            const token = await getSession();
            if (!token) {
                router.replace('/login');
                return;
            }

            const [eventData, participantData] = await Promise.all([
                api.getEventById(eventId, token),
                api.getEventParticipants(eventId, token),
            ]);

            setEvent(eventData);
            setCounts(participantData.counts);
            setParticipants(participantData.participants);
            setTicketOptionSummary(participantData.ticket_option_summary ?? []);
            setCustomFields(eventData.custom_fields ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (isoDate: string) => {
        const d = new Date(isoDate);
        return new Intl.DateTimeFormat('de-DE', {
            weekday: 'short',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(d) + ' Uhr';
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.push('/');
        }
    };

    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    const bgColor = isDark ? 'rgba(18,19,26,0.92)' : 'rgba(255,255,255,0.92)';

    if (loading) {
        return (
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
                </TouchableOpacity>
                {isDesktop ? (
                    <View style={styles.desktopLayout}>
                        {/* Left: hero placeholder */}
                        <View style={[styles.desktopLeft, { backgroundColor: colors.surfaceContainer, borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
                            <SkeletonBox height={'100%' as any} borderRadius={0} />
                        </View>
                        {/* Right: content placeholders */}
                        <View style={[styles.desktopRight, { padding: 24, gap: 16 }]}>
                            <SkeletonBox height={120} borderRadius={20} />
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} height={72} borderRadius={12} style={{ flex: 1 }} />)}
                            </View>
                            <SkeletonBox height={80} borderRadius={16} />
                            <SkeletonBox height={60} borderRadius={16} />
                        </View>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
                        {/* Hero placeholder */}
                        <SkeletonBox height={300} borderRadius={0} style={{ marginBottom: 16 }} />
                        <View style={{ paddingHorizontal: 16, gap: 12 }}>
                            <SkeletonBox height={120} borderRadius={20} />
                            <SkeletonBox height={60} borderRadius={20} />
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {Array.from({ length: 3 }).map((_, i) => <SkeletonBox key={i} height={72} borderRadius={12} style={{ flex: 1 }} />)}
                            </View>
                        </View>
                    </ScrollView>
                )}
            </View>
        );
    }

    if (error || !event) {
        return (
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
                </TouchableOpacity>
                <View style={styles.centered}>
                    <Text style={[styles.errorText, { color: colors.error }]}>
                        {error || 'Event nicht gefunden'}
                    </Text>
                    <TouchableOpacity onPress={loadData} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.retryBtnText, { color: colors.onPrimary }]}>Erneut versuchen</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const handleShare = async () => {
        const link = `https://happin.fun/event/${eventId}`;
        const formattedDate = event ? new Intl.DateTimeFormat('de-DE', {
            day: 'numeric', month: 'long', year: 'numeric',
        }).format(new Date(event.starts_at)) : '';
        const shareMessage = event
            ? `Hey, hast du schon von meinem Event gehört? 🎉\n\n"${event.title}" findet am ${formattedDate} statt – ich würde mich freuen, dich dort zu sehen!\n\n${link}`
            : link;
        try {
            await Share.share({ message: shareMessage });
        } catch {
            // cancelled
        }
    };

    const handleDelete = async () => {
        if (!eventId || !deleteConfirmed) return;
        try {
            setDeleting(true);
            const token = await getSession();
            if (!token) return;
            await api.deleteEvent(eventId, token);
            setDeleteModalVisible(false);
            router.replace('/my-events');
        } catch {
            setDeleting(false);
            setDeleteModalVisible(false);
            setError('Event konnte nicht gelöscht werden. Bitte versuche es erneut.');
        }
    };

    const canDelete = event && !event.is_deleted
        ? (new Date(event.starts_at).getTime() - Date.now()) >= 48 * 60 * 60 * 1000
        : false;

    const scanButton = (
        <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/event/${eventId}/scan`)}
            activeOpacity={0.85}
        >
            <Text style={[styles.scanButtonText, { color: colors.onPrimary }]}>Tickets scannen</Text>
            <QrCodeIcon size={26} color={colors.onPrimary} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <Head><title>{event.title} – Happin</title></Head>
            {/* Back button – always top-left */}
            <TouchableOpacity
                style={[
                    styles.backButton,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
                ]}
                onPress={handleBack}
            >
                <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
            </TouchableOpacity>

            {isDesktop ? (
                // ── Desktop layout ───────────────────────────────────────────
                // Left panel: sticky event hero. Right panel: scrollable content + sticky scan bar.
                <View style={styles.desktopLayout}>
                    {/* Left: sticky hero panel */}
                    <View style={[styles.desktopLeft, { backgroundColor: colors.surfaceContainer, borderRightColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }]}>
                        <DesktopHeroPanel
                            event={event}
                            formatDate={formatDate}
                            colors={colors}
                        />
                    </View>

                    {/* Right: scrollable content + sticky scan button at bottom */}
                    <View style={styles.desktopRight}>
                        <ScrollView
                            style={styles.desktopScroll}
                            contentContainerStyle={styles.desktopScrollContent}
                        >
                            <OverviewContent
                                counts={counts}
                                maxCapacity={event.max_capacity}
                                colors={colors}
                                isDark={isDark}
                                isWeb={isWeb}
                                eventId={eventId!}
                                participants={participants}
                                customFields={customFields}
                                ticketOptionSummary={ticketOptionSummary}
                                isDesktop
                                onShare={handleShare}
                                onDeletePress={() => setDeleteModalVisible(true)}
                                canDelete={canDelete}
                                isDeleted={event.is_deleted === true}
                            />
                        </ScrollView>
                        <View style={[styles.desktopStickyBar, { borderTopColor: borderColor, backgroundColor: bgColor }]}>
                            {scanButton}
                        </View>
                    </View>
                </View>
            ) : (
                // ── Mobile layout ────────────────────────────────────────────
                <>
                    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                        <HeaderCard
                            event={event}
                            formatDate={formatDate}
                        />
                        <OverviewContent
                            counts={counts}
                            maxCapacity={event.max_capacity}
                            colors={colors}
                            isDark={isDark}
                            isWeb={isWeb}
                            eventId={eventId!}
                            participants={participants}
                            customFields={customFields}
                            ticketOptionSummary={ticketOptionSummary}
                            onShare={handleShare}
                            onDeletePress={() => setDeleteModalVisible(true)}
                            canDelete={canDelete}
                            isDeleted={event.is_deleted === true}
                        />
                    </ScrollView>
                    {/* Mobile sticky bottom bar */}
                    <View
                        style={[
                            styles.mobileStickyBar,
                            {
                                borderTopColor: colors.outlineVariant,
                                backgroundColor: colors.surface,
                            },
                        ]}
                    >
                        {scanButton}
                    </View>
                </>
            )}
            {/* Delete Confirmation Modal */}
            <Modal
                visible={deleteModalVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setDeleteModalVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setDeleteModalVisible(false)}
                >
                    <Pressable
                        style={[styles.deleteModalCard, { backgroundColor: colors.surface }]}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={[styles.deleteModalIconWrap, { backgroundColor: 'rgba(255,59,48,0.1)' }]}>
                            <Ionicons name="trash-outline" size={28} color="#FF3B30" />
                        </View>
                        <Text style={[styles.deleteModalTitle, { color: colors.onSurface }]}>
                            Event löschen?
                        </Text>
                        <Text style={[styles.deleteModalBody, { color: colors.onSurfaceVariant }]}>
                            Diese Aktion kann nicht rückgängig gemacht werden. Teilnehmer sehen das Event noch 48 Stunden lang als abgesagt.
                        </Text>
                        <TouchableOpacity
                            style={styles.deleteModalCheckRow}
                            onPress={() => setDeleteConfirmed(v => !v)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.checkbox,
                                { borderColor: colors.outline },
                                deleteConfirmed && { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
                            ]}>
                                {deleteConfirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
                            </View>
                            <Text style={[styles.deleteModalCheckLabel, { color: colors.onSurface }]}>
                                Ich verstehe, dass das Event unwiderruflich gelöscht wird
                            </Text>
                        </TouchableOpacity>
                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity
                                style={[styles.deleteModalBtn, { backgroundColor: colors.surfaceContainerHigh }]}
                                onPress={() => { setDeleteModalVisible(false); setDeleteConfirmed(false); }}
                            >
                                <Text style={[styles.deleteModalBtnText, { color: colors.onSurface }]}>
                                    Abbrechen
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.deleteModalBtn,
                                    styles.deleteModalBtnDestructive,
                                    (!deleteConfirmed || deleting) && styles.deleteModalBtnDisabled,
                                ]}
                                onPress={handleDelete}
                                disabled={!deleteConfirmed || deleting}
                            >
                                <Text style={[styles.deleteModalBtnText, { color: '#fff' }]}>
                                    {deleting ? 'Wird gelöscht…' : 'Endgültig löschen'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

// ── Desktop Hero Panel (left sticky column) ───────────────────────────────────

function DesktopHeroPanel({
    event,
    formatDate,
    colors,
}: {
    event: EventDetailResponse;
    formatDate: (d: string) => string;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const locationText = event.location
        ? [event.location.street, event.location.house_number, event.location.city]
              .filter(Boolean).join(' ') || event.location.city || null
        : null;

    const textOverlay = (
        <View style={heroStyles.overlay}>
            <Text style={heroStyles.overlayLabel}>Dein Event</Text>
            <Text style={heroStyles.overlayTitle}>{event.title}</Text>
            <Text style={heroStyles.overlayDate}>{formatDate(event.starts_at)}</Text>
            {locationText && (
                <View style={heroStyles.overlayLocation}>
                    <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
                    <Text style={heroStyles.overlayLocationText} numberOfLines={1}>{locationText}</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={heroStyles.root}>
            {event.image_url ? (
                <>
                    <Image source={{ uri: event.image_url }} style={heroStyles.image} resizeMode="cover" />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.80)']}
                        style={heroStyles.gradient}
                    />
                </>
            ) : (
                <>
                    <LinearGradient
                        colors={getGradientByIndex(event.gradient_id ?? 0)}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={heroStyles.image}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.65)']}
                        style={heroStyles.gradient}
                    />
                </>
            )}
            {textOverlay}
        </View>
    );
}

const heroStyles = StyleSheet.create({
    root: { flex: 1, position: 'relative', overflow: 'hidden' },
    image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    gradient: { ...StyleSheet.absoluteFillObject },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        paddingBottom: 28,
    },
    overlayLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: 'rgba(255,255,255,0.65)',
        marginBottom: 6,
    },
    overlayTitle: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.4,
        color: '#fff',
        lineHeight: 30,
        marginBottom: 6,
    },
    overlayDate: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.78)',
        lineHeight: 20,
    },
    overlayLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    overlayLocationText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.65)',
        flex: 1,
    },
});

// ── Mobile Hero Header ────────────────────────────────────────────────────────

function HeaderCard({
    event,
    formatDate,
}: {
    event: EventDetailResponse;
    formatDate: (d: string) => string;
}) {
    return (
        <View style={mobileHeroStyles.root}>
            <View style={mobileHeroStyles.imageWrapper}>
                {event.image_url ? (
                    <Image
                        source={{ uri: event.image_url }}
                        style={mobileHeroStyles.image}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient
                        colors={getGradientByIndex(event.gradient_id ?? 0)}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={mobileHeroStyles.image}
                    />
                )}
                <LinearGradient
                    colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.72)']}
                    locations={[0.35, 1]}
                    style={mobileHeroStyles.gradient}
                />
                <View style={mobileHeroStyles.overlay}>
                    <Text style={mobileHeroStyles.overlayLabel}>Dein Event</Text>
                    <Text style={mobileHeroStyles.overlayTitle} numberOfLines={3}>{event.title}</Text>
                    <Text style={mobileHeroStyles.overlayDate}>{formatDate(event.starts_at)}</Text>
                </View>
            </View>
        </View>
    );
}

const mobileHeroStyles = StyleSheet.create({
    root: { marginBottom: 16 },
    imageWrapper: {
        width: '100%',
        aspectRatio: 4 / 3,
        overflow: 'hidden',
    },
    image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    gradient: { ...StyleSheet.absoluteFillObject },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 24,
    },
    overlayLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 4,
    },
    overlayTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.4,
        color: '#fff',
        lineHeight: 28,
    },
    overlayDate: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 6,
    },
});

// ── Stripe Connect Section ───────────────────────────────────────────────────

function StripeConnectSection({ eventId, colors, isDark, isDesktop }: {
    eventId: string;
    colors: ReturnType<typeof useTheme>['colors'];
    isDark: boolean;
    isDesktop?: boolean;
}) {
    const [status, setStatus] = useState<{
        has_account: boolean; charges_enabled: boolean; payouts_enabled: boolean; onboarding_complete: boolean;
    } | null>(null);
    const [summary, setSummary] = useState<{
        gross_cents: number; platform_fee_cents: number; net_cents: number; paid_orders: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        void loadStatus();
    }, []);

    const loadStatus = async () => {
        const token = await getSession();
        if (!token) return;
        try {
            const [s, p] = await Promise.all([
                api.getConnectStatus(token),
                api.getPaymentSummary(eventId, token).catch(() => null),
            ]);
            setStatus(s);
            if (p) setSummary(p);
        } catch { /* ignore */ }
    };

    const handleOnboarding = async () => {
        setLoading(true);
        try {
            const token = await getSession();
            if (!token) return;
            const { url } = await api.createOnboardingLink(token, eventId);
            Linking.openURL(url);
        } catch (err: any) {
            Alert.alert('Fehler', err?.message ?? 'Onboarding konnte nicht gestartet werden.');
        } finally {
            setLoading(false);
        }
    };

    const handleDashboard = async () => {
        try {
            const token = await getSession();
            if (!token) return;
            const { url } = await api.createDashboardLink(token);
            Linking.openURL(url);
        } catch (err: any) {
            Alert.alert('Fehler', err?.message ?? 'Dashboard nicht verfügbar.');
        }
    };

    const handlePayout = async () => {
        setLoading(true);
        try {
            const token = await getSession();
            if (!token) return;
            const result = await api.requestPayout(eventId, token);
            Alert.alert('Auszahlung', `${(result.amount_cents / 100).toFixed(2)} € wird ausgezahlt.`);
            void loadStatus();
        } catch (err: any) {
            Alert.alert('Fehler', err?.message ?? 'Auszahlung fehlgeschlagen.');
        } finally {
            setLoading(false);
        }
    };

    if (!status) return null;

    const formatEur = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' €';

    return (
        <View style={[
            connectStyles.container,
            { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant },
            isDesktop && { padding: 20 },
        ]}>
            <Text style={[connectStyles.title, { color: colors.onSurface }]}>Zahlungen</Text>

            {!status.has_account ? (
                <>
                    <Text style={[connectStyles.hint, { color: colors.outline }]}>
                        Richte dein Zahlungskonto ein, um Ticketeinnahmen zu erhalten.
                    </Text>
                    <TouchableOpacity
                        style={[connectStyles.button, { backgroundColor: colors.primary }]}
                        onPress={handleOnboarding}
                        disabled={loading}
                    >
                        <Ionicons name="card-outline" size={18} color={colors.onPrimary} style={{ marginRight: 8 }} />
                        <Text style={[connectStyles.buttonText, { color: colors.onPrimary }]}>
                            {loading ? 'Wird geladen…' : 'Zahlungen einrichten'}
                        </Text>
                    </TouchableOpacity>
                </>
            ) : !status.charges_enabled ? (
                <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="time-outline" size={18} color={colors.tertiary} style={{ marginRight: 8 }} />
                        <Text style={[connectStyles.hint, { color: colors.tertiary, marginBottom: 0 }]}>
                            Konto verbunden – Verifizierung ausstehend
                        </Text>
                    </View>
                    <Text style={[connectStyles.hint, { color: colors.outline, fontSize: 13 }]}>
                        Stripe prüft deine Angaben. Dies kann wenige Minuten dauern.
                    </Text>
                    <TouchableOpacity
                        style={[connectStyles.button, { backgroundColor: colors.surfaceContainerHigh || colors.surface }]}
                        onPress={loadStatus}
                    >
                        <Ionicons name="refresh-outline" size={18} color={colors.onSurface} style={{ marginRight: 8 }} />
                        <Text style={[connectStyles.buttonText, { color: colors.onSurface }]}>
                            Status aktualisieren
                        </Text>
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={{ marginRight: 8 }} />
                        <Text style={[connectStyles.hint, { color: '#4CAF50', marginBottom: 0, fontWeight: '600' }]}>
                            Stripe-Konto erfolgreich verbunden
                        </Text>
                    </View>
                    {summary && summary.paid_orders > 0 && (
                        <View style={connectStyles.summaryRow}>
                            <View style={connectStyles.summaryItem}>
                                <Text style={[connectStyles.summaryValue, { color: colors.tertiary }]}>
                                    {formatEur(summary.gross_cents)}
                                </Text>
                                <Text style={[connectStyles.summaryLabel, { color: colors.outline }]}>Brutto</Text>
                            </View>
                            <View style={connectStyles.summaryItem}>
                                <Text style={[connectStyles.summaryValue, { color: colors.onSurface }]}>
                                    {formatEur(summary.net_cents)}
                                </Text>
                                <Text style={[connectStyles.summaryLabel, { color: colors.outline }]}>Netto</Text>
                            </View>
                            <View style={connectStyles.summaryItem}>
                                <Text style={[connectStyles.summaryValue, { color: colors.onSurface }]}>
                                    {summary.paid_orders}
                                </Text>
                                <Text style={[connectStyles.summaryLabel, { color: colors.outline }]}>Verkäufe</Text>
                            </View>
                        </View>
                    )}
                    <View style={connectStyles.buttonRow}>
                        <TouchableOpacity
                            style={[connectStyles.buttonSmall, { borderColor: colors.outlineVariant }]}
                            onPress={handleDashboard}
                        >
                            <Ionicons name="open-outline" size={16} color={colors.onSurface} style={{ marginRight: 6 }} />
                            <Text style={[connectStyles.buttonSmallText, { color: colors.onSurface }]}>Stripe-Konto</Text>
                        </TouchableOpacity>
                        {status.payouts_enabled && (
                            <TouchableOpacity
                                style={[connectStyles.buttonSmall, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }]}
                                onPress={handlePayout}
                                disabled={loading}
                            >
                                <Ionicons name="wallet-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                                <Text style={[connectStyles.buttonSmallText, { color: colors.primary }]}>
                                    {loading ? '…' : 'Auszahlung'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </>
            )}
        </View>
    );
}

const connectStyles = StyleSheet.create({
    container: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 8,
    },
    hint: {
        fontSize: 13,
        marginBottom: 12,
        lineHeight: 18,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    summaryRow: {
        flexDirection: 'row',
        marginBottom: 12,
        gap: 12,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    summaryLabel: {
        fontSize: 11,
        marginTop: 2,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 8,
    },
    buttonSmall: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    buttonSmallText: {
        fontSize: 13,
        fontWeight: '600',
    },
});

// ── Overview Content ──────────────────────────────────────────────────────────

function OverviewContent({
    counts,
    maxCapacity,
    colors,
    isDark,
    isWeb,
    eventId,
    participants,
    customFields,
    ticketOptionSummary,
    isDesktop = false,
    onShare,
    onDeletePress,
    canDelete,
    isDeleted = false,
}: {
    counts: ParticipantCounts;
    maxCapacity?: number;
    colors: ReturnType<typeof useTheme>['colors'];
    isDark: boolean;
    isWeb: boolean;
    eventId: string;
    participants: Participant[];
    customFields: CustomField[];
    ticketOptionSummary: TicketOptionSummary[];
    isDesktop?: boolean;
    onShare?: () => void;
    onDeletePress?: () => void;
    canDelete?: boolean;
    isDeleted?: boolean;
}) {
    const router = useRouter();
    const totalAccepted = counts.accepted;
    const capacityPercent = maxCapacity ? Math.round((totalAccepted / maxCapacity) * 100) : 0;
    const [summaryOpen, setSummaryOpen] = useState(false);

    const fieldSummaries = customFields.map(field => {
        const valueCounts: Record<string, number> = {};
        let total = 0;
        for (const p of participants) {
            const ticketResponses = p.ticket_responses || [];
            for (const tr of ticketResponses) {
                const resp = tr.responses.find(r => r.custom_field_id === field.custom_field_id);
                if (!resp) continue;
                const vals = Array.isArray(resp.value) ? resp.value : [resp.value];
                for (const v of vals) {
                    if (v) {
                        valueCounts[v] = (valueCounts[v] || 0) + 1;
                        total++;
                    }
                }
            }
        }
        return { field, valueCounts, total };
    }).filter(s => Object.keys(s.valueCounts).length > 0);

    const totalGuests = counts.accepted + counts.declined + counts.pending;

    return (
        <View style={[styles.tabContent, isDesktop && styles.tabContentDesktop]}>
            {/* Gast-Statistiken Kachel */}
            <TouchableOpacity
                style={[
                    styles.guestStatsTile,
                    { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant },
                    isDesktop && styles.guestStatsTileDesktop,
                ]}
                onPress={() => router.push(`/event/${eventId}/guests`)}
                activeOpacity={0.7}
            >
                <View style={styles.guestStatsTileHeader}>
                    <View>
                        <Text style={[styles.guestStatsTileLabel, { color: colors.outline }]}>Gast-Statistiken</Text>
                        <Text style={[styles.guestStatsTileTotal, { color: colors.onSurface }]}>
                            {totalGuests} {totalGuests === 1 ? 'Gast' : 'Gäste'} insgesamt
                        </Text>
                    </View>
                    <View style={[styles.guestStatsTileChevron, { backgroundColor: colors.surfaceContainerHigh }]}>
                        <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
                    </View>
                </View>
                <View style={styles.guestStatsMiniRow}>
                    <View style={styles.guestStatsMiniItem}>
                        <Text style={[styles.guestStatsMiniNum, isDesktop && styles.guestStatsMiniNumDesktop, { color: colors.tertiary }]}>{counts.accepted}</Text>
                        <Text style={[styles.guestStatsMiniLabel, { color: colors.outline }]}>Zusagen</Text>
                    </View>
                    <View style={[styles.guestStatsDivider, { backgroundColor: colors.outlineVariant }]} />
                    <View style={styles.guestStatsMiniItem}>
                        <Text style={[styles.guestStatsMiniNum, isDesktop && styles.guestStatsMiniNumDesktop, { color: colors.error }]}>{counts.declined}</Text>
                        <Text style={[styles.guestStatsMiniLabel, { color: colors.outline }]}>Absagen</Text>
                    </View>
                    <View style={[styles.guestStatsDivider, { backgroundColor: colors.outlineVariant }]} />
                    <View style={styles.guestStatsMiniItem}>
                        <Text style={[styles.guestStatsMiniNum, isDesktop && styles.guestStatsMiniNumDesktop, { color: colors.secondary }]}>{counts.pending}</Text>
                        <Text style={[styles.guestStatsMiniLabel, { color: colors.outline }]}>Unsicher</Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Gast-Antworten Placeholder Kachel */}
            <View
                style={[
                    styles.guestStatsTile,
                    { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant, opacity: 0.6 },
                    isDesktop && styles.guestStatsTileDesktop,
                ]}
            >
                <View style={styles.guestStatsTileHeader}>
                    <View>
                        <Text style={[styles.guestStatsTileLabel, { color: colors.outline }]}>Gast-Antworten</Text>
                        <Text style={[styles.guestStatsTileTotal, { color: colors.onSurface }]}>Kommt bald</Text>
                    </View>
                    <View style={[styles.guestStatsTileChevron, { backgroundColor: colors.surfaceContainerHigh }]}>
                        <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceVariant} />
                    </View>
                </View>
                <Text style={[styles.guestAnswersHint, { color: colors.outline }]}>
                    Hier werden bald die Antworten deiner Gäste auf Custom Fields angezeigt.
                </Text>
            </View>

            {/* Stripe Connect / Payment Management */}
            <StripeConnectSection eventId={eventId} colors={colors} isDark={isDark} isDesktop={isDesktop} />

            {/* Action tiles: Gast-Ansicht, Teilen, Event bearbeiten */}
            <View style={[styles.actionButtons, { marginBottom: 16 }]}>
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        {
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                        },
                        isWeb
                            ? { backgroundColor: isDark ? 'rgba(30,31,38,0.6)' : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any
                            : { backgroundColor: isDark ? 'rgba(30,31,38,0.85)' : 'rgba(255,255,255,0.85)' },
                    ]}
                    onPress={() => router.push(`/event/${eventId}`)}
                    activeOpacity={0.75}
                >
                    <Ionicons name="eye-outline" size={22} color={colors.onSurface} />
                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Gast-Ansicht</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        {
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                        },
                        isWeb
                            ? { backgroundColor: isDark ? 'rgba(30,31,38,0.6)' : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any
                            : { backgroundColor: isDark ? 'rgba(30,31,38,0.85)' : 'rgba(255,255,255,0.85)' },
                    ]}
                    onPress={onShare}
                    activeOpacity={0.75}
                >
                    <Ionicons name="share-outline" size={22} color={colors.onSurface} />
                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Teilen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.actionButton,
                        {
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                        },
                        isWeb
                            ? { backgroundColor: isDark ? 'rgba(30,31,38,0.6)' : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any
                            : { backgroundColor: isDark ? 'rgba(30,31,38,0.85)' : 'rgba(255,255,255,0.85)' },
                    ]}
                    onPress={() => router.push(`/event/${eventId}/edit`)}
                    activeOpacity={0.75}
                >
                    <Ionicons name="pencil-outline" size={22} color={colors.onSurface} />
                    <Text style={[styles.actionButtonText, { color: colors.onSurface }]}>Bearbeiten</Text>
                </TouchableOpacity>
            </View>

            {/* Delete Button */}
            {isDeleted ? (
                <View style={[styles.deleteButton, styles.deleteButtonDisabled]}>
                    <Ionicons name="close-circle-outline" size={18} color={colors.outline} />
                    <Text style={[styles.deleteButtonText, { color: colors.outline }]}>
                        Event abgesagt
                    </Text>
                </View>
            ) : (
                <TouchableOpacity
                    style={[
                        styles.deleteButton,
                        !canDelete && styles.deleteButtonDisabled,
                    ]}
                    onPress={canDelete ? onDeletePress : undefined}
                    activeOpacity={canDelete ? 0.75 : 1}
                    disabled={!canDelete}
                >
                    <Ionicons
                        name="trash-outline"
                        size={18}
                        color={canDelete ? '#FF3B30' : colors.outline}
                    />
                    <Text style={[styles.deleteButtonText, { color: canDelete ? '#FF3B30' : colors.outline }]}>
                        Event löschen
                    </Text>
                    {!canDelete && (
                        <Text style={[styles.deleteButtonHint, { color: colors.outline }]}>
                            (Beginn in &lt;48h)
                        </Text>
                    )}
                </TouchableOpacity>
            )}

            {/* Capacity Bar */}
            {maxCapacity && (
                <View style={[styles.capacityCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                    <View style={styles.capacityHeader}>
                        <Text style={[styles.capacityLabel, { color: colors.outline }]}>Kapazität</Text>
                        <Text style={[styles.capacityValue, { color: colors.onSurface }]}>
                            {totalAccepted} / {maxCapacity}
                        </Text>
                    </View>
                    <View style={[styles.capacityBarBg, { backgroundColor: colors.surfaceContainerLowest }]}>
                        <View
                            style={[
                                styles.capacityBarFill,
                                { width: `${Math.min(capacityPercent, 100)}%` },
                            ]}
                        />
                    </View>
                    {isDesktop && (
                        <Text style={[styles.capacityHint, { color: colors.onSurfaceVariant }]}>
                            {Math.min(capacityPercent, 100)}% ausgelastet
                            {maxCapacity - totalAccepted > 0 ? ` · noch ${maxCapacity - totalAccepted} Plätze frei` : ' · ausgebucht'}
                        </Text>
                    )}
                </View>
            )}

            {/* Ticket-Typ Übersicht */}
            {ticketOptionSummary.length > 0 && (
                <View style={[styles.sectionCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                    <Text style={[styles.sectionTitle, { color: colors.outline }]}>Ticket-Übersicht</Text>
                    {ticketOptionSummary.map((opt, i) => (
                        <View key={i} style={[styles.ticketRow, i < ticketOptionSummary.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.outlineVariant }]}>
                            <Text style={[styles.ticketRowName, { color: colors.onSurface }]}>{opt.name}</Text>
                            <View style={styles.ticketRowRight}>
                                <Text style={[styles.ticketRowPrice, { color: colors.onSurfaceVariant }]}>
                                    {opt.price === 0 ? 'Kostenlos' : `${opt.price.toFixed(2)} €`}
                                </Text>
                                <Text style={[styles.ticketRowCount, { color: colors.primary }]}>{opt.sold}×</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Antworten-Übersicht Button */}
            {customFields.length > 0 && (
                <TouchableOpacity
                    style={[styles.summaryButton, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    onPress={() => setSummaryOpen(true)}
                >
                    <Text style={[styles.summaryButtonText, { color: colors.onSurface }]}>Antworten-Übersicht</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.outline} />
                </TouchableOpacity>
            )}

            {/* Summary Modal */}
            <Modal
                visible={summaryOpen}
                animationType="slide"
                transparent
                onRequestClose={() => setSummaryOpen(false)}
            >
                <Pressable style={modalStyles.backdrop} onPress={() => setSummaryOpen(false)} />
                <View style={[modalStyles.sheet, { backgroundColor: colors.surfaceContainerLow }]}>
                    <View style={[modalStyles.handle, { backgroundColor: colors.outlineVariant }]} />
                    <Text style={[modalStyles.title, { color: colors.onSurface }]}>Antworten-Übersicht</Text>

                    <ScrollView style={modalStyles.scrollContent} showsVerticalScrollIndicator={false}>
                        {fieldSummaries.length === 0 ? (
                            <Text style={[modalStyles.emptyText, { color: colors.outline }]}>
                                Noch keine Antworten eingegangen.
                            </Text>
                        ) : fieldSummaries.map(({ field, valueCounts, total }) => {
                            const sorted = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
                            const maxCount = sorted[0]?.[1] ?? 1;

                            return (
                                <View key={field.custom_field_id} style={modalStyles.fieldSection}>
                                    <Text style={[modalStyles.fieldLabel, { color: colors.onSurface }]}>
                                        {field.label}
                                    </Text>
                                    {sorted.map(([value, count]) => {
                                        const percent = Math.round((count / maxCount) * 100);
                                        return (
                                            <View key={value} style={modalStyles.barRow}>
                                                <View style={modalStyles.barLabelRow}>
                                                    <Text style={[modalStyles.barLabel, { color: colors.onSurface }]} numberOfLines={1}>
                                                        {value}
                                                    </Text>
                                                    <Text style={[modalStyles.barCount, { color: colors.outline }]}>
                                                        {count}× ({Math.round((count / total) * 100)}%)
                                                    </Text>
                                                </View>
                                                <View style={[modalStyles.barBg, { backgroundColor: colors.surfaceContainerHigh }]}>
                                                    <View
                                                        style={[
                                                            modalStyles.barFill,
                                                            { width: `${percent}%`, backgroundColor: colors.primary },
                                                        ]}
                                                    />
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 110 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    retryBtnText: { fontSize: 14, fontWeight: '700' },

    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 16,
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },

    // Desktop layout
    desktopLayout: { flex: 1, flexDirection: 'row' },
    desktopLeft: { width: '38%', borderRightWidth: StyleSheet.hairlineWidth },
    desktopRight: { flex: 1, flexDirection: 'column' },
    desktopScroll: { flex: 1 },
    desktopScrollContent: { paddingBottom: 24, paddingTop: 24 },
    desktopStickyBar: {
        borderTopWidth: StyleSheet.hairlineWidth,
        padding: 16,
    },

    // Mobile sticky bar
    mobileStickyBar: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    },

    // Scan button
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        minHeight: 56,
    },
    scanButtonText: { fontSize: 16, fontWeight: '700' },

    // Header card
    headerCard: {
        marginTop: Platform.OS === 'ios' ? 100 : 72,
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    headerTop: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    headerThumb: { width: 60, height: 60, borderRadius: 12 },
    headerThumbPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextBlock: { flex: 1 },
    headerLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, lineHeight: 24 },
    headerDate: { fontSize: 13, marginTop: 4 },
    headerActions: { flexDirection: 'row', gap: 10 },
    headerActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    headerActionBtnText: { fontSize: 13, fontWeight: '600' },

    tabContent: { paddingHorizontal: 16, paddingBottom: 16 },
    tabContentDesktop: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },

    // Action buttons — exakt wie EventScreen
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 4,
        minHeight: 72,
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
    },

    // Gast-Statistiken Kachel
    guestStatsTile: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginBottom: 16,
    },
    guestStatsTileDesktop: {
        padding: 24,
    },
    guestStatsTileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    guestStatsTileLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    guestStatsTileTotal: { fontSize: 16, fontWeight: '700' },
    guestStatsTileChevron: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guestStatsMiniRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    guestStatsMiniItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    guestStatsMiniNum: { fontSize: 28, fontWeight: '800' },
    guestStatsMiniNumDesktop: { fontSize: 44 },
    guestStatsMiniLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
    guestStatsDivider: { width: 1, height: 36 },
    guestAnswersHint: { fontSize: 13, lineHeight: 18 },

    capacityCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    capacityLabel: { fontSize: 13, fontWeight: '600' },
    capacityValue: { fontSize: 14, fontWeight: '700' },
    capacityBarBg: { height: 10, borderRadius: 8, overflow: 'hidden' },
    capacityBarFill: {
        height: '100%',
        borderRadius: 8,
        backgroundColor: '#FFB3CE',
    },
    capacityHint: { fontSize: 12, marginTop: 8 },

    sectionCard: {
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10,
    },
    ticketRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    ticketRowName: { fontSize: 15, fontWeight: '600', flex: 1 },
    ticketRowRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    ticketRowPrice: { fontSize: 13 },
    ticketRowCount: { fontSize: 16, fontWeight: '700', minWidth: 32, textAlign: 'right' },

    summaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    summaryButtonText: { fontSize: 15, fontWeight: '600' },

    // Delete button
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,59,48,0.3)',
        backgroundColor: 'rgba(255,59,48,0.06)',
        marginBottom: 16,
    },
    deleteButtonDisabled: {
        borderColor: 'rgba(0,0,0,0.12)',
        backgroundColor: 'transparent',
    },
    deleteButtonText: {
        fontSize: 15,
        fontWeight: '500',
    },
    deleteButtonHint: {
        fontSize: 12,
        marginLeft: 4,
    },
    // Delete modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    deleteModalCard: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        gap: 16,
    },
    deleteModalIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
    deleteModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    deleteModalBody: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    deleteModalCheckRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 1,
        flexShrink: 0,
    },
    deleteModalCheckLabel: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
    },
    deleteModalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    deleteModalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    deleteModalBtnDestructive: {
        backgroundColor: '#FF3B30',
    },
    deleteModalBtnDisabled: {
        opacity: 0.4,
    },
    deleteModalBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

const modalStyles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        maxHeight: '75%',
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
        marginBottom: 16,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    fieldSection: {
        marginBottom: 24,
    },
    fieldLabel: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 10,
    },
    barRow: {
        marginBottom: 10,
    },
    barLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    barLabel: {
        fontSize: 14,
        flex: 1,
    },
    barCount: {
        fontSize: 13,
        marginLeft: 8,
    },
    barBg: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
        paddingVertical: 20,
    },
});