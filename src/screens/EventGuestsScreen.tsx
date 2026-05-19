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
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import type { Participant } from '../types/host';
import type { CustomField } from '../types/events';

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
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);

    useEffect(() => {
        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    // Clear selection when filter changes
    useEffect(() => {
        setSelectedIds(new Set());
        setExpandedId(null);
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

            const [participantData, eventData] = await Promise.all([
                api.getEventParticipants(eventId, token),
                api.getEventById(eventId, token),
            ]);
            setAllParticipants(participantData.participants);
            setCustomFields(eventData.custom_fields ?? []);
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
        accepted: allParticipants.filter(p => p.status.toLowerCase() === 'accepted').length,
        declined: allParticipants.filter(p => p.status.toLowerCase() === 'declined').length,
        pending: allParticipants.filter(p => p.status.toLowerCase() === 'pending').length,
    };

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

    const getFieldLabel = (fieldId: string): string => {
        const field = customFields.find(f => f.custom_field_id === fieldId);
        return field?.label ?? fieldId;
    };

    const formatValue = (value: string | string[]): string => {
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
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
                        {allParticipants.length} {allParticipants.length === 1 ? 'Gast' : 'Gäste'} insgesamt
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

                {/* Responses Summary */}
                {customFields.length > 0 && (() => {
                    const fieldAgg: Record<string, Record<string, number>> = {};
                    for (const p of participants) {
                        const allResponses = p.ticket_responses
                            ? p.ticket_responses.flatMap(tr => tr.responses)
                            : (p.custom_field_responses || []);
                        for (const r of allResponses) {
                            const label = getFieldLabel(r.custom_field_id);
                            if (!fieldAgg[label]) fieldAgg[label] = {};
                            const vals = Array.isArray(r.value) ? r.value : [r.value];
                            for (const v of vals) {
                                fieldAgg[label][v] = (fieldAgg[label][v] || 0) + 1;
                            }
                        }
                    }
                    const entries = Object.entries(fieldAgg);
                    if (entries.length === 0) return null;
                    return (
                        <View style={[styles.summaryCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                            <Text style={[styles.summaryTitle, { color: colors.onSurfaceVariant }]}>Zusammenfassung</Text>
                            {entries.map(([label, cnts]) => (
                                <View key={label} style={styles.summaryField}>
                                    <Text style={[styles.summaryFieldLabel, { color: colors.onSurface }]}>{label}</Text>
                                    <View style={styles.summaryChips}>
                                        {Object.entries(cnts)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([value, count]) => (
                                                <View key={value} style={[styles.summaryChip, { backgroundColor: `${colors.primary}15` }]}>
                                                    <Text style={[styles.summaryChipText, { color: colors.onSurface }]}>{value}</Text>
                                                    <Text style={[styles.summaryChipCount, { color: colors.primary }]}>{count}×</Text>
                                                </View>
                                            ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    );
                })()}

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
                        const isExpanded = expandedId === participant.participation_id;
                        const hasTicketResponses = (participant.ticket_responses?.length ?? 0) > 0;
                        const hasLegacyResponses = (participant.custom_field_responses?.length ?? 0) > 0;
                        const hasResponses = hasTicketResponses || hasLegacyResponses;
                        const multiTicket = (participant.ticket_responses?.length ?? 0) > 1;

                        const summaryLines = (() => {
                            if (!hasResponses) return [];
                            const fieldMap: Record<string, string[]> = {};
                            if (hasTicketResponses) {
                                for (const tr of participant.ticket_responses!) {
                                    for (const r of tr.responses) {
                                        const label = getFieldLabel(r.custom_field_id);
                                        if (!fieldMap[label]) fieldMap[label] = [];
                                        fieldMap[label].push(formatValue(r.value));
                                    }
                                }
                            } else {
                                for (const r of participant.custom_field_responses!) {
                                    const label = getFieldLabel(r.custom_field_id);
                                    fieldMap[label] = [formatValue(r.value)];
                                }
                            }
                            return Object.entries(fieldMap).map(([label, vals]) => `${label}: ${vals.join(', ')}`);
                        })();

                        return (
                            <View key={participant.participation_id}>
                                <TouchableOpacity
                                    style={[
                                        styles.guestRow,
                                        { borderBottomColor: colors.outlineVariant },
                                        index === participants.length - 1 && !isExpanded && { borderBottomWidth: 0 },
                                    ]}
                                    onPress={() => setExpandedId(isExpanded ? null : participant.participation_id)}
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
                                        {!isExpanded && summaryLines.length > 0 && (
                                            <Text style={[styles.guestSummary, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                                                {summaryLines.join(' · ')}
                                            </Text>
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

                                    {/* Expand indicator */}
                                    {hasResponses && (
                                        <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
                                            {isExpanded ? '▲' : '▼'}
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                {/* Expanded detail view */}
                                {isExpanded && hasResponses && (
                                    <View style={[styles.responsesContainer, { borderBottomColor: colors.outlineVariant, backgroundColor: `${colors.surfaceContainerHigh}50` }]}>
                                        {hasTicketResponses ? (
                                            participant.ticket_responses!.map((tr, tIdx) => (
                                                <View key={tr.ticket_id} style={[styles.ticketGroup, tIdx > 0 && { borderTopColor: colors.outlineVariant, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 10 }]}>
                                                    {multiTicket && (
                                                        <Text style={[styles.ticketLabel, { color: colors.primary }]}>
                                                            {tr.guest_name ?? `Person ${tIdx + 1}`}
                                                        </Text>
                                                    )}
                                                    {tr.responses.map((r) => (
                                                        <View key={r.custom_field_id} style={styles.responseRow}>
                                                            <Text style={[styles.responseLabel, { color: colors.onSurfaceVariant }]}>
                                                                {getFieldLabel(r.custom_field_id)}
                                                            </Text>
                                                            <Text style={[styles.responseValue, { color: colors.onSurface }]}>
                                                                {formatValue(r.value)}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            ))
                                        ) : (
                                            participant.custom_field_responses!.map((r) => (
                                                <View key={r.custom_field_id} style={styles.responseRow}>
                                                    <Text style={[styles.responseLabel, { color: colors.onSurfaceVariant }]}>
                                                        {getFieldLabel(r.custom_field_id)}
                                                    </Text>
                                                    <Text style={[styles.responseValue, { color: colors.onSurface }]}>
                                                        {formatValue(r.value)}
                                                    </Text>
                                                </View>
                                            ))
                                        )}
                                    </View>
                                )}
                            </View>
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
        alignItems: 'center',
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
    responsesContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        paddingLeft: 90,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    responseRow: { marginBottom: 8 },
    responseLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
    responseValue: { fontSize: 14 },
    ticketLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 8 },
    ticketGroup: {},
    guestSummary: { fontSize: 12, marginTop: 2 },
    summaryCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    summaryTitle: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    summaryField: { marginBottom: 10 },
    summaryFieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    summaryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    summaryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        gap: 4,
    },
    summaryChipText: { fontSize: 13 },
    summaryChipCount: { fontSize: 12, fontWeight: '700' },
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