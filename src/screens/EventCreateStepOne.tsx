import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import Navbar from '../components/atoms/Navbar';
import DatePicker from '../components/atoms/DatePicker';
import TimePicker from '../components/atoms/TimePicker';
import { api } from '../services/api';
import { getSession } from '../services/supabase';

export default function EventCreateStepOne() {
    const { colors } = useTheme();
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [errors, setErrors] = useState<{ title?: string; date?: string; time?: string }>({});
    const [submitting, setSubmitting] = useState(false);

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

    const handleNext = async () => {
        if (!validate()) return;
        setSubmitting(true);

        try {
            const token = await getSession();
            if (!token) {
                router.replace('/login');
                return;
            }

            const startsAt = `${date}T${time}:00`;
            const result = await api.createEvent({
                title: title.trim(),
                starts_at: startsAt,
                is_public: true,
                status: 'draft',
                location: {},
            }, token);

            router.replace(`/event/${result.event_id}`);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
            setErrors({ title: `Fehler: ${msg}` });
        } finally {
            setSubmitting(false);
        }
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
                            Schritt 1 von 2
                        </Text>
                        <Text style={[styles.headerTitle, { color: colors.onBackground }]}>
                            Kerndaten
                        </Text>
                        <Text style={[styles.headerSub, { color: colors.onSurfaceVariant }]}>
                            Gib deinem Event einen Namen und wähle Datum und Uhrzeit.
                        </Text>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Titel *</Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    color: colors.onSurface,
                                    backgroundColor: colors.surfaceContainer,
                                    borderColor: errors.title ? colors.error : colors.outlineVariant,
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
                            <Text style={[styles.errorText, { color: colors.error }]}>{errors.title}</Text>
                        )}
                    </View>

                    <View style={[styles.row, { zIndex: 60 }]}>
                        <View style={styles.halfField}>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Datum *</Text>
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
                                {errors.date && (
                                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.date}</Text>
                                )}
                            </View>
                        </View>
                        <View style={styles.halfField}>
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Uhrzeit *</Text>
                                <TimePicker
                                    value={time}
                                    onChange={(v) => {
                                        setTime(v);
                                        if (errors.time) setErrors((p) => ({ ...p, time: undefined }));
                                    }}
                                    placeholder="HH:MM"
                                    error={!!errors.time}
                                />
                                {errors.time && (
                                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.time}</Text>
                                )}
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={[styles.nextButton, { backgroundColor: colors.primary }]}
                        onPress={handleNext}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={colors.onPrimary} />
                        ) : (
                            <Text style={[styles.nextButtonText, { color: colors.onPrimary }]}>
                                Weiter
                            </Text>
                        )}
                    </TouchableOpacity>
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
        paddingBottom: 48,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 32,
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
        marginBottom: 20,
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
        paddingHorizontal: 0,
    },
    nextButton: {
        marginHorizontal: 24,
        marginTop: 16,
        paddingVertical: 16,
        borderRadius: 9999,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
