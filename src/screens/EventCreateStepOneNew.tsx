import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import DatePicker from '../components/atoms/DatePicker';
import TimePicker from '../components/atoms/TimePicker';
import SegmentedControl from '../components/atoms/SegmentedControl';
import { api } from '../services/api';
import { getSession } from '../services/supabase';

export default function EventCreateStepOneNew() {
    const { colors } = useTheme();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [errors, setErrors] = useState<{ title?: string; date?: string; time?: string }>({});

    const validate = (): boolean => {
        const e: typeof errors = {};

        if (!title.trim()) e.title = 'Titel ist erforderlich';
        if (!date) e.date = 'Datum ist erforderlich';
        if (!time) e.time = 'Uhrzeit ist erforderlich';

        if (date && time && !e.date && !e.time) {
            const dt = new Date(`${date}T${time}:00`);
            if (dt <= new Date()) {
                e.date = 'Muss in der Zukunft liegen';
            }
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const localIso = (d: string, t: string): string => {
        const dt = new Date(`${d}T${t}:00`);
        const tzOffset = -dt.getTimezoneOffset();
        const sign = tzOffset >= 0 ? '+' : '-';
        const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
        return `${d}T${t}:00${sign}${pad(Math.floor(Math.abs(tzOffset) / 60))}:${pad(Math.abs(tzOffset) % 60)}`;
    };

    const handleNext = async () => {
        if (!validate()) return;
        setSubmitting(true);
        setSubmitError(null);

        try {
            const token = await getSession();
            if (!token) {
                router.push('/login');
                setSubmitting(false);
                return;
            }

            // TODO Backend: status 'draft' muss unterstuetzt werden.
            // Entwuerfe duerfen mit minimalen Pflichtfeldern erstellt werden.
            // Location ist fuer Entwuerfe optional (Backend muss null/leer akzeptieren).
            const draft = await api.createEvent({
                title: title.trim(),
                starts_at: localIso(date.trim(), time.trim()),
                is_public: visibility === 'public',
                status: 'draft',
                location: { city: '' },
            }, token);

            router.replace(`/event/${draft.event_id}/edit`);
        } catch (e) {
            console.error('Draft creation failed:', e);
            setSubmitError('Fehler beim Erstellen. Bitte versuche es erneut.');
        } finally {
            setSubmitting(false);
        }
    };

    const isFormValid = title.trim() && date && time;

    const handleBack = () => {
        router.back();
    };

    return (
        <ScreenWithNav>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <Navbar showCta={false} showBack onBackPress={handleBack} />
                {Platform.OS !== 'web' && (
                    <TouchableOpacity onPress={handleBack} style={styles.mobileBack} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
                        <Text style={[styles.mobileBackText, { color: colors.onSurface }]}>Zurück</Text>
                    </TouchableOpacity>
                )}

                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        style={Platform.OS === 'web' ? { overflow: 'visible' } as any : undefined}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
                                Event erstellen
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: colors.onSurfaceVariant }]}>
                                Schritt 1 von 2
                            </Text>
                        </View>

                        {/* Titel Card */}
                        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
                            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                                Titel
                            </Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    {
                                        color: colors.onSurface,
                                        borderColor: errors.title ? colors.error : 'transparent',
                                    },
                                ]}
                                value={title}
                                onChangeText={(v) => {
                                    setTitle(v);
                                    if (errors.title) setErrors((p) => ({ ...p, title: undefined }));
                                }}
                                placeholder="z.B. Sommerparty im Park"
                                placeholderTextColor={colors.onSurfaceVariant}
                                maxLength={255}
                            />
                            {errors.title && (
                                <Text style={[styles.errorText, { color: colors.error }]}>
                                    {errors.title}
                                </Text>
                            )}
                        </View>

                        {/* Datum & Uhrzeit Card */}
                        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, zIndex: 100 }, Platform.OS === 'web' ? { overflow: 'visible' } as any : null]}>
                            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                                Datum & Uhrzeit
                            </Text>
                            <View style={[styles.row, Platform.OS === 'web' ? { overflow: 'visible' } as any : null]}>
                                <View style={[styles.halfField, { zIndex: 51 }]}>
                                    <DatePicker
                                        value={date}
                                        onChange={(v) => {
                                            setDate(v);
                                            if (errors.date) setErrors((p) => ({ ...p, date: undefined }));
                                        }}
                                        placeholder="TT.MM.JJJJ"
                                        error={!!errors.date}
                                        minDate={new Date()}
                                    />
                                </View>
                                <View style={[styles.halfField, { zIndex: 50 }]}>
                                    <TimePicker
                                        value={time}
                                        onChange={(v) => {
                                            setTime(v);
                                            if (errors.time) setErrors((p) => ({ ...p, time: undefined }));
                                        }}
                                        placeholder="HH:MM"
                                        error={!!errors.time}
                                    />
                                </View>
                            </View>
                            {(errors.date || errors.time) && (
                                <Text style={[styles.errorText, { color: colors.error }]}>
                                    {errors.date || errors.time}
                                </Text>
                            )}
                        </View>

                        {/* Sichtbarkeit Card */}
                        <View style={[styles.card, { backgroundColor: colors.surfaceContainer, zIndex: 1 }]}>
                            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                                Sichtbarkeit
                            </Text>
                            <SegmentedControl
                                options={[
                                    { value: 'public', label: 'Öffentlich' },
                                    { value: 'private', label: 'Privat' },
                                ]}
                                value={visibility}
                                onChange={setVisibility}
                            />
                            <View style={styles.visibilityInfo}>
                                <Ionicons
                                    name={visibility === 'public' ? 'globe-outline' : 'lock-closed-outline'}
                                    size={18}
                                    color={colors.primary}
                                    style={{ marginRight: 10, marginTop: 1 }}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.visibilityTitle, { color: colors.onSurface }]}>
                                        {visibility === 'public' ? 'Für alle sichtbar' : 'Nur auf Einladung'}
                                    </Text>
                                    <Text style={[styles.visibilityDesc, { color: colors.onSurfaceVariant }]}>
                                        {visibility === 'public'
                                            ? 'Dein Event erscheint in der öffentlichen Suche und kann von jedem gefunden und besucht werden.'
                                            : 'Dein Event ist nur über einen Einladungslink erreichbar. Ideal für private Feiern oder geschlossene Gruppen.'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Error */}
                        {submitError && (
                            <View style={{ marginHorizontal: 16, marginBottom: 8 }}>
                                <Text style={{ color: colors.error, fontSize: 14, textAlign: 'center' }}>{submitError}</Text>
                            </View>
                        )}

                        {/* Weiter Button */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={handleNext}
                            disabled={!isFormValid || submitting}
                            style={[
                                styles.button,
                                { backgroundColor: (!isFormValid || submitting) ? colors.surfaceContainer : colors.primary }
                            ]}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color={colors.onPrimary} />
                            ) : (
                                <Text style={[styles.buttonText, { color: (!isFormValid || submitting) ? colors.onSurfaceVariant : colors.onPrimary }]}>
                                    Weiter
                                </Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.bottomSpacer} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    card: {
        marginHorizontal: 16,
        marginBottom: 24,
        padding: 20,
        borderRadius: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    input: {
        fontSize: 20,
        fontWeight: '500',
        paddingVertical: 12,
        paddingHorizontal: 0,
        borderBottomWidth: 0,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfField: {
        flex: 1,
    },
    hint: {
        fontSize: 12,
        marginTop: 8,
        lineHeight: 16,
    },
    visibilityInfo: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(128,128,128,0.15)',
    },
    visibilityTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 3,
    },
    visibilityDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    errorText: {
        fontSize: 12,
        marginTop: 6,
    },
    button: {
        marginHorizontal: 16,
        marginTop: 32,
        paddingVertical: 16,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    bottomSpacer: {
        height: 24,
    },
    mobileBack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 54 : 16,
        paddingBottom: 8,
    },
    mobileBackText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
