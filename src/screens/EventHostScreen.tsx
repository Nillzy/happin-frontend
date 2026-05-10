import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Platform,
    Share,
    Linking,
    Modal,
    Pressable,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Navbar from '../components/atoms/Navbar';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import type { EventDetailResponse, CustomField } from '../types/events';
import type { Participant, ParticipantCounts } from '../types/host';

const copyToClipboard = async (text: string): Promise<boolean> => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            return false;
        }
    }
    // Fallback for native - would need expo-clipboard for full support
    return false;
};

export default function EventHostScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId: string }>();

    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [counts, setCounts] = useState<ParticipantCounts>({ accepted: 0, declined: 0, pending: 0 });
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            setCustomFields(eventData.custom_fields ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        } finally {
            setLoading(false);
        }
    };

    const copyInvitationLink = async () => {
        if (!event?.event_id) return;
        const fullLink = `https://happin.fun/event/${event.event_id}`;
        const success = await copyToClipboard(fullLink);
        if (success) {
            Alert.alert('Kopiert', 'Einladungslink wurde in die Zwischenablage kopiert.');
        } else {
            Alert.alert('Link', fullLink);
        }
    };

    const shareInvitationLink = async () => {
        if (!event?.event_id) return;
        const fullLink = `https://happin.fun/event/${event.event_id}`;
        try {
            await Share.share({
                message: `Komm zu ${event.title}!\n${fullLink}`,
            });
        } catch {
            // User cancelled
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

    if (loading) {
        return (
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <Navbar showBack />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    if (error || !event) {
        return (
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <Navbar showBack />
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

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <Navbar showBack />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Event Header */}
                <View style={[styles.headerCard, { backgroundColor: colors.surfaceContainer, borderColor: `${colors.primary}25` }]}>
                    <Text style={[styles.headerLabel, { color: colors.outline }]}>Dein Event</Text>
                    <Text style={[styles.headerTitle, { color: colors.onSurface }]}>{event.title}</Text>
                    <Text style={[styles.headerDate, { color: colors.onSurfaceVariant }]}>
                        {formatDate(event.starts_at)}
                    </Text>

                    {/* Button zur Gast-Ansicht */}
                    <TouchableOpacity
                        style={[styles.guestViewButton, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant }]}
                        onPress={() => router.push(`/event/${eventId}`)}
                    >
                        <Text style={[styles.guestViewButtonText, { color: colors.onSurface }]}>
                            Zur Gast-Ansicht
                        </Text>
                    </TouchableOpacity>
                </View>

                <OverviewTab
                    counts={counts}
                    maxCapacity={event.max_capacity}
                    onCopyLink={copyInvitationLink}
                    onShareLink={shareInvitationLink}
                    colors={colors}
                    eventId={eventId!}
                    participants={participants}
                    customFields={customFields}
                />
            </ScrollView>
        </View>
    );
}

// ── Overview Tab Component ──────────────────────────────────────────────────

function OverviewTab({
    counts,
    maxCapacity,
    onCopyLink,
    onShareLink,
    colors,
    eventId,
    participants,
    customFields,
}: {
    counts: ParticipantCounts;
    maxCapacity?: number;
    onCopyLink: () => void;
    onShareLink: () => void;
    colors: ReturnType<typeof useTheme>['colors'];
    eventId: string;
    participants: Participant[];
    customFields: CustomField[];
}) {
    const router = useRouter();
    const totalAccepted = counts.accepted;
    const capacityPercent = maxCapacity ? Math.round((totalAccepted / maxCapacity) * 100) : 0;
    const [summaryOpen, setSummaryOpen] = useState(false);

    const handleStatusClick = (status: 'accepted' | 'declined' | 'pending') => {
        router.push(`/event/${eventId}/guests?status=${status}`);
    };

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

    return (
        <View style={styles.tabContent}>
            {/* Stats Cards */}
            <View style={styles.statsRow}>
                <TouchableOpacity
                    style={[
                        styles.statCard,
                        { backgroundColor: colors.surfaceContainer, borderColor: `${colors.tertiary}33` },
                    ]}
                    onPress={() => handleStatusClick('accepted')}
                >
                    <Text style={[styles.statNumber, { color: colors.tertiary }]}>{counts.accepted}</Text>
                    <Text style={[styles.statLabel, { color: colors.outline }]}>Zusagen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.statCard,
                        { backgroundColor: colors.surfaceContainer, borderColor: `${colors.error}33` },
                    ]}
                    onPress={() => handleStatusClick('declined')}
                >
                    <Text style={[styles.statNumber, { color: colors.error }]}>{counts.declined}</Text>
                    <Text style={[styles.statLabel, { color: colors.outline }]}>Absagen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.statCard,
                        { backgroundColor: colors.surfaceContainer, borderColor: `${colors.secondary}33` },
                    ]}
                    onPress={() => handleStatusClick('pending')}
                >
                    <Text style={[styles.statNumber, { color: colors.secondary }]}>{counts.pending}</Text>
                    <Text style={[styles.statLabel, { color: colors.outline }]}>Unsicher</Text>
                </TouchableOpacity>
            </View>

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
                </View>
            )}

            {/* Summary Button */}
            {customFields.length > 0 && (
                <TouchableOpacity
                    style={[styles.summaryButton, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    onPress={() => setSummaryOpen(true)}
                >
                    <Text style={[styles.summaryButtonText, { color: colors.onSurface }]}>Antworten-Übersicht</Text>
                    <Text style={[styles.summaryButtonArrow, { color: colors.outline }]}>›</Text>
                </TouchableOpacity>
            )}

            {/* Scan Button */}
            <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push(`/event/${eventId}/scan`)}
            >
                <Text style={[styles.scanButtonText, { color: colors.onPrimary }]}>
                    Tickets scannen
                </Text>
            </TouchableOpacity>

            {/* Invitation Link */}
            {eventId && (
                <View style={[styles.linkCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                    <Text style={[styles.linkLabel, { color: colors.outline }]}>Einladungslink</Text>
                    <View style={styles.linkRow}>
                        <TouchableOpacity
                            style={[styles.linkInput, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}
                            onPress={() => Linking.openURL(`https://happin.fun/event/${eventId}`)}
                        >
                            <Text style={[styles.linkText, { color: colors.primary }]} numberOfLines={1}>
                                happin.fun/event/{eventId.slice(0, 8)}...
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.copyBtn, { backgroundColor: colors.primary }]}
                            onPress={onCopyLink}
                        >
                            <Text style={[styles.copyBtnText, { color: colors.onPrimary }]}>Kopieren</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.shareBtn, { backgroundColor: colors.tertiary }]}
                            onPress={onShareLink}
                        >
                            <Text style={[styles.copyBtnText, { color: colors.onTertiary }]}>Teilen</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 100 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    errorText: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
    retryBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    retryBtnText: { fontSize: 14, fontWeight: '700' },

    headerCard: {
        margin: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    headerLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    headerTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
    headerDate: { fontSize: 14, marginTop: 6 },
    guestViewButton: {
        marginTop: 16,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    guestViewButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },

    tabContent: { paddingHorizontal: 16 },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    statNumber: { fontSize: 32, fontWeight: '800' },
    statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },

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

    scanButton: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 16,
    },
    scanButtonText: { fontSize: 16, fontWeight: '700' },

    linkCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    linkLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
    linkRow: { flexDirection: 'row', gap: 10 },
    linkInput: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    linkText: { fontSize: 13 },
    copyBtn: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
    },
    shareBtn: {
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
    },
    copyBtnText: { fontSize: 14, fontWeight: '700' },

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
    summaryButtonArrow: { fontSize: 22, fontWeight: '600' },
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
