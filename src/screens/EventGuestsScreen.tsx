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
    Modal,
    Pressable,
} from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import type { Participant } from '../types/host';

type StatusFilter = 'accepted' | 'declined' | 'pending';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'accepted', label: 'Zusagen' },
    { value: 'declined', label: 'Absagen' },
    { value: 'pending', label: 'Unsicher' },
];

export default function EventGuestsScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { eventId, status: initialStatus } = useLocalSearchParams<{ eventId: string; status: StatusFilter }>();

    const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
    const [activeFilter, setActiveFilter] = useState<StatusFilter>(initialStatus ?? 'accepted');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [removing, setRemoving] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);

    useEffect(() => {
        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    // Clear selection when filter changes
    useEffect(() => {
        setSelectedIds(new Set());
    }, [activeFilter]);

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

            const participantData = await api.getEventParticipants(eventId, token);
            setAllParticipants(participantData.participants);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        } finally {
            setLoading(false);
        }
    };

    const participants = allParticipants.filter(
        (p) => p.status.toLowerCase() === activeFilter
    );

    const counts = {
        accepted: allParticipants
            .filter(p => p.status.toLowerCase() === 'accepted')
            .reduce((sum, p) => sum + Math.max(p.ticket_count ?? 0, 1), 0),
        declined: allParticipants.filter(p => p.status.toLowerCase() === 'declined').length,
        pending: allParticipants.filter(p => p.status.toLowerCase() === 'pending').length,
    };
    const totalCount = counts.accepted + counts.declined + counts.pending;

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

    const handleRemove = () => {
        if (selectedIds.size === 0) return;
        setConfirmVisible(true);
    };

    const doRemove = async () => {
        setConfirmVisible(false);
        try {
            setRemoving(true);
            const token = await getSession();
            if (!token) return;

            await api.removeParticipants(eventId, Array.from(selectedIds), token);
            setSelectedIds(new Set());
            await loadData();
        } catch {
            if (Platform.OS === 'web') {
                window.alert('Gäste konnten nicht entfernt werden.');
            } else {
                Alert.alert('Fehler', 'Gäste konnten nicht entfernt werden.');
            }
        } finally {
            setRemoving(false);
        }
    };

    const getStatusColor = (s: StatusFilter) => {
        switch (s) {
            case 'accepted': return colors.tertiary;
            case 'declined': return colors.error;
            case 'pending': return colors.secondary;
        }
    };

    const getInitials = (person: Participant['person']) => {
        const first = person.first_name?.[0] || '';
        const last = person.last_name?.[0] || '';
        return (first + last).toUpperCase() || '?';
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.push('/');
        }
    };

    if (loading) {
        return (
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: colors.surfaceContainerHigh }]}
                    onPress={handleBack}
                >
                    <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
                </TouchableOpacity>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: colors.surfaceContainerHigh }]}
                    onPress={handleBack}
                >
                    <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
                </TouchableOpacity>
                <View style={styles.centered}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    <TouchableOpacity onPress={loadData} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.retryBtnText, { color: colors.onPrimary }]}>Erneut versuchen</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const activeColor = getStatusColor(activeFilter);

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            {/* Back button */}
            <TouchableOpacity
                style={[styles.backButton, { backgroundColor: colors.surfaceContainerHigh }]}
                onPress={handleBack}
            >
                <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
            </TouchableOpacity>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Page header */}
                <View style={styles.pageHeader}>
                    <Text style={[styles.pageTitle, { color: colors.onSurface }]}>Gästeliste</Text>
                    <Text style={[styles.pageSubtitle, { color: colors.onSurfaceVariant }]}>
                        {totalCount} {totalCount === 1 ? 'Gast' : 'Gäste'} insgesamt
                    </Text>
                </View>

                {/* Radio filter buttons */}
                <View style={[styles.filterRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                    {STATUS_OPTIONS.map((opt) => {
                        const isActive = activeFilter === opt.value;
                        const statusColor = getStatusColor(opt.value);
                        return (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.filterBtn,
                                    isActive && { backgroundColor: statusColor },
                                ]}
                                onPress={() => setActiveFilter(opt.value)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.filterBtnCount,
                                    isActive ? { color: '#fff' } : { color: statusColor },
                                ]}>
                                    {counts[opt.value]}
                                </Text>
                                <Text style={[
                                    styles.filterBtnLabel,
                                    isActive ? { color: '#fff' } : { color: colors.onSurfaceVariant },
                                ]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Bulk Action Bar – only for accepted */}
                {selectedIds.size > 0 && activeFilter === 'accepted' && (
                    <View style={[styles.bulkBar, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
                        <Text style={[styles.bulkText, { color: colors.onSurface }]}>
                            {selectedIds.size} ausgewählt
                        </Text>
                        <TouchableOpacity
                            style={[styles.removeBtn, { backgroundColor: colors.error }]}
                            onPress={handleRemove}
                            disabled={removing}
                        >
                            {removing ? (
                                <ActivityIndicator size="small" color={colors.onError} />
                            ) : (
                                <Text style={[styles.removeBtnText, { color: colors.onError }]}>Entfernen</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Guest List */}
                <View style={[styles.guestListContainer, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                    {participants.map((participant, index) => {
                        const isSelected = selectedIds.has(participant.participation_id);
                        const ticketResponses = participant.ticket_responses ?? [];
                        const hasTicketResponses = ticketResponses.length > 0;
                        const isLast = index === participants.length - 1;

                        return (
                            <TouchableOpacity
                                key={participant.participation_id}
                                style={[
                                    styles.guestRow,
                                    { borderBottomColor: colors.outlineVariant },
                                    isLast && { borderBottomWidth: 0 },
                                ]}
                                onPress={() => activeFilter === 'accepted' && toggleSelection(participant.participation_id)}
                                onLongPress={() => activeFilter === 'accepted' && toggleSelection(participant.participation_id)}
                                activeOpacity={0.7}
                            >
                                {/* Checkbox – only for accepted */}
                                {activeFilter === 'accepted' && (
                                    <TouchableOpacity
                                        onPress={() => toggleSelection(participant.participation_id)}
                                        hitSlop={8}
                                    >
                                        <View
                                            style={[
                                                styles.checkbox,
                                                {
                                                    backgroundColor: isSelected ? colors.primary : 'transparent',
                                                    borderColor: isSelected ? colors.primary : colors.outlineVariant,
                                                },
                                            ]}
                                        >
                                            {isSelected && <Text style={styles.checkmark}>✓</Text>}
                                        </View>
                                    </TouchableOpacity>
                                )}

                                {/* Avatar */}
                                <View style={[styles.avatar, { backgroundColor: activeColor }]}>
                                    <Text style={styles.avatarText}>{getInitials(participant.person)}</Text>
                                </View>

                                {/* Info */}
                                <View style={styles.guestInfo}>
                                    <Text style={[styles.guestName, { color: colors.onSurface }]}>
                                        {participant.person.first_name} {participant.person.last_name || ''}
                                    </Text>
                                    {hasTicketResponses && (
                                        <View style={styles.ticketList}>
                                            {ticketResponses.map((tr, tIdx) => (
                                                <View key={tr.ticket_id} style={styles.ticketListRow}>
                                                    <Text
                                                        style={[styles.ticketGuestName, { color: colors.onSurfaceVariant }]}
                                                        numberOfLines={1}
                                                    >
                                                        {tr.guest_name?.trim() || `Person ${tIdx + 1}`}
                                                    </Text>
                                                    <View style={[styles.ticketOptionChip, { backgroundColor: colors.surfaceContainerHigh }]}>
                                                        <Text style={[styles.ticketOptionText, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                                                            {tr.ticket_option_name?.trim() || 'Standard'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                {/* Ticket Badge */}
                                {(participant.ticket_count ?? 0) > 1 && (
                                    <View style={[styles.ticketBadge, { backgroundColor: `${colors.tertiary}20` }]}>
                                        <Text style={[styles.ticketBadgeText, { color: colors.tertiary }]}>
                                            {participant.ticket_count}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    {participants.length === 0 && (
                        <Text style={[styles.emptyText, { color: colors.outline }]}>
                            Keine Gäste in dieser Kategorie
                        </Text>
                    )}
                </View>
            </ScrollView>

            {/* Bestätigungs-Modal */}
            <Modal
                visible={confirmVisible}
                animationType="slide"
                transparent
                statusBarTranslucent
                hardwareAccelerated
                onRequestClose={() => setConfirmVisible(false)}
            >
                <Pressable style={modalStyles.backdrop} onPress={() => setConfirmVisible(false)} />
                <View style={[modalStyles.sheet, { backgroundColor: colors.surfaceContainerLow }]}>
                    <View style={[modalStyles.handle, { backgroundColor: colors.outlineVariant }]} />

                    <View style={modalStyles.iconContainer}>
                        <View style={[modalStyles.iconCircle, { backgroundColor: `${colors.error}18` }]}>
                            <Text style={[modalStyles.iconText, { color: colors.error }]}>!</Text>
                        </View>
                    </View>

                    <Text style={[modalStyles.title, { color: colors.onSurface }]}>
                        Gäste entfernen?
                    </Text>
                    <Text style={[modalStyles.message, { color: colors.onSurfaceVariant }]}>
                        {selectedIds.size} {selectedIds.size === 1 ? 'Gast wird' : 'Gäste werden'} unwiderruflich von der Teilnehmerliste entfernt.
                    </Text>

                    <View style={modalStyles.actions}>
                        <TouchableOpacity
                            style={[modalStyles.cancelBtn, { borderColor: colors.outlineVariant }]}
                            onPress={() => setConfirmVisible(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={[modalStyles.cancelBtnText, { color: colors.onSurface }]}>Abbrechen</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[modalStyles.confirmBtn, { backgroundColor: colors.error }]}
                            onPress={doRemove}
                            activeOpacity={0.8}
                        >
                            <Text style={[modalStyles.confirmBtnText, { color: colors.onError }]}>Entfernen</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={modalStyles.bottomSpacer} />
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 32 },
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

    pageHeader: {
        marginTop: Platform.OS === 'ios' ? 106 : 72,
        marginHorizontal: 16,
        marginBottom: 16,
    },
    pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    pageSubtitle: { fontSize: 14, marginTop: 4 },

    // Radio filter row
    filterRow: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        borderWidth: 1,
        padding: 4,
        gap: 4,
    },
    filterBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 12,
    },
    filterBtnCount: { fontSize: 20, fontWeight: '800' },
    filterBtnLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },

    bulkBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    bulkText: { fontSize: 14, fontWeight: '600' },
    removeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    removeBtnText: { fontSize: 13, fontWeight: '700' },

    guestListContainer: {
        marginHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    guestRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 14,
        paddingHorizontal: 16,
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
    checkmark: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    guestInfo: { flex: 1 },
    guestName: { fontSize: 15, fontWeight: '600' },
    ticketBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    ticketBadgeText: { fontSize: 12, fontWeight: '700' },
    emptyText: { fontSize: 14, textAlign: 'center', padding: 40 },
    ticketList: { marginTop: 6, gap: 4 },
    ticketListRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ticketGuestName: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
    ticketOptionChip: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    ticketOptionText: { fontSize: 11, fontWeight: '600' },
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
        paddingHorizontal: 24,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 24,
    },
    iconContainer: { alignItems: 'center', marginBottom: 16 },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconText: { fontSize: 28, fontWeight: '800' },
    title: { fontSize: 19, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
    message: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    actions: { flexDirection: 'row', gap: 12 },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 9999,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, fontWeight: '700' },
    confirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 9999,
        alignItems: 'center',
    },
    confirmBtnText: { fontSize: 15, fontWeight: '700' },
    bottomSpacer: { height: Platform.OS === 'ios' ? 34 : 24 },
});
