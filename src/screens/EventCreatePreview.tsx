import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Navbar from '../components/atoms/Navbar';
import Footer from '../components/atoms/Footer';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import DatePicker from '../components/atoms/DatePicker';
import TimePicker from '../components/atoms/TimePicker';
import EditModal from '../components/atoms/EditModal';
import EditButton from '../components/atoms/EditButton';
import EventHero from '../components/event/EventHero';
import EventInfoBlock from '../components/event/EventInfoBlock';
import EventCategories from '../components/event/EventCategories';
import EventDescription from '../components/event/EventDescription';
import { api } from '../services/api';
import { getSession } from '../services/supabase';
import type { EventCreateRequest } from '../types/events';

export interface PreviewFormData {
    title: string;
    description: string;
    date: string;
    time: string;
    endDate: string;
    endTime: string;
    category: string;
    maxCapacity: string;
    isPublic: boolean;
    city: string;
    street: string;
    houseNumber: string;
    postalCode: string;
    country: string;
}

type EditSection = 'title' | 'description' | 'datetime' | 'location' | 'category' | 'capacity' | 'visibility' | null;

function formatDateDisplay(date: string): string {
    if (!date) return 'Datum nicht gesetzt';
    try {
        const d = new Date(`${date}T12:00:00`);
        return new Intl.DateTimeFormat('de-DE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(d);
    } catch {
        return date;
    }
}

function formatTimeDisplay(time: string): string {
    if (!time) return '';
    return `${time} Uhr`;
}

export default function EventCreatePreview() {
    const { colors } = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{ title?: string; date?: string; time?: string }>();

    // Initialize form data from URL params (Step 1) with defaults
    const [data, setData] = useState<PreviewFormData>({
        title: params.title || '',
        description: '',
        date: params.date || '',
        time: params.time || '',
        endDate: '',
        endTime: '',
        category: '',
        maxCapacity: '',
        isPublic: true,
        city: '',
        street: '',
        houseNumber: '',
        postalCode: '',
        country: 'Deutschland',
    });

    const [editing, setEditing] = useState<EditSection>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [editedSections, setEditedSections] = useState<Set<EditSection>>(new Set());

    const onChange = (updates: Partial<PreviewFormData>) => {
        setData(prev => ({ ...prev, ...updates }));
    };

    const onBack = () => {
        router.back();
    };

    // Builds an ISO string with the device's local UTC offset so Supabase stores the correct UTC time.
    const localIso = (date: string, time: string): string => {
        const d = new Date(`${date}T${time}:00`);
        const tzOffset = -d.getTimezoneOffset();
        const sign = tzOffset >= 0 ? '+' : '-';
        const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
        return `${date}T${time}:00${sign}${pad(Math.floor(Math.abs(tzOffset) / 60))}:${pad(Math.abs(tzOffset) % 60)}`;
    };

    // Temp state for modal edits (so cancel doesn't persist)
    const [tempData, setTempData] = useState<Partial<PreviewFormData>>({});

    const openEdit = (section: EditSection) => {
        setTempData({});
        setEditing(section);
    };

    const saveEdit = () => {
        if (Object.keys(tempData).length > 0) {
            onChange(tempData);
        }
        setEditedSections((prev) => new Set(prev).add(editing));
        setEditing(null);
        setTempData({});
    };

    const categories = data.category
        ? data.category.split(',').map((c) => c.trim()).filter(Boolean)
        : [];

    const locationPrimary = data.city || 'Ort nicht gesetzt';
    const locationSecondary = [data.street, data.houseNumber, data.postalCode, data.country]
        .filter(Boolean)
        .join(', ');

    const dateDisplay = formatDateDisplay(data.date);
    const timeDisplay = formatTimeDisplay(data.time);
    const endDisplay = data.endDate && data.endTime
        ? `bis ${formatDateDisplay(data.endDate)}, ${formatTimeDisplay(data.endTime)}`
        : '';

    const infoRows = [
        { icon: '📅', primary: dateDisplay, secondary: [timeDisplay, endDisplay].filter(Boolean).join(' ') },
    ];

    const locationRows = [
        { icon: '📍', primary: locationPrimary, secondary: locationSecondary || undefined },
    ];

    const handleSubmit = async () => {
        setSubmitting(true);
        setSubmitError(null);

        const payload: EventCreateRequest = {
            title: data.title.trim(),
            starts_at: localIso(data.date.trim(), data.time.trim()),
            ends_at: data.endDate.trim() && data.endTime.trim()
                ? localIso(data.endDate.trim(), data.endTime.trim())
                : undefined,
            description: data.description.trim() || undefined,
            category: data.category.trim() || undefined,
            max_capacity: data.maxCapacity ? Number(data.maxCapacity) : undefined,
            is_public: data.isPublic,
            location: {
                city: data.city.trim() || 'Nicht angegeben',
                street: data.street.trim() || undefined,
                house_number: data.houseNumber.trim() || undefined,
                postal_code: data.postalCode.trim() || undefined,
                country: data.country.trim() || undefined,
            },
        };

        try {
            const token = await getSession();
            if (!token) {
                router.push('/login');
                setSubmitting(false);
                return;
            }
            const result = await api.createEvent(payload, token);
            // Navigate to Host-Ansicht (manage) so user can see stats and guest list
            router.replace(`/event/${result.event_id}/manage`);
        } catch (e) {
            console.error('Event creation failed:', e);
            setSubmitError('Fehler beim Erstellen. Bitte versuche es erneut.');
        } finally {
            setSubmitting(false);
        }
    };

    const getTempOrData = <K extends keyof PreviewFormData>(key: K): PreviewFormData[K] => {
        return (tempData[key] ?? data[key]) as PreviewFormData[K];
    };

    return (
        <ScreenWithNav>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
                <Navbar showCta={false} showBack onBackPress={onBack} />

            <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <EventHero
                    title={data.title}
                    subtitle={data.description?.slice(0, 50)}
                    categories={categories}
                    editMode
                    edited={editedSections.has('title')}
                    onEdit={() => openEdit('title')}
                />

                <View style={[styles.card, { backgroundColor: colors.background }]}>
                    <View style={styles.previewBadge}>
                        <Text style={[styles.previewBadgeText, { color: colors.tertiary }]}>
                            Vorschau
                        </Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

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

                    <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

                    <EventCategories
                        categories={categories}
                        editMode
                        edited={editedSections.has('category')}
                        onEdit={() => openEdit('category')}
                    />

                    <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

                    <EventDescription
                        description={data.description}
                        editMode
                        edited={editedSections.has('description')}
                        onEdit={() => openEdit('description')}
                    />

                    <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

                    {/* Visibility + Capacity section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Einstellungen</Text>
                            <EditButton onPress={() => openEdit('capacity')} edited={editedSections.has('capacity')} />
                        </View>
                        <View style={styles.settingsRow}>
                            <View style={styles.settingItem}>
                                <Text style={[styles.settingLabel, { color: colors.onSurfaceVariant }]}>Sichtbarkeit</Text>
                                <Text style={[styles.settingValue, { color: colors.onSurface }]}>
                                    {data.isPublic ? 'Öffentlich' : 'Privat'}
                                </Text>
                            </View>
                            <View style={styles.settingItem}>
                                <Text style={[styles.settingLabel, { color: colors.onSurfaceVariant }]}>Kapazität</Text>
                                <Text style={[styles.settingValue, { color: colors.onSurface }]}>
                                    {data.maxCapacity || 'Unbegrenzt'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {submitError && (
                        <View style={styles.errorContainer}>
                            <Text style={[styles.errorText, { color: colors.error }]}>{submitError}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={[styles.submitButton, { backgroundColor: colors.primary }, submitting && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={colors.onPrimary} />
                        ) : (
                            <Text style={[styles.submitButtonText, { color: colors.onPrimary }]}>
                                Event erstellen
                            </Text>
                        )}
                    </TouchableOpacity>

                    <Footer />
                </View>
            </ScrollView>

            {/* ── Edit Modals ── */}

            <EditModal
                visible={editing === 'title'}
                onClose={() => setEditing(null)}
                title="Titel bearbeiten"
                onSave={saveEdit}
            >
                <TextInput
                    style={[styles.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    value={getTempOrData('title')}
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
                    style={[styles.modalInput, styles.modalInputMultiline, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    value={getTempOrData('description')}
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
                <View style={styles.modalFieldGroup}>
                    <Text style={[styles.modalLabel, { color: colors.onSurfaceVariant }]}>Beginn</Text>
                    <View style={[styles.modalRow, { zIndex: 60 }]}>
                        <View style={styles.modalHalf}>
                            <DatePicker
                                value={getTempOrData('date')}
                                onChange={(v) => setTempData((p) => ({ ...p, date: v }))}
                                minDate={new Date()}
                            />
                        </View>
                        <View style={styles.modalHalf}>
                            <TimePicker
                                value={getTempOrData('time')}
                                onChange={(v) => setTempData((p) => ({ ...p, time: v }))}
                            />
                        </View>
                    </View>
                </View>
                <View style={styles.modalFieldGroup}>
                    <Text style={[styles.modalLabel, { color: colors.onSurfaceVariant }]}>Ende (optional)</Text>
                    <View style={[styles.modalRow, { zIndex: 50 }]}>
                        <View style={styles.modalHalf}>
                            <DatePicker
                                value={getTempOrData('endDate')}
                                onChange={(v) => setTempData((p) => ({ ...p, endDate: v }))}
                                minDate={new Date()}
                            />
                        </View>
                        <View style={styles.modalHalf}>
                            <TimePicker
                                value={getTempOrData('endTime')}
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
                <View style={styles.modalFieldGroup}>
                    <Text style={[styles.modalLabel, { color: colors.onSurfaceVariant }]}>Stadt</Text>
                    <TextInput
                        style={[styles.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                        value={getTempOrData('city')}
                        onChangeText={(v) => setTempData((p) => ({ ...p, city: v }))}
                        placeholder="z.B. Berlin"
                        placeholderTextColor={colors.onSurfaceVariant}
                    />
                </View>
                <View style={styles.modalRow}>
                    <View style={{ flex: 2 }}>
                        <Text style={[styles.modalLabel, { color: colors.onSurfaceVariant }]}>Straße</Text>
                        <TextInput
                            style={[styles.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                            value={getTempOrData('street')}
                            onChangeText={(v) => setTempData((p) => ({ ...p, street: v }))}
                            placeholder="Straßenname"
                            placeholderTextColor={colors.onSurfaceVariant}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.modalLabel, { color: colors.onSurfaceVariant }]}>Nr.</Text>
                        <TextInput
                            style={[styles.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                            value={getTempOrData('houseNumber')}
                            onChangeText={(v) => setTempData((p) => ({ ...p, houseNumber: v }))}
                            placeholder="Nr."
                            placeholderTextColor={colors.onSurfaceVariant}
                        />
                    </View>
                </View>
                <View style={styles.modalRow}>
                    <View style={styles.modalHalf}>
                        <Text style={[styles.modalLabel, { color: colors.onSurfaceVariant }]}>PLZ</Text>
                        <TextInput
                            style={[styles.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                            value={getTempOrData('postalCode')}
                            onChangeText={(v) => setTempData((p) => ({ ...p, postalCode: v }))}
                            placeholder="PLZ"
                            placeholderTextColor={colors.onSurfaceVariant}
                        />
                    </View>
                    <View style={styles.modalHalf}>
                        <Text style={[styles.modalLabel, { color: colors.onSurfaceVariant }]}>Land</Text>
                        <TextInput
                            style={[styles.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                            value={getTempOrData('country')}
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
                    style={[styles.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                    value={getTempOrData('category')}
                    onChangeText={(v) => setTempData((p) => ({ ...p, category: v }))}
                    placeholder="z.B. Musik, Sport, Kultur"
                    placeholderTextColor={colors.onSurfaceVariant}
                    autoFocus
                />
                <Text style={[styles.modalHint, { color: colors.onSurfaceVariant }]}>
                    Mehrere Kategorien mit Komma trennen
                </Text>
            </EditModal>

            <EditModal
                visible={editing === 'capacity'}
                onClose={() => setEditing(null)}
                title="Kapazität & Sichtbarkeit"
                onSave={saveEdit}
            >
                <View style={styles.modalFieldGroup}>
                    <Text style={[styles.modalLabel, { color: colors.onSurfaceVariant }]}>Max. Teilnehmer</Text>
                    <TextInput
                        style={[styles.modalInput, { color: colors.onSurface, backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}
                        value={getTempOrData('maxCapacity')}
                        onChangeText={(v) => setTempData((p) => ({ ...p, maxCapacity: v }))}
                        placeholder="Leer = Unbegrenzt"
                        placeholderTextColor={colors.onSurfaceVariant}
                        keyboardType="number-pad"
                    />
                </View>
                <View style={styles.modalFieldGroup}>
                    <Text style={[styles.modalLabel, { color: colors.onSurfaceVariant }]}>Sichtbarkeit</Text>
                    <View style={[styles.toggleRow, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                        <View style={styles.toggleText}>
                            <Text style={[styles.toggleLabel, { color: colors.onSurface }]}>
                                {(tempData.isPublic ?? data.isPublic) ? 'Öffentlich' : 'Privat'}
                            </Text>
                            <Text style={[styles.toggleSub, { color: colors.onSurfaceVariant }]}>
                                {(tempData.isPublic ?? data.isPublic)
                                    ? 'Jeder kann dein Event sehen'
                                    : 'Nur mit Einladungslink'}
                            </Text>
                        </View>
                        <Switch
                            value={tempData.isPublic ?? data.isPublic}
                            onValueChange={(v) => setTempData((p) => ({ ...p, isPublic: v }))}
                            trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
                            thumbColor={colors.onPrimary}
                        />
                    </View>
                </View>
            </EditModal>
        </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 0,
    },
    card: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
        paddingTop: 28,
        paddingHorizontal: 22,
        minHeight: 400,
    },
    previewBadge: {
        marginBottom: 16,
    },
    previewBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginBottom: 24,
        opacity: 0.5,
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
    errorContainer: {
        marginBottom: 16,
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
    },
    submitButton: {
        marginBottom: 24,
        paddingVertical: 16,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    // Modal styles
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
});
