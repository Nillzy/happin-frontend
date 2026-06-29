import React, { useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import Footer from '../components/atoms/Footer';

export default function ContactScreen() {
    const { colors } = useTheme();
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const canSubmit = name.trim() && email.trim() && message.trim();

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        await new Promise((r) => setTimeout(r, 800));
        setSubmitting(false);
        setSubmitted(true);
    };

    return (
        <ScreenWithNav showBottomNav={false}>
            <Head><title>Kontakt – Happin</title></Head>
            <ScrollView
                style={{ backgroundColor: colors.background }}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={20} color={colors.onSurfaceVariant} />
                    <Text style={[styles.backText, { color: colors.onSurfaceVariant }]}>Zurück</Text>
                </TouchableOpacity>

                <Text style={[styles.h1, { color: colors.onSurface }]}>Kontakt</Text>
                <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                    Hast du eine Frage oder möchtest du uns etwas mitteilen? Schreib uns gerne.
                </Text>

                {submitted ? (
                    <View style={[styles.successBox, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}30` }]}>
                        <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
                        <Text style={[styles.successTitle, { color: colors.onSurface }]}>Nachricht gesendet!</Text>
                        <Text style={[styles.successBody, { color: colors.onSurfaceVariant }]}>
                            Vielen Dank für deine Nachricht. Wir melden uns so schnell wie möglich bei dir.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.form}>
                        <Field label="Name" colors={colors}>
                            <TextInput
                                style={[styles.input, { color: colors.onSurface, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainer }]}
                                value={name}
                                onChangeText={setName}
                                placeholder="Dein Name"
                                placeholderTextColor={colors.onSurfaceVariant}
                                returnKeyType="next"
                            />
                        </Field>

                        <Field label="E-Mail" colors={colors}>
                            <TextInput
                                style={[styles.input, { color: colors.onSurface, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainer }]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="deine@email.de"
                                placeholderTextColor={colors.onSurfaceVariant}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                returnKeyType="next"
                            />
                        </Field>

                        <Field label="Nachricht" colors={colors}>
                            <TextInput
                                style={[styles.input, styles.textarea, { color: colors.onSurface, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainer }]}
                                value={message}
                                onChangeText={setMessage}
                                placeholder="Wie können wir dir helfen?"
                                placeholderTextColor={colors.onSurfaceVariant}
                                multiline
                                numberOfLines={5}
                                textAlignVertical="top"
                            />
                        </Field>

                        <TouchableOpacity
                            style={[styles.btn, { backgroundColor: canSubmit ? colors.primary : colors.surfaceContainerHigh }]}
                            onPress={handleSubmit}
                            disabled={!canSubmit || submitting}
                            activeOpacity={0.8}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color={colors.onPrimary} />
                            ) : (
                                <Text style={[styles.btnText, { color: canSubmit ? colors.onPrimary : colors.onSurfaceVariant }]}>
                                    Nachricht senden
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <Footer />
            </ScrollView>
        </ScreenWithNav>
    );
}

function Field({ label, children, colors }: { label: string; children: React.ReactNode; colors: any }) {
    return (
        <View style={styles.field}>
            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>{label}</Text>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 0,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
    },
    back: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 24,
    },
    backText: {
        fontSize: 14,
        fontWeight: '500',
    },
    h1: {
        fontSize: 32,
        fontWeight: '700',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 32,
    },
    form: {
        gap: 20,
        marginBottom: 16,
    },
    field: {
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    textarea: {
        minHeight: 120,
        paddingTop: 12,
    },
    btn: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
        marginTop: 4,
    },
    btnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    successBox: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 28,
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    successBody: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
    },
});
