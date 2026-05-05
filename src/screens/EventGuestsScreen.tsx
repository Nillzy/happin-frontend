import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Navbar from '../components/atoms/Navbar';
import { getSession } from '../services/supabase';
import { api } from '../services/api';
import type { Participant } from '../types/host';

export default function EventGuestsScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { eventId, status } = useLocalSearchParams<{ eventId: string; status: 'accepted' | 'declined' | 'pending' }>();

    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [removing, setRemoving] = useState(false);

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

            const participantData = await api.getEventParticipants(eventId, token);
            const filtered = participantData.participants.filter(
                (p: Participant) => p.status.toLowerCase() === status
            );
            setParticipants(filtered);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Laden');
        } finally {
            setLoading(false);
        }
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
                            await loadData();
                        } catch {
                            Alert.alert('Fehler', 'Gäste konnten nicht entfernt werden.');
                        } finally {
                            setRemoving(false);
                        }
                    },
                },
            ]
        );
    };

    const getStatusColor = () => {
        switch (status) {
            case 'accepted': return colors.tertiary;
            case 'declined': return colors.error;
            case 'pending': return colors.secondary;
            default: return colors.outline;
        }
    };

    const getStatusLabel = () => {
        switch (status) {
            case 'accepted': return 'Zusagen';
            case 'declined': return 'Absagen';
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

    if (error) {
        return (
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <Navbar showBack />
                <View style={styles.centered}>
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    <TouchableOpacity onPress={loadData} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.retryBtnText, { color: colors.onPrimary }]}>Erneut versuchen</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const statusColor = getStatusColor();

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <Navbar showBack />

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={[styles.headerCard, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                    <Text style={[styles.headerLabel, { color: colors.outline }]}>Gästeliste</Text>
                    <Text style={[styles.headerTitle, { color: statusColor }]}>{getStatusLabel()}</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}>
                        {participants.length} {participants.length === 1 ? 'Gast' : 'Gäste'}
                    </Text>
                </View>

                {/* Bulk Action Bar */}
                {selectedIds.size > 0 && (
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

                        return (
                            <TouchableOpacity
                                key={participant.participation_id}
                                style={[
                                    styles.guestRow,
                                    { borderBottomColor: colors.outlineVariant },
                                    index === participants.length - 1 && { borderBottomWidth: 0 }
                                ]}
                                onPress={() => toggleSelection(participant.participation_id)}
                                activeOpacity={0.7}
                            >
                                {/* Checkbox */}
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

                                {/* Avatar */}
                                <View style={[styles.avatar, { backgroundColor: statusColor }]}>
                                    <Text style={styles.avatarText}>{getInitials(participant.person)}</Text>
                                </View>

                                {/* Info */}
                                <View style={styles.guestInfo}>
                                    <Text style={[styles.guestName, { color: colors.onSurface }]}>
                                        {participant.person.first_name} {participant.person.last_name || ''}
                                    </Text>
                                    {participant.person.phone_number && (
                                        <Text style={[styles.guestPhone, { color: colors.outline }]}>
                                            {maskPhone(participant.person.phone_number)}
                                        </Text>
                                    )}
                                </View>
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

    headerCard: {
        margin: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    headerLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    headerTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
    headerSubtitle: { fontSize: 14, marginTop: 4 },

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
    guestPhone: { fontSize: 12, marginTop: 2 },
    emptyText: { fontSize: 14, textAlign: 'center', padding: 40 },
});
