import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Switch,
    Platform,
    ActivityIndicator,
    KeyboardAvoidingView,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import Navbar from '../components/atoms/Navbar';
import Footer from '../components/atoms/Footer';
import { api } from '../services/api';
import { getSession } from '../services/supabase';
import type { EventCreateRequest } from '../types/events';

interface FormData {
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

interface FormErrors {
    title?: string;
    date?: string;
    time?: string;
    city?: string;
}

const INITIAL_FORM: FormData = {
    title: '',
    description: '',
    date: '',
    time: '',
    endDate: '',
    endTime: '',
    category: '',
    maxCapacity: '',
    isPublic: true,
    city: '',
    street: '',
    houseNumber: '',
    postalCode: '',
    country: '',
};

function validate(form: FormData): FormErrors {
    const errors: FormErrors = {};

    if (!form.title.trim()) {
        errors.title = 'Titel ist erforderlich';
    }
    if (!form.date.trim()) {
        errors.date = 'Datum ist erforderlich';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date.trim())) {
        errors.date = 'Format: YYYY-MM-DD';
    }
    if (!form.time.trim()) {
        errors.time = 'Uhrzeit ist erforderlich';
    } else if (!/^\d{2}:\d{2}$/.test(form.time.trim())) {
        errors.time = 'Format: HH:MM';
    }
    if (form.date.trim() && form.time.trim() && !errors.date && !errors.time) {
        const dt = new Date(`${form.date.trim()}T${form.time.trim()}:00`);
        if (dt <= new Date()) {
            errors.date = 'Datum muss in der Zukunft liegen';
        }
    }
    if (!form.city.trim()) {
        errors.city = 'Stadt ist erforderlich';
    }

    return errors;
}

export default function EventCreateScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const [form, setForm] = useState<FormData>(INITIAL_FORM);
    const [errors, setErrors] = useState<FormErrors>({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        if (errors[key as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [key]: undefined }));
        }
    };

    const handleSubmit = async () => {
        const validationErrors = validate(form);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        const payload: EventCreateRequest = {
            title: form.title.trim(),
            starts_at: `${form.date.trim()}T${form.time.trim()}:00`,
            ends_at: form.endDate.trim() && form.endTime.trim()
                ? `${form.endDate.trim()}T${form.endTime.trim()}:00`
                : undefined,
            description: form.description.trim() || undefined,
            category: form.category.trim() || undefined,
            max_capacity: form.maxCapacity ? Number(form.maxCapacity) : undefined,
            is_public: form.isPublic,
            location: {
                city: form.city.trim(),
                street: form.street.trim() || undefined,
                house_number: form.houseNumber.trim() || undefined,
                postal_code: form.postalCode.trim() || undefined,
                country: form.country.trim() || undefined,
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
            router.replace(`/event/${result.event_id}`);
        } catch (e) {
            console.error('Event creation failed:', e);
            setSubmitError('Fehler beim Erstellen des Events. Bitte versuche es erneut.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderInput = (
        label: string,
        key: keyof FormData,
        options?: {
            placeholder?: string;
            multiline?: boolean;
            keyboardType?: 'default' | 'numeric';
            maxLength?: number;
        },
    ) => {
        const errorKey = key as keyof FormErrors;
        const error = errors[errorKey];

        return (
            <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>{label}</Text>
                <TextInput
                    style={[
                        styles.input,
                        options?.multiline && styles.inputMultiline,
                        {
                            color: colors.onSurface,
                            backgroundColor: colors.surfaceContainer,
                            borderColor: error ? colors.error : colors.outlineVariant,
                        },
                    ]}
                    value={form[key] as string}
                    onChangeText={(v) => updateField(key, v as FormData[typeof key])}
                    placeholder={options?.placeholder}
                    placeholderTextColor={colors.onSurfaceVariant}
                    multiline={options?.multiline}
                    keyboardType={options?.keyboardType}
                    maxLength={options?.maxLength}
                />
                {error && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <Navbar showCta={false} showBack />

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.header}>
                        <Text style={[styles.headerLabel, { color: colors.tertiary }]}>
                            Neues Event
                        </Text>
                        <Text style={[styles.headerTitle, { color: colors.onBackground }]}>
                            Event erstellen
                        </Text>
                        <Text style={[styles.headerSub, { color: colors.onSurfaceVariant }]}>
                            Erstelle ein neues Event und lade Freunde ein.
                        </Text>
                    </View>

                    {renderInput('Titel *', 'title', {
                        placeholder: 'z.B. Sommerparty im Park',
                        maxLength: 255,
                    })}
                    {renderInput('Beschreibung', 'description', {
                        placeholder: 'Beschreibe dein Event...',
                        multiline: true,
                    })}

                    <View style={styles.row}>
                        <View style={styles.halfField}>
                            {renderInput('Beginn Datum *', 'date', {
                                placeholder: 'YYYY-MM-DD',
                            })}
                        </View>
                        <View style={styles.halfField}>
                            {renderInput('Beginn Uhrzeit *', 'time', {
                                placeholder: 'HH:MM',
                            })}
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.halfField}>
                            {renderInput('Ende Datum', 'endDate', {
                                placeholder: 'YYYY-MM-DD',
                            })}
                        </View>
                        <View style={styles.halfField}>
                            {renderInput('Ende Uhrzeit', 'endTime', {
                                placeholder: 'HH:MM',
                            })}
                        </View>
                    </View>

                    {renderInput('Kategorie', 'category', {
                        placeholder: 'z.B. Musik, Sport, Kultur',
                    })}
                    {renderInput('Max. Teilnehmer', 'maxCapacity', {
                        placeholder: 'Optional',
                        keyboardType: 'numeric',
                    })}

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                            Sichtbarkeit
                        </Text>
                        <View
                            style={[
                                styles.toggleContainer,
                                {
                                    backgroundColor: colors.surfaceContainer,
                                    borderColor: colors.outlineVariant,
                                },
                            ]}
                        >
                            <View style={styles.toggleTextGroup}>
                                <Text style={[styles.toggleLabel, { color: colors.onSurface }]}>
                                    {form.isPublic ? 'Öffentlich' : 'Privat'}
                                </Text>
                                <Text
                                    style={[
                                        styles.toggleSublabel,
                                        { color: colors.onSurfaceVariant },
                                    ]}
                                >
                                    {form.isPublic
                                        ? 'Jeder kann dein Event sehen und teilnehmen'
                                        : 'Nur Personen mit Einladungslink können teilnehmen'}
                                </Text>
                            </View>
                            <Switch
                                value={form.isPublic}
                                onValueChange={(v) => updateField('isPublic', v)}
                                trackColor={{
                                    false: colors.surfaceContainerHigh,
                                    true: colors.primary,
                                }}
                                thumbColor={colors.onPrimary}
                            />
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.onBackground }]}>
                            Veranstaltungsort
                        </Text>
                    </View>

                    {renderInput('Stadt *', 'city', { placeholder: 'z.B. Berlin' })}

                    <View style={styles.row}>
                        <View style={[styles.halfField, { flex: 2 }]}>
                            {renderInput('Straße', 'street', {
                                placeholder: 'Straßenname',
                            })}
                        </View>
                        <View style={[styles.halfField, { flex: 1 }]}>
                            {renderInput('Nr.', 'houseNumber', {
                                placeholder: 'Nr.',
                            })}
                        </View>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.halfField}>
                            {renderInput('PLZ', 'postalCode', {
                                placeholder: 'PLZ',
                            })}
                        </View>
                        <View style={styles.halfField}>
                            {renderInput('Land', 'country', {
                                placeholder: 'z.B. Deutschland',
                            })}
                        </View>
                    </View>

                    {submitError && (
                        <View style={styles.submitErrorContainer}>
                            <Text style={[styles.submitErrorText, { color: colors.error }]}>
                                {submitError}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={[
                            styles.submitButton,
                            { backgroundColor: colors.primary },
                            submitting && { opacity: 0.7 },
                        ]}
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
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
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
        paddingBottom: 0,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 24,
    },
    headerLabel: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    headerSub: {
        fontSize: 15,
        lineHeight: 22,
    },
    fieldGroup: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
    },
    inputMultiline: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 16,
    },
    halfField: {
        flex: 1,
        marginBottom: 0,
        paddingHorizontal: 0,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    toggleTextGroup: {
        flex: 1,
        marginRight: 12,
    },
    toggleLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    toggleSublabel: {
        fontSize: 12,
        marginTop: 2,
    },
    sectionHeader: {
        paddingHorizontal: 24,
        marginTop: 8,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    submitErrorContainer: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    submitErrorText: {
        fontSize: 14,
        textAlign: 'center',
    },
    submitButton: {
        marginHorizontal: 24,
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
});
