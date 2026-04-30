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
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Navbar from '../components/atoms/Navbar';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import type { EventDetailResponse } from '../types/events';
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

type TabType = 'overview' | 'guests';

export default function EventHostScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId: string }>();

    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [counts, setCounts] = useState<ParticipantCounts>({ accepted: 0, declined: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
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
            setParticipants(participantData.participants);
            setCounts(participantData.counts);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        } finally {
            setLoading(false);
        }
    };

    const copyInvitationLink = async () => {
        if (!event?.invitation_link) return;
        const fullLink = `https://happin.app/e/${event.invitation_link}`;
        const success = await copyToClipboard(fullLink);
        if (success) {
            Alert.alert('Kopiert', 'Einladungslink wurde in die Zwischenablage kopiert.');
        } else {
            Alert.alert('Link', fullLink);
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
                </View>

                {activeTab === 'overview' ? (
                    <OverviewTab
                        counts={counts}
                        maxCapacity={event.max_capacity}
                        invitationLink={event.invitation_link}
                        onCopyLink={copyInvitationLink}
                        colors={colors}
                    />
                ) : (
                    <GuestsTab
                        participants={participants}
                        counts={counts}
                        eventId={eventId!}
                        onParticipantsChanged={loadData}
                        colors={colors}
                    />
                )}
            </ScrollView>

            {/* Tab Bar */}
            <View style={[styles.tabBar, { backgroundColor: colors.surfaceContainerLowest, borderTopColor: colors.outlineVariant }]}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'overview' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                    onPress={() => setActiveTab('overview')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'overview' ? colors.primary : colors.outline }]}>
                        Übersicht
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'guests' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                    onPress={() => setActiveTab('guests')}
                >
                    <Text style={[styles.tabText, { color: activeTab === 'guests' ? colors.primary : colors.outline }]}>
                        Gäste
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Overview Tab Component ──────────────────────────────────────────────────

function OverviewTab({
    counts,
    maxCapacity,
    invitationLink,
    onCopyLink,
    colors,
}: {
    counts: ParticipantCounts;
    maxCapacity?: number;
    invitationLink?: string;
    onCopyLink: () => void;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const totalAccepted = counts.accepted;
    const capacityPercent = maxCapacity ? Math.round((totalAccepted / maxCapacity) * 100) : 0;

    return (
        <View style={styles.tabContent}>
            {/* Stats Cards */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: colors.surfaceContainer, borderColor: `${colors.tertiary}33` }]}>
                    <Text style={[styles.statNumber, { color: colors.tertiary }]}>{counts.accepted}</Text>
                    <Text style={[styles.statLabel, { color: colors.outline }]}>Zusagen</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.surfaceContainer, borderColor: `${colors.error}33` }]}>
                    <Text style={[styles.statNumber, { color: colors.error }]}>{counts.declined}</Text>
                    <Text style={[styles.statLabel, { color: colors.outline }]}>Absagen</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.surfaceContainer, borderColor: `${colors.secondary}33` }]}>
                    <Text style={[styles.statNumber, { color: colors.secondary }]}>{counts.pending}</Text>
                    <Text style={[styles.statLabel, { color: colors.outline }]}>Unsicher</Text>
                </View>
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

            {/* Invitation Link */}
            {invitationLink && (
                <View style={[styles.linkCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                    <Text style={[styles.linkLabel, { color: colors.outline }]}>Einladungslink</Text>
                    <View style={styles.linkRow}>
                        <View style={[styles.linkInput, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
                            <Text style={[styles.linkText, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                                happin.app/e/{invitationLink.slice(0, 10)}...
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.copyBtn, { backgroundColor: colors.primary }]}
                            onPress={onCopyLink}
                        >
                            <Text style={[styles.copyBtnText, { color: colors.onPrimary }]}>Kopieren</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

// ── Guests Tab Component ────────────────────────────────────────────────────

type FilterType = 'all' | 'accepted' | 'declined' | 'pending';

function GuestsTab({
    participants,
    counts,
    eventId,
    onParticipantsChanged,
    colors,
}: {
    participants: Participant[];
    counts: ParticipantCounts;
    eventId: string;
    onParticipantsChanged: () => void;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const [filter, setFilter] = useState<FilterType>('all');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [removing, setRemoving] = useState(false);

    const filteredParticipants = participants.filter((p) => {
        if (filter === 'all') return true;
        return p.status.toLowerCase() === filter;
    });

    const toggleSelection = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleRemove = async () => {
        if (selectedIds.size === 0) return;

        Alert.alert(
            'Gäste entfernen?',
            `${selectedIds.size} ${selectedIds.size === 1 ? 'Gast wird' : 'Gäste werden'} von der Teilnehmerliste entfernt.`,
            [
                { text: 'Abbrechen', style: 'cancel' },
                {
                    text: 'Entfernen',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setRemoving(true);
                            const token = await getSession();
                            if (!token) return;

                            await api.removeParticipants(eventId, Array.from(selectedIds), token);
                            setSelectedIds(new Set());
                            onParticipantsChanged();
                        } catch (err) {
                            Alert.alert('Fehler', 'Gäste konnten nicht entfernt werden.');
                        } finally {
                            setRemoving(false);
                        }
                    },
                },
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'accepted': return colors.tertiary;
            case 'declined': return colors.error;
            case 'pending': return colors.secondary;
            default: return colors.outline;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status.toLowerCase()) {
            case 'accepted': return 'Zusage';
            case 'declined': return 'Absage';
            case 'pending': return 'Unsicher';
            default: return status;
        }
    };

    const getInitials = (person: Participant['person']) => {
        const first = person.first_name?.[0] || '';
        const last = person.last_name?.[0] || '';
        return (first + last).toUpperCase() || '?';
    };

    const maskPhone = (phone?: string) => {
        if (!phone) return '';
        if (phone.length < 8) return phone;
        return phone.slice(0, -4).replace(/./g, (c, i) => (i > 6 ? '•' : c)) + phone.slice(-4);
    };

    const filterOptions: { key: FilterType; label: string; count: number }[] = [
        { key: 'all', label: 'Alle', count: participants.length },
        { key: 'accepted', label: 'Zusagen', count: counts.accepted },
        { key: 'declined', label: 'Absagen', count: counts.declined },
        { key: 'pending', label: 'Unsicher', count: counts.pending },
    ];

    return (
        <View style={styles.tabContent}>
            {/* Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={guestStyles.filterScroll}>
                <View style={guestStyles.filterRow}>
                    {filterOptions.map((opt) => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[
                                guestStyles.filterChip,
                                {
                                    backgroundColor: filter === opt.key ? `${colors.primary}20` : 'transparent',
                                    borderColor: filter === opt.key ? `${colors.primary}50` : colors.outlineVariant,
                                },
                            ]}
                            onPress={() => setFilter(opt.key)}
                        >
                            <Text
                                style={[
                                    guestStyles.filterChipText,
                                    { color: filter === opt.key ? colors.primary : colors.outline },
                                ]}
                            >
                                {opt.label} ({opt.count})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <View style={[guestStyles.bulkBar, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
                    <Text style={[guestStyles.bulkText, { color: colors.onSurface }]}>
                        {selectedIds.size} ausgewählt
                    </Text>
                    <TouchableOpacity
                        style={[guestStyles.removeBtn, { backgroundColor: colors.error }]}
                        onPress={handleRemove}
                        disabled={removing}
                    >
                        {removing ? (
                            <ActivityIndicator size="small" color={colors.onError} />
                        ) : (
                            <Text style={[guestStyles.removeBtnText, { color: colors.onError }]}>Entfernen</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Guest List */}
            {filteredParticipants.map((participant) => {
                const isSelected = selectedIds.has(participant.participation_id);
                const statusColor = getStatusColor(participant.status);

                return (
                    <TouchableOpacity
                        key={participant.participation_id}
                        style={[guestStyles.guestRow, { borderBottomColor: colors.outlineVariant }]}
                        onPress={() => toggleSelection(participant.participation_id)}
                        activeOpacity={0.7}
                    >
                        {/* Checkbox */}
                        <View
                            style={[
                                guestStyles.checkbox,
                                {
                                    backgroundColor: isSelected ? colors.primary : 'transparent',
                                    borderColor: isSelected ? colors.primary : colors.outlineVariant,
                                },
                            ]}
                        >
                            {isSelected && <Text style={guestStyles.checkmark}>✓</Text>}
                        </View>

                        {/* Avatar */}
                        <View style={guestStyles.avatar}>
                            <Text style={guestStyles.avatarText}>{getInitials(participant.person)}</Text>
                        </View>

                        {/* Info */}
                        <View style={guestStyles.guestInfo}>
                            <Text style={[guestStyles.guestName, { color: colors.onSurface }]}>
                                {participant.person.first_name} {participant.person.last_name || ''}
                            </Text>
                            {participant.person.phone_number && (
                                <Text style={[guestStyles.guestPhone, { color: colors.outline }]}>
                                    {maskPhone(participant.person.phone_number)}
                                </Text>
                            )}
                        </View>

                        {/* Status Badge */}
                        <View style={[guestStyles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: `${statusColor}40` }]}>
                            <Text style={[guestStyles.statusText, { color: statusColor }]}>
                                {getStatusLabel(participant.status)}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}

            {filteredParticipants.length === 0 && (
                <Text style={[guestStyles.emptyText, { color: colors.outline }]}>
                    Keine Gäste in dieser Kategorie
                </Text>
            )}
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
        backgroundColor: '#ffb1c0',
    },

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
    copyBtnText: { fontSize: 14, fontWeight: '700' },

    tabBar: {
        flexDirection: 'row',
        borderTopWidth: 1,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    tabText: { fontSize: 14, fontWeight: '600' },
});

const guestStyles = StyleSheet.create({
    filterScroll: { marginBottom: 16 },
    filterRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 9999,
        borderWidth: 1,
    },
    filterChipText: { fontSize: 13, fontWeight: '600' },

    bulkBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    bulkText: { fontSize: 14, fontWeight: '600' },
    removeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    removeBtnText: { fontSize: 13, fontWeight: '700' },

    guestRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: { color: '#660029', fontSize: 14, fontWeight: '800' },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 9999,
        backgroundColor: '#502cb1',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    guestInfo: { flex: 1 },
    guestName: { fontSize: 15, fontWeight: '600' },
    guestPhone: { fontSize: 12, marginTop: 2 },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    statusText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
    emptyText: { fontSize: 14, textAlign: 'center', marginTop: 40 },
});
