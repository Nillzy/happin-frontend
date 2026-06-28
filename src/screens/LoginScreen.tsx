import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/src/hooks/use-theme';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import Navbar from '../components/atoms/Navbar';
import Footer from '../components/atoms/Footer';
import { sendOtp, verifyOtp } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'email' | 'otp';

const RESEND_COUNTDOWN = 60;
const OTP_LENGTH = 6;

// ── Animated step container ───────────────────────────────────────────────────

function StepView({
    visible,
    children,
}: {
    visible: boolean;
    children: React.ReactNode;
}) {
    const opacity = useSharedValue(visible ? 1 : 0);
    const translateY = useSharedValue(visible ? 0 : 20);

    useEffect(() => {
        opacity.value = withTiming(visible ? 1 : 0, {
            duration: 280,
            easing: Easing.out(Easing.quad),
        });
        translateY.value = withTiming(visible ? 0 : 20, {
            duration: 280,
            easing: Easing.out(Easing.quad),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
        pointerEvents: opacity.value === 0 ? 'none' : 'auto',
    }));

    if (!visible && opacity.value === 0) return null;

    return <Animated.View style={style}>{children}</Animated.View>;
}

// ── OTP digit input ───────────────────────────────────────────────────────────

function OtpInput({
    value,
    onChange,
    onSubmit,
    colors,
}: {
    value: string;
    onChange: (v: string) => void;
    onSubmit: () => void;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const inputRef = useRef<TextInput>(null);

    const digits = value.padEnd(OTP_LENGTH, ' ').split('');

    return (
        <TouchableOpacity onPress={() => inputRef.current?.focus()} style={s.otpRow} activeOpacity={1}>
            {/* Hidden real input */}
            <TextInput
                ref={inputRef}
                value={value}
                onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                style={s.otpHiddenInput}
                autoFocus
                caretHidden
                returnKeyType="done"
                onSubmitEditing={onSubmit}
            />
            {digits.map((d, i) => {
                const filled = i < value.length;
                const active = i === value.length;
                return (
                    <View
                        key={i}
                        style={[
                            s.otpCell,
                            {
                                backgroundColor: colors.surfaceContainerLow,
                                borderColor: active
                                    ? colors.primary
                                    : filled
                                    ? colors.outline
                                    : colors.outlineVariant,
                            },
                        ]}
                    >
                        <Text style={[s.otpDigit, { color: colors.onSurface }]}>
                            {filled ? d : ''}
                        </Text>
                        {active && <View style={[s.otpCursor, { backgroundColor: colors.primary }]} />}
                    </View>
                );
            })}
        </TouchableOpacity>
    );
}

// ── Main screen ───────────────────────────────────────────────────────────────

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { session, loading } = useAuth();

    useEffect(() => {
        if (!loading && session) {
            router.replace('/events');
        }
    }, [loading, session]); // eslint-disable-line react-hooks/exhaustive-deps

    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [otpError, setOtpError] = useState(false);
    const [resendSeconds, setResendSeconds] = useState(RESEND_COUNTDOWN);
    const [isSending, setIsSending] = useState(false);
    const resendRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const shakeX = useSharedValue(0);
    const shakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shakeX.value }],
    }));

    const triggerShake = useCallback(() => {
        shakeX.value = withSequence(
            withTiming(-8, { duration: 60 }),
            withTiming(8, { duration: 60 }),
            withTiming(-6, { duration: 55 }),
            withTiming(6, { duration: 55 }),
            withTiming(0, { duration: 50 }),
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const startResendTimer = useCallback(() => {
        setResendSeconds(RESEND_COUNTDOWN);
        if (resendRef.current) clearInterval(resendRef.current);
        resendRef.current = setInterval(() => {
            setResendSeconds((s) => {
                if (s <= 1) {
                    clearInterval(resendRef.current!);
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
    }, []);

    useEffect(() => {
        return () => {
            if (resendRef.current) clearInterval(resendRef.current);
        };
    }, []);

    // ── Step handlers ──────────────────────────────────────────────────────

    const handleEmailSubmit = async () => {
        if (!isValidEmail(email) || isSending) return;
        setIsSending(true);
        try {
            await sendOtp(email);
            setOtp('');
            setOtpError(false);
            startResendTimer();
            setStep('otp');
        } catch {
            triggerShake();
        } finally {
            setIsSending(false);
        }
    };

    const handleResend = async () => {
        if (resendSeconds > 0) return;
        setIsSending(true);
        try {
            await sendOtp(email);
            setOtp('');
            setOtpError(false);
            startResendTimer();
        } catch {
            // silently ignore — user can retry
        } finally {
            setIsSending(false);
        }
    };

    const handleVerify = async () => {
        if (otp.length !== OTP_LENGTH) return;
        try {
            // Supabase client will automatically store the session in encrypted storage
            // No need to manually store tokens anymore
            await verifyOtp(email, otp);

            // Session is now persisted and will be available via AuthContext
            router.replace('/events');
        } catch (e) {
            console.error('OTP verification failed:', e);
            setOtpError(true);
            triggerShake();
        }
    };

    const handleOtpChange = (v: string) => {
        setOtp(v);
        if (otpError) setOtpError(false);
    };

    const canSubmitEmail = isValidEmail(email);
    const canVerify = otp.length === OTP_LENGTH;

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView
            style={[s.root, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Head><title>Anmelden – Happin</title></Head>
            <Navbar showBack />
            <ScrollView
                contentContainerStyle={s.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >

                {/* ── Step: Email ── */}
                {step === 'email' && (
                    <StepView visible>
                        <Text style={[s.heading, { color: colors.onBackground }]}>
                            Deine E-Mail,{'\n'}
                            <Text style={{ color: colors.primary }}>dein Zugang.</Text>
                        </Text>
                        <Text style={[s.subheading, { color: colors.onSurfaceVariant }]}>
                            Neu oder wiederkehrend — melde dich einfach mit deiner E-Mail-Adresse an.
                        </Text>

                        <View style={s.inputGroup}>
                            <Text style={[s.inputLabel, { color: colors.onSurfaceVariant }]}>E-Mail-Adresse</Text>
                            <View
                                style={[
                                    s.emailInputRow,
                                    {
                                        backgroundColor: colors.surfaceContainerLow,
                                        borderColor: email.length > 0 ? colors.primary : colors.outlineVariant,
                                    },
                                ]}
                            >
                                <TextInput
                                    style={[s.emailInput, { color: colors.onSurface }]}
                                    placeholder="name@beispiel.de"
                                    placeholderTextColor={colors.outline}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="email"
                                    textContentType="emailAddress"
                                    importantForAutofill="yes"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoFocus
                                    returnKeyType="done"
                                    onSubmitEditing={handleEmailSubmit}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                s.primaryBtn,
                                {
                                    backgroundColor: canSubmitEmail && !isSending
                                        ? colors.primary
                                        : colors.surfaceContainerHigh,
                                },
                            ]}
                            onPress={handleEmailSubmit}
                            disabled={!canSubmitEmail || isSending}
                            activeOpacity={0.85}
                        >
                            <Text
                                style={[
                                    s.primaryBtnText,
                                    {
                                        color: canSubmitEmail && !isSending
                                            ? colors.onPrimary
                                            : colors.onSurfaceVariant,
                                    },
                                ]}
                            >
                                {isSending ? 'Sende Code…' : 'Weiter'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={[s.legalText, { color: colors.onSurfaceVariant }]}>
                            Mit der Anmeldung stimmst du unseren{' '}
                            <Text style={{ color: colors.primary }}>Nutzungsbedingungen</Text> zu.
                        </Text>
                    </StepView>
                )}

                {/* ── Step: OTP ── */}
                {step === 'otp' && (
                    <StepView visible>
                        <Text style={[s.heading, { color: colors.onBackground }]}>
                            Code{'\n'}
                            <Text style={{ color: colors.primary }}>eingeben.</Text>
                        </Text>
                        <Text style={[s.subheading, { color: colors.onSurfaceVariant }]}>
                            E-Mail-Code gesendet an{' '}
                            <Text style={{ color: colors.onSurface, fontWeight: '600' }}>{email}</Text>
                        </Text>

                        <Animated.View style={shakeStyle}>
                            <OtpInput value={otp} onChange={handleOtpChange} onSubmit={handleVerify} colors={colors} />
                        </Animated.View>

                        {otpError && (
                            <Text style={[s.errorText, { color: colors.error }]}>
                                Falscher Code. Bitte erneut versuchen.
                            </Text>
                        )}

                        <TouchableOpacity
                            style={[
                                s.primaryBtn,
                                {
                                    backgroundColor: canVerify ? colors.primary : colors.surfaceContainerHigh,
                                    marginTop: 28,
                                },
                            ]}
                            onPress={handleVerify}
                            disabled={!canVerify}
                            activeOpacity={0.85}
                        >
                            <Text
                                style={[
                                    s.primaryBtnText,
                                    { color: canVerify ? colors.onPrimary : colors.onSurfaceVariant },
                                ]}
                            >
                                Bestätigen
                            </Text>
                        </TouchableOpacity>

                        {/* Resend row */}
                        <View style={s.resendRow}>
                            <Text style={[s.resendText, { color: colors.onSurfaceVariant }]}>
                                Kein Code erhalten?{' '}
                            </Text>
                            {resendSeconds > 0 ? (
                                <Text style={[s.resendText, { color: colors.outline }]}>
                                    Erneut in {resendSeconds}s
                                </Text>
                            ) : (
                                <TouchableOpacity onPress={handleResend} disabled={isSending}>
                                    <Text style={[s.resendLink, { color: isSending ? colors.outline : colors.primary }]}>
                                        {isSending ? 'Sende…' : 'Erneut senden'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </StepView>
                )}
                <Footer />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 48,
    },
    heading: {
        fontSize: 36,
        fontWeight: '800',
        letterSpacing: -1,
        lineHeight: 44,
        marginBottom: 12,
    },
    subheading: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 36,
    },

    // Email input
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    emailInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
        overflow: 'hidden',
        minHeight: 54,
    },
    emailInput: {
        flex: 1,
        paddingHorizontal: 14,
        fontSize: 17,
        fontWeight: '500',
        height: 54,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },

    // OTP
    otpRow: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
    },
    otpHiddenInput: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    otpCell: {
        width: 46,
        height: 56,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpDigit: {
        fontSize: 22,
        fontWeight: '700',
    },
    otpCursor: {
        position: 'absolute',
        bottom: 10,
        width: 18,
        height: 2,
        borderRadius: 1,
    },
    errorText: {
        fontSize: 13,
        marginTop: 10,
        fontWeight: '500',
    },
    resendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
    },
    resendText: {
        fontSize: 14,
    },
    resendLink: {
        fontSize: 14,
        fontWeight: '700',
    },

    // Buttons
    primaryBtn: {
        borderRadius: 12,
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    primaryBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },

    legalText: {
        fontSize: 12,
        lineHeight: 18,
        marginTop: 20,
        textAlign: 'center',
    },

});

