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
    Pressable,
    Modal,
    FlatList,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/use-theme';
import { useAppNavigation } from '../utils/useAppNavigation';
import { SmsIcon, WhatsAppIcon } from '../components/atoms/icons';

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'phone' | 'channel' | 'otp';
type OtpChannel = 'sms' | 'whatsapp';

interface Country {
    code: string;   // ISO 3166-1 alpha-2
    flag: string;
    name: string;
    dial: string;   // e.g. "+49"
}

const COUNTRIES: Country[] = [
    { code: 'DE', flag: '🇩🇪', name: 'Deutschland',         dial: '+49'  },
    { code: 'AT', flag: '🇦🇹', name: 'Österreich',          dial: '+43'  },
    { code: 'CH', flag: '🇨🇭', name: 'Schweiz',             dial: '+41'  },
    { code: 'US', flag: '🇺🇸', name: 'USA',                 dial: '+1'   },
    { code: 'GB', flag: '🇬🇧', name: 'United Kingdom',      dial: '+44'  },
    { code: 'FR', flag: '🇫🇷', name: 'Frankreich',          dial: '+33'  },
    { code: 'IT', flag: '🇮🇹', name: 'Italien',             dial: '+39'  },
    { code: 'ES', flag: '🇪🇸', name: 'Spanien',             dial: '+34'  },
    { code: 'NL', flag: '🇳🇱', name: 'Niederlande',         dial: '+31'  },
    { code: 'BE', flag: '🇧🇪', name: 'Belgien',             dial: '+32'  },
    { code: 'PL', flag: '🇵🇱', name: 'Polen',               dial: '+48'  },
    { code: 'SE', flag: '🇸🇪', name: 'Schweden',            dial: '+46'  },
    { code: 'NO', flag: '🇳🇴', name: 'Norwegen',            dial: '+47'  },
    { code: 'DK', flag: '🇩🇰', name: 'Dänemark',            dial: '+45'  },
    { code: 'FI', flag: '🇫🇮', name: 'Finnland',            dial: '+358' },
    { code: 'PT', flag: '🇵🇹', name: 'Portugal',            dial: '+351' },
    { code: 'GR', flag: '🇬🇷', name: 'Griechenland',        dial: '+30'  },
    { code: 'CZ', flag: '🇨🇿', name: 'Tschechien',          dial: '+420' },
    { code: 'HU', flag: '🇭🇺', name: 'Ungarn',              dial: '+36'  },
    { code: 'RO', flag: '🇷🇴', name: 'Rumänien',            dial: '+40'  },
    { code: 'HR', flag: '🇭🇷', name: 'Kroatien',            dial: '+385' },
    { code: 'TR', flag: '🇹🇷', name: 'Türkei',              dial: '+90'  },
    { code: 'RU', flag: '🇷🇺', name: 'Russland',            dial: '+7'   },
    { code: 'UA', flag: '🇺🇦', name: 'Ukraine',             dial: '+380' },
    { code: 'CN', flag: '🇨🇳', name: 'China',               dial: '+86'  },
    { code: 'JP', flag: '🇯🇵', name: 'Japan',               dial: '+81'  },
    { code: 'KR', flag: '🇰🇷', name: 'Südkorea',            dial: '+82'  },
    { code: 'IN', flag: '🇮🇳', name: 'Indien',              dial: '+91'  },
    { code: 'BR', flag: '🇧🇷', name: 'Brasilien',           dial: '+55'  },
    { code: 'MX', flag: '🇲🇽', name: 'Mexiko',              dial: '+52'  },
    { code: 'AR', flag: '🇦🇷', name: 'Argentinien',         dial: '+54'  },
    { code: 'CA', flag: '🇨🇦', name: 'Kanada',              dial: '+1'   },
    { code: 'AU', flag: '🇦🇺', name: 'Australien',          dial: '+61'  },
    { code: 'NZ', flag: '🇳🇿', name: 'Neuseeland',          dial: '+64'  },
    { code: 'ZA', flag: '🇿🇦', name: 'Südafrika',           dial: '+27'  },
    { code: 'NG', flag: '🇳🇬', name: 'Nigeria',             dial: '+234' },
    { code: 'EG', flag: '🇪🇬', name: 'Ägypten',             dial: '+20'  },
    { code: 'MA', flag: '🇲🇦', name: 'Marokko',             dial: '+212' },
    { code: 'IL', flag: '🇮🇱', name: 'Israel',              dial: '+972' },
    { code: 'SA', flag: '🇸🇦', name: 'Saudi-Arabien',       dial: '+966' },
    { code: 'AE', flag: '🇦🇪', name: 'Emirate',             dial: '+971' },
    { code: 'SG', flag: '🇸🇬', name: 'Singapur',            dial: '+65'  },
    { code: 'TH', flag: '🇹🇭', name: 'Thailand',            dial: '+66'  },
    { code: 'ID', flag: '🇮🇩', name: 'Indonesien',          dial: '+62'  },
    { code: 'PH', flag: '🇵🇭', name: 'Philippinen',         dial: '+63'  },
];

const RESEND_COUNTDOWN = 60;    //TODO: also check in backend; countdown could be manipulated
const OTP_LENGTH = 6;

// ── Country picker modal ──────────────────────────────────────────────────────

function CountryPicker({
    visible,
    selected,
    onSelect,
    onClose,
    colors,
}: {
    visible: boolean;
    selected: Country;
    onSelect: (c: Country) => void;
    onClose: () => void;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const [query, setQuery] = useState('');

    const filtered = query.trim()
        ? COUNTRIES.filter(
              (c) =>
                  c.name.toLowerCase().includes(query.toLowerCase()) ||
                  c.dial.includes(query) ||
                  c.code.toLowerCase().includes(query.toLowerCase()),
          )
        : COUNTRIES;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <Pressable style={s.modalBackdrop} onPress={onClose} />
            <View style={[s.modalSheet, { backgroundColor: colors.surfaceContainerLow }]}>
                {/* Handle */}
                <View style={[s.modalHandle, { backgroundColor: colors.outlineVariant }]} />

                <Text style={[s.modalTitle, { color: colors.onSurface }]}>Land auswählen</Text>

                {/* Search */}
                <View style={[s.modalSearch, { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant }]}>
                    <Text style={[s.modalSearchIcon, { color: colors.outline }]}>🔍</Text>
                    <TextInput
                        style={[s.modalSearchInput, { color: colors.onSurface }]}
                        placeholder="Suchen…"
                        placeholderTextColor={colors.outline}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus={false}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Text style={[s.modalSearchClear, { color: colors.outline }]}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.code}
                    keyboardShouldPersistTaps="handled"
                    style={s.modalList}
                    renderItem={({ item }) => {
                        const isSelected = item.code === selected.code;
                        return (
                            <TouchableOpacity
                                style={[
                                    s.modalItem,
                                    {
                                        backgroundColor: isSelected
                                            ? `${colors.primary}14`
                                            : 'transparent',
                                        borderColor: isSelected
                                            ? `${colors.primary}30`
                                            : 'transparent',
                                    },
                                ]}
                                onPress={() => {
                                    onSelect(item);
                                    onClose();
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={s.modalItemFlag}>{item.flag}</Text>
                                <Text style={[s.modalItemName, { color: colors.onSurface }]}>
                                    {item.name}
                                </Text>
                                <Text style={[s.modalItemDial, { color: isSelected ? colors.primary : colors.onSurfaceVariant }]}>
                                    {item.dial}
                                </Text>
                                {isSelected && (
                                    <Text style={[s.modalItemCheck, { color: colors.primary }]}>✓</Text>
                                )}
                            </TouchableOpacity>
                        );
                    }}
                    ItemSeparatorComponent={() => (
                        <View style={[s.modalSeparator, { backgroundColor: colors.outlineVariant }]} />
                    )}
                />
            </View>
        </Modal>
    );
}

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
    }, [visible]);

    const style = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
        // Hide from layout when invisible to avoid phantom touch targets
        pointerEvents: opacity.value === 0 ? 'none' : 'auto',
    }));

    if (!visible && opacity.value === 0) return null;

    return <Animated.View style={style}>{children}</Animated.View>;
}

// ── OTP digit input ───────────────────────────────────────────────────────────

function OtpInput({
    value,
    onChange,
    colors,
}: {
    value: string;
    onChange: (v: string) => void;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const inputRef = useRef<TextInput>(null);

    const digits = value.padEnd(OTP_LENGTH, ' ').split('');

    return (
        <Pressable onPress={() => inputRef.current?.focus()} style={s.otpRow}>
            {/* Hidden real input */}
            <TextInput
                ref={inputRef}
                value={value}
                onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                style={s.otpHiddenInput}
                autoFocus
                caretHidden
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
        </Pressable>
    );
}

// ── Channel button ────────────────────────────────────────────────────────────

function ChannelButton({
    selected,
    onPress,
    icon,
    label,
    sublabel,
    colors,
}: {
    selected: boolean;
    onPress: () => void;
    icon: React.ReactNode;
    label: string;
    sublabel: string;
    colors: ReturnType<typeof useTheme>['colors'];
}) {
    const scale = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
        scale.value = withSequence(
            withTiming(0.96, { duration: 80 }),
            withSpring(1, { damping: 12, stiffness: 300 }),
        );
        onPress();
    };

    return (
        <Animated.View style={animStyle}>
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.85}
                style={[
                    s.channelBtn,
                    {
                        backgroundColor: selected
                            ? `${colors.primary}18`
                            : colors.surfaceContainerLow,
                        borderColor: selected ? colors.primary : colors.outlineVariant,
                    },
                ]}
            >
                <View style={[s.channelIconWrap, { backgroundColor: selected ? `${colors.primary}22` : colors.surfaceContainer }]}>
                    {icon}
                </View>
                <View style={s.channelText}>
                    <Text style={[s.channelLabel, { color: colors.onSurface }]}>{label}</Text>
                    <Text style={[s.channelSublabel, { color: colors.onSurfaceVariant }]}>{sublabel}</Text>
                </View>
                <View
                    style={[
                        s.channelRadio,
                        {
                            borderColor: selected ? colors.primary : colors.outline,
                            backgroundColor: selected ? colors.primary : 'transparent',
                        },
                    ]}
                >
                    {selected && <View style={s.channelRadioDot} />}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LoginScreen() {
    const { colors, isDark } = useTheme();
    const navigation = useAppNavigation();

    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState<Country>(COUNTRIES[0]); // default: DE
    const [pickerVisible, setPickerVisible] = useState(false);
    const [channel, setChannel] = useState<OtpChannel>('sms');
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

    const handlePhoneSubmit = () => {
        if (phone.replace(/\D/g, '').length < 7) return;
        setStep('channel');
    };

    const handleSendOtp = async () => {
        setIsSending(true);
        console.log(phone);
        // Mock: simulate network delay
        await new Promise((r) => setTimeout(r, 800));
        setIsSending(false);
        setOtp('');
        setOtpError(false);
        startResendTimer();
        setStep('otp');
    };

    const handleResend = async () => {
        if (resendSeconds > 0) return;
        setIsSending(true);
        await new Promise((r) => setTimeout(r, 600));
        setIsSending(false);
        setOtp('');
        setOtpError(false);
        startResendTimer();
    };

    const handleVerify = () => {
        // Mock: accept any 6-digit code
        if (otp.length !== OTP_LENGTH) return;
        // TODO: In a real app: verify otp against backend
        const isValid = otp.length === OTP_LENGTH; // always true for mock
        if (isValid) {
            // TODO: navigate to main app once built
            // TODO: Set session cookie!!!
            // TODO: Next page should not be viewable by just opening the URL!

            navigation.navigate('Event');
        } else {
            setOtpError(true);
            triggerShake();
        }
    };

    const handleOtpChange = (v: string) => {
        setOtp(v);
        if (otpError) setOtpError(false);
    };

    const phoneClean = phone.replace(/\D/g, '');
    const canSubmitPhone = phoneClean.length >= 7;
    const canVerify = otp.length === OTP_LENGTH;

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView
            style={[s.root, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={s.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Back button */}
                <TouchableOpacity
                    style={s.backBtn}
                    onPress={() => {
                        if (step === 'phone') navigation.goBack();
                        else if (step === 'channel') setStep('phone');
                        else if (step === 'otp') setStep('channel');
                    }}
                >
                    <Text style={[s.backBtnText, { color: colors.onSurfaceVariant }]}>← Zurück</Text>
                </TouchableOpacity>

                {/* Logo */}
                <Text style={[s.logo, { color: colors.primary }]}>happin</Text>

                {/* ── Step: Phone ── */}
                {step === 'phone' && (
                    <StepView visible>
                        <Text style={[s.heading, { color: colors.onBackground }]}>
                            Deine Nummer,{'\n'}
                            <Text style={{ color: colors.primary }}>dein Zugang.</Text>
                        </Text>
                        <Text style={[s.subheading, { color: colors.onSurfaceVariant }]}>
                            Neu oder wiederkehrend — melde dich einfach mit deiner Handynummer an.
                        </Text>

                        <View style={s.inputGroup}>
                            <Text style={[s.inputLabel, { color: colors.onSurfaceVariant }]}>Handynummer</Text>
                            <View
                                style={[
                                    s.phoneInputRow,
                                    {
                                        backgroundColor: colors.surfaceContainerLow,
                                        borderColor: phone.length > 0 ? colors.primary : colors.outlineVariant,
                                    },
                                ]}
                            >
                                <TouchableOpacity
                                    style={[s.flagWrap, { borderRightColor: colors.outlineVariant }]}
                                    onPress={() => setPickerVisible(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={s.flag}>{country.flag}</Text>
                                    <Text style={[s.dialCode, { color: colors.onSurfaceVariant }]}>{country.dial}</Text>
                                    <Text style={[s.dialChevron, { color: colors.outline }]}>▾</Text>
                                </TouchableOpacity>
                                <TextInput
                                    style={[s.phoneInput, { color: colors.onSurface }]}
                                    placeholder="170 1234567"
                                    placeholderTextColor={colors.outline}
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                    autoFocus
                                    returnKeyType="done"
                                    onSubmitEditing={handlePhoneSubmit}
                                />
                            </View>
                        </View>

                        <CountryPicker
                            visible={pickerVisible}
                            selected={country}
                            onSelect={setCountry}
                            onClose={() => setPickerVisible(false)}
                            colors={colors}
                        />

                        <TouchableOpacity
                            style={[
                                s.primaryBtn,
                                {
                                    backgroundColor: canSubmitPhone ? colors.primary : colors.surfaceContainerHigh,
                                },
                            ]}
                            onPress={handlePhoneSubmit}
                            disabled={!canSubmitPhone}
                            activeOpacity={0.85}
                        >
                            <Text
                                style={[
                                    s.primaryBtnText,
                                    {
                                        color: canSubmitPhone ? colors.onPrimary : colors.onSurfaceVariant,
                                    },
                                ]}
                            >
                                Weiter
                            </Text>
                        </TouchableOpacity>

                        <Text style={[s.legalText, { color: colors.onSurfaceVariant }]}>
                            Mit der Anmeldung stimmst du unseren{' '}
                            <Text style={{ color: colors.primary }}>Nutzungsbedingungen</Text> zu.
                        </Text>
                    </StepView>
                )}

                {/* ── Step: Channel ── */}
                {step === 'channel' && (
                    <StepView visible>
                        <Text style={[s.heading, { color: colors.onBackground }]}>
                            Wie soll dein{'\n'}
                            <Text style={{ color: colors.primary }}>Code ankommen?</Text>
                        </Text>
                        <Text style={[s.subheading, { color: colors.onSurfaceVariant }]}>
                            Wir schicken dir einen 6-stelligen Code an{' '}
                            <Text style={{ color: colors.onSurface, fontWeight: '600' }}>
                                {country.dial} {phone}
                            </Text>
                        </Text>

                        <View style={s.channelList}>
                            <ChannelButton
                                selected={channel === 'sms'}
                                onPress={() => setChannel('sms')}
                                icon={<SmsIcon size={22} color={channel === 'sms' ? colors.primary : colors.onSurfaceVariant} />}
                                label="SMS"
                                sublabel="Code per Textnachricht"
                                colors={colors}
                            />
                            <ChannelButton
                                selected={channel === 'whatsapp'}
                                onPress={() => setChannel('whatsapp')}
                                icon={<WhatsAppIcon size={22} color={channel === 'whatsapp' ? colors.primary : colors.onSurfaceVariant} />}
                                label="WhatsApp"
                                sublabel="Code über WhatsApp"
                                colors={colors}
                            />
                        </View>

                        <TouchableOpacity
                            style={[
                                s.primaryBtn,
                                { backgroundColor: isSending ? colors.surfaceContainerHigh : colors.primary },
                            ]}
                            onPress={handleSendOtp}
                            disabled={isSending}
                            activeOpacity={0.85}
                        >
                            <Text style={[s.primaryBtnText, { color: isSending ? colors.onSurfaceVariant : colors.onPrimary }]}>
                                {isSending ? 'Sende Code…' : 'Code senden'}
                            </Text>
                        </TouchableOpacity>
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
                            {channel === 'sms' ? 'SMS' : 'WhatsApp'}-Code gesendet an{' '}
                            <Text style={{ color: colors.onSurface, fontWeight: '600' }}>{country.dial} {phone}</Text>
                        </Text>

                        <Animated.View style={shakeStyle}>
                            <OtpInput value={otp} onChange={handleOtpChange} colors={colors} />
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
        paddingTop: 60,
        paddingBottom: 48,
    },
    backBtn: {
        alignSelf: 'flex-start',
        marginBottom: 32,
        paddingVertical: 4,
    },
    backBtnText: {
        fontSize: 15,
        fontWeight: '500',
    },
    logo: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.8,
        marginBottom: 36,
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

    // Phone input
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
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1.5,
        overflow: 'hidden',
        minHeight: 54,
    },
    flagWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        gap: 6,
        borderRightWidth: 1,
        alignSelf: 'stretch',
        justifyContent: 'center',
    },
    flag: {
        fontSize: 18,
    },
    dialCode: {
        fontSize: 15,
        fontWeight: '600',
    },
    dialChevron: {
        fontSize: 11,
        marginLeft: 2,
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: 14,
        fontSize: 17,
        fontWeight: '500',
        height: 54,
    },

    // Channel selection
    channelList: {
        gap: 12,
        marginBottom: 28,
    },
    channelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1.5,
        padding: 16,
        gap: 14,
    },
    channelIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelText: {
        flex: 1,
        gap: 2,
    },
    channelLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    channelSublabel: {
        fontSize: 12,
    },
    channelRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    channelRadioDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
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

    // Country picker modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    modalSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 0,
        maxHeight: '75%',
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        paddingHorizontal: 20,
        marginBottom: 14,
    },
    modalSearch: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    modalSearchIcon: {
        fontSize: 14,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 0,
    },
    modalSearchClear: {
        fontSize: 13,
        paddingHorizontal: 4,
    },
    modalList: {
        flexGrow: 0,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 13,
        borderWidth: 1,
        gap: 12,
    },
    modalItemFlag: {
        fontSize: 22,
        width: 30,
    },
    modalItemName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    modalItemDial: {
        fontSize: 14,
        fontWeight: '600',
        minWidth: 42,
        textAlign: 'right',
    },
    modalItemCheck: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 4,
    },
    modalSeparator: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: 20,
        opacity: 0.4,
    },
});
