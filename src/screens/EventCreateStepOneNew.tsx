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
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import DatePicker from '../components/atoms/DatePicker';
import TimePicker from '../components/atoms/TimePicker';
import SegmentedControl from '../components/atoms/SegmentedControl';

export default function EventCreateStepOneNew() {
    const { colors } = useTheme();
    const router = useRouter();

    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [visibility, setVisibility] = useState('public');
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

    const handleNext = () => {
        if (!validate()) return;

        router.push({
            pathname: '/events/create/step-2',
            params: {
                title: title.trim(),
                date: date.trim(),
                time: time.trim(),
                isPublic: visibility === 'public' ? 'true' : 'false',
            },
        });
    };

    const isFormValid = title.trim() && date && time;

    const handleBack = () => {
        router.back();
    };

    return (
        <ScreenWithNav>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <Navbar showCta={false} showBack onBackPress={handleBack} />

                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
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
                        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
                            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                                Datum & Uhrzeit
                            </Text>
                            <View style={[styles.row, { zIndex: 50 }]}>
                                <View style={styles.halfField}>
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
                                <View style={styles.halfField}>
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
                        <View style={[styles.card, { backgroundColor: colors.surfaceContainer }]}>
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
                            <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
                                {visibility === 'public'
                                    ? 'Jeder kann dein Event finden'
                                    : 'Nur mit Einladungslink sichtbar'}
                            </Text>
                        </View>

                        {/* Weiter Button */}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={handleNext}
                            disabled={!isFormValid}
                            style={[
                                styles.button,
                                { backgroundColor: !isFormValid ? colors.surfaceContainer : colors.primary }
                            ]}
                        >
                            <Text style={[styles.buttonText, { color: !isFormValid ? colors.onSurfaceVariant : colors.onPrimary }]}>
                                Weiter
                            </Text>
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
});
