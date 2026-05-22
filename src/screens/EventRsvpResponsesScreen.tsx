import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Platform,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import type { Participant } from '../types/host';
import type { CustomField } from '../types/events';

type ResponseEntry = {
    guestName: string;
    ticketOptionName: string;
    fieldId: string;
    values: string[];
};

export default function EventRsvpResponsesScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { eventId } = useLocalSearchParams<{ eventId: string }>();
    const { width: windowWidth } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isDesktop = isWeb && windowWidth >= 768;

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

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
            setCustomFields(eventData.custom_fields ?? []);
            setParticipants(participantData.participants);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.push(`/event/${eventId}/manage`);
        }
    };

    const toggleField = (fieldId: string) => {
        setExpandedFields(prev => {
            const next = new Set(prev);
            if (next.has(fieldId)) next.delete(fieldId);
            else next.add(fieldId);
            return next;
        });
    };

    const allEntries: ResponseEntry[] = [];
    let totalTickets = 0;
    for (const p of participants) {
        const fullName = [p.person.first_name, p.person.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() || 'Unbekannt';
        for (const tr of p.ticket_responses || []) {
            totalTickets++;
            const guestName = tr.guest_name?.trim() || fullName;
            const ticketOptionName = tr.ticket_option_name || 'Standard';
            for (const r of tr.responses) {
                const vals = (Array.isArray(r.value) ? r.value : [r.value])
                    .map(v => (v == null ? '' : String(v).trim()))
                    .filter(v => v !== '');
                if (vals.length === 0) continue;
                allEntries.push({ guestName, ticketOptionName, fieldId: r.custom_field_id, values: vals });
            }
        }
    }

    const fieldStats = customFields.map(field => {
        const fid = field.custom_field_id ?? '';
        const fieldEntries = allEntries.filter(e => e.fieldId === fid);
        const valueCounts: Record<string, number> = {};
        for (const e of fieldEntries) {
            for (const v of e.values) {
                valueCounts[v] = (valueCounts[v] || 0) + 1;
            }
        }
        return { field, fid, responseCount: fieldEntries.length, valueCounts, entries: fieldEntries };
    });

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

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <TouchableOpacity
                style={[styles.backButton, { backgroundColor: colors.surfaceContainerHigh }]}
                onPress={handleBack}
                activeOpacity={0.7}
            >
                <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
            </TouchableOpacity>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
            >
                <View style={styles.pageHeader}>
                    <Text style={[styles.pageTitle, { color: colors.onSurface }]}>Antworten der Gäste</Text>
                    <Text style={[styles.pageSubtitle, { color: colors.onSurfaceVariant }]}>
                        {customFields.length === 0
                            ? 'Keine Custom Fields für dieses Event'
                            : `${totalTickets} ${totalTickets === 1 ? 'Ticket' : 'Tickets'} insgesamt`}
                    </Text>
                </View>

                {customFields.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                        <Ionicons name="clipboard-outline" size={42} color={colors.outline} />
                        <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Noch keine Fragen</Text>
                        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
                            Bearbeite das Event und füge Custom Fields hinzu, um Antworten von deinen Gästen zu sammeln.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push(`/event/${eventId}/edit`)}
                            style={[styles.emptyAction, { backgroundColor: colors.primary }]}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.emptyActionText, { color: colors.onPrimary }]}>Event bearbeiten</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    fieldStats.map(stat => {
                        const isExpanded = expandedFields.has(stat.fid);
                        const hasOptions =
                            stat.field.field_type === 'single_select' ||
                            stat.field.field_type === 'multi_select';
                        const sortedValues = Object.entries(stat.valueCounts).sort((a, b) => b[1] - a[1]);
                        const maxCount = sortedValues[0]?.[1] ?? 1;
                        const totalValues = sortedValues.reduce((sum, [, c]) => sum + c, 0);
                        const noAnswers = stat.entries.length === 0;

                        return (
                            <View
                                key={stat.fid}
                                style={[styles.fieldCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                            >
                                <View style={styles.fieldCardHeader}>
                                    <Text style={[styles.fieldCardTitle, { color: colors.onSurface }]}>
                                        {stat.field.label}
                                    </Text>
                                    <View style={[styles.fieldCardBadge, { backgroundColor: colors.surfaceContainerHigh }]}>
                                        <Text style={[styles.fieldCardBadgeText, { color: colors.onSurfaceVariant }]}>
                                            {stat.responseCount}/{totalTickets}
                                        </Text>
                                    </View>
                                </View>

                                {hasOptions && sortedValues.length > 0 && (
                                    <View style={styles.barsContainer}>
                                        {sortedValues.map(([value, count]) => {
                                            const percent = Math.round((count / maxCount) * 100);
                                            const totalPercent = totalValues > 0 ? Math.round((count / totalValues) * 100) : 0;
                                            return (
                                                <View key={value} style={styles.barRow}>
                                                    <View style={styles.barLabelRow}>
                                                        <Text style={[styles.barLabel, { color: colors.onSurface }]} numberOfLines={1}>
                                                            {value}
                                                        </Text>
                                                        <Text style={[styles.barCount, { color: colors.outline }]}>
                                                            {count}× ({totalPercent}%)
                                                        </Text>
                                                    </View>
                                                    <View style={[styles.barBg, { backgroundColor: colors.surfaceContainerHigh }]}>
                                                        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: colors.primary }]} />
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                {noAnswers ? (
                                    <Text style={[styles.fieldEmpty, { color: colors.outline }]}>
                                        Noch keine Antworten.
                                    </Text>
                                ) : (
                                    <>
                                        <TouchableOpacity
                                            onPress={() => toggleField(stat.fid)}
                                            style={[styles.expandRow, { borderTopColor: colors.outlineVariant }]}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.expandLabel, { color: colors.primary }]}>
                                                {isExpanded
                                                    ? 'Antworten ausblenden'
                                                    : `${stat.entries.length} ${stat.entries.length === 1 ? 'Antwort' : 'Antworten'} anzeigen`}
                                            </Text>
                                            <Ionicons
                                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                size={18}
                                                color={colors.primary}
                                            />
                                        </TouchableOpacity>
                                        {isExpanded && (
                                            <View style={styles.entryList}>
                                                {stat.entries.map((e, idx) => (
                                                    <View
                                                        key={`${stat.fid}-${idx}`}
                                                        style={[
                                                            styles.entryRow,
                                                            idx > 0 && {
                                                                borderTopColor: colors.outlineVariant,
                                                                borderTopWidth: StyleSheet.hairlineWidth,
                                                            },
                                                        ]}
                                                    >
                                                        <View style={styles.entryRowLeft}>
                                                            <Text style={[styles.entryName, { color: colors.onSurface }]} numberOfLines={1}>
                                                                {e.guestName}
                                                            </Text>
                                                            <View style={[styles.entryTicketChip, { backgroundColor: colors.surfaceContainerHigh }]}>
                                                                <Text style={[styles.entryTicket, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                                                                    {e.ticketOptionName}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        <Text style={[styles.entryValue, { color: colors.onSurface }]}>
                                                            {e.values.join(', ')}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    scrollContentDesktop: { maxWidth: 760, alignSelf: 'center', width: '100%', paddingHorizontal: 24 },
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

    fieldCard: {
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
    },
    fieldCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 12,
    },
    fieldCardTitle: { fontSize: 17, fontWeight: '700', flex: 1, lineHeight: 22 },
    fieldCardBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    fieldCardBadgeText: { fontSize: 12, fontWeight: '700' },

    barsContainer: { marginBottom: 4 },
    barRow: { marginBottom: 10 },
    barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    barLabel: { fontSize: 14, fontWeight: '600', flex: 1, paddingRight: 8 },
    barCount: { fontSize: 12, fontWeight: '600' },
    barBg: { height: 8, borderRadius: 6, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 6 },

    fieldEmpty: { fontSize: 13, fontStyle: 'italic', marginTop: 4 },

    expandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    expandLabel: { fontSize: 14, fontWeight: '600' },

    entryList: { marginTop: 4 },
    entryRow: {
        paddingVertical: 12,
    },
    entryRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    entryName: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
    entryTicketChip: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    entryTicket: { fontSize: 11, fontWeight: '600' },
    entryValue: { fontSize: 14, lineHeight: 19 },

    emptyCard: {
        marginHorizontal: 16,
        padding: 28,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 6 },
    emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
    emptyAction: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    emptyActionText: { fontSize: 14, fontWeight: '700' },
});
