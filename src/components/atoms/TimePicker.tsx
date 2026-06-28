import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Platform,
    Pressable,
    Modal,
    useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/src/hooks/use-theme';

interface TimePickerProps {
    value: string;
    onChange: (time: string) => void;
    placeholder?: string;
    error?: boolean;
    minuteStep?: number;
}

function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function ClockIcon({ size = 18, color = '#000' }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M12 6v6l4 2"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

const BREAKPOINT_INLINE = 600;

export default function TimePicker({
    value,
    onChange,
    placeholder = 'HH:MM',
    error = false,
    minuteStep = 5,
}: TimePickerProps) {
    const { colors } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const useInlinePopover = Platform.OS === 'web' && screenWidth >= BREAKPOINT_INLINE;

    const [open, setOpen] = useState(false);
    const [inputText, setInputText] = useState(value);
    const inputRef = useRef<TextInput>(null);
    const popoverPressed = useRef(false);
    const justClosed = useRef(false);

    const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => pad(i)), []);
    const minutes = useMemo(() => {
        const arr: string[] = [];
        for (let i = 0; i < 60; i += minuteStep) arr.push(pad(i));
        return arr;
    }, [minuteStep]);

    useEffect(() => {
        setInputText(value);
    }, [value]);

    const selectedHour = value ? value.slice(0, 2) : '';
    const selectedMinute = value ? value.slice(3, 5) : '';

    const selectHour = (h: string) => {
        const min = selectedMinute || '00';
        const newVal = `${h}:${min}`;
        onChange(newVal);
        setInputText(newVal);
    };

    const selectMinute = (m: string) => {
        const hr = selectedHour || '00';
        const newVal = `${hr}:${m}`;
        onChange(newVal);
        setInputText(newVal);
        justClosed.current = true;
        setOpen(false);
        inputRef.current?.blur();
    };

    const handleInputChange = (text: string) => {
        const digits = text.replace(/\D/g, '');
        let formatted = '';
        if (digits.length <= 2) {
            formatted = digits;
        } else {
            formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
        }
        setInputText(formatted);

        if (/^\d{2}:\d{2}$/.test(formatted)) {
            const [h, m] = formatted.split(':').map(Number);
            if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
                onChange(formatted);
            }
        }
    };

    const handleFocus = () => {
        if (justClosed.current) {
            justClosed.current = false;
            return;
        }
        setOpen(true);
    };

    const handleBlur = () => {
        if (useInlinePopover) {
            setTimeout(() => {
                if (!popoverPressed.current) {
                    setOpen(false);
                }
                popoverPressed.current = false;
            }, 10);
        }
        if (!/^\d{2}:\d{2}$/.test(inputText)) {
            setInputText(value);
        }
    };

    const handleTriggerPress = () => {
        if (!useInlinePopover) {
            if (justClosed.current) {
                justClosed.current = false;
                return;
            }
            setOpen(true);
        } else {
            inputRef.current?.focus();
        }
    };

    const dropdownContent = (
        <View style={styles.columns}>
            <View style={styles.column}>
                <Text style={[styles.columnHeader, { color: colors.onSurfaceVariant }]}>Std</Text>
                <ScrollView style={styles.scrollColumn} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {hours.map((h) => (
                        <TouchableOpacity
                            key={h}
                            onPress={() => selectHour(h)}
                            style={[
                                styles.option,
                                selectedHour === h && { backgroundColor: colors.primary },
                            ]}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.optionText,
                                { color: colors.onSurface },
                                selectedHour === h && { color: colors.onPrimary },
                            ]}>
                                {h}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

            <View style={styles.column}>
                <Text style={[styles.columnHeader, { color: colors.onSurfaceVariant }]}>Min</Text>
                <ScrollView style={styles.scrollColumn} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {minutes.map((m) => (
                        <TouchableOpacity
                            key={m}
                            onPress={() => selectMinute(m)}
                            style={[
                                styles.option,
                                selectedMinute === m && { backgroundColor: colors.primary },
                            ]}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.optionText,
                                { color: colors.onSurface },
                                selectedMinute === m && { color: colors.onPrimary },
                            ]}>
                                {m}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Pressable onPress={handleTriggerPress}>
                <View
                    style={[
                        styles.inputRow,
                        {
                            backgroundColor: colors.surfaceContainer,
                            borderColor: error ? colors.error : open ? colors.primary : colors.outlineVariant,
                        },
                    ]}
                >
                    <ClockIcon size={18} color={colors.onSurfaceVariant} />
                    <TextInput
                        ref={inputRef}
                        style={[styles.input, { color: colors.onSurface }]}
                        value={inputText}
                        placeholder={placeholder}
                        placeholderTextColor={colors.onSurfaceVariant}
                        onChangeText={handleInputChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        keyboardType="number-pad"
                        maxLength={5}
                    />
                </View>
            </Pressable>

            {open && useInlinePopover && (
                <Pressable
                    onPressIn={() => { popoverPressed.current = true; }}
                    {...({ onMouseDown: (e: any) => e.preventDefault() } as any)}
                    style={[styles.inlinePopover, {
                        backgroundColor: colors.surfaceContainerLow,
                        borderColor: colors.outlineVariant,
                    }]}
                >
                    {dropdownContent}
                </Pressable>
            )}

            {open && !useInlinePopover && (
                <Modal transparent animationType="fade" visible statusBarTranslucent hardwareAccelerated onRequestClose={() => { justClosed.current = true; setOpen(false); }}>
                    <Pressable style={styles.modalBackdrop} onPress={() => { justClosed.current = true; setOpen(false); inputRef.current?.blur(); }}>
                        <Pressable
                            style={[styles.modalPanel, {
                                backgroundColor: colors.surfaceContainerLow,
                                borderColor: colors.outlineVariant,
                            }]}
                            onPress={(e) => e.stopPropagation()}
                        >
                            {dropdownContent}
                        </Pressable>
                    </Pressable>
                </Modal>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        zIndex: 40,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        padding: 0,
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    inlinePopover: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 4,
        borderWidth: 1,
        borderRadius: 12,
        padding: 8,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalPanel: {
        width: '100%',
        maxWidth: 280,
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        elevation: 12,
    },
    columns: {
        flexDirection: 'row',
        height: 240,
    },
    column: {
        flex: 1,
    },
    columnHeader: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
        paddingVertical: 4,
    },
    scrollColumn: {
        flex: 1,
    },
    divider: {
        width: 1,
        marginHorizontal: 4,
    },
    option: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 1,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
    },
});
