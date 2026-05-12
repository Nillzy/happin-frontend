import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Pressable,
    Modal,
    useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/hooks/use-theme';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
    error?: boolean;
    minDate?: Date;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function pad(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
}

function CalendarIcon({ size = 18, color = '#000' }: { size?: number; color?: string }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path
                d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5Z"
                stroke={color}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M15.695 13.7h.009M15.695 16.7h.009M11.995 13.7h.01M11.995 16.7h.01M8.294 13.7h.01M8.294 16.7h.01"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

function toDisplayFormat(isoDate: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
    const [y, m, d] = isoDate.split('-');
    return `${d}.${m}.${y}`;
}

const BREAKPOINT_INLINE = 600;

export default function DatePicker({
    value,
    onChange,
    placeholder = 'TT.MM.JJJJ',
    error = false,
    minDate,
}: DatePickerProps) {
    const { colors } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const useInlinePopover = Platform.OS === 'web' && screenWidth >= BREAKPOINT_INLINE;

    const [open, setOpen] = useState(false);
    const [inputText, setInputText] = useState(value ? toDisplayFormat(value) : '');
    const inputRef = useRef<TextInput>(null);
    const popoverPressed = useRef(false);
    const justClosed = useRef(false);

    const today = useMemo(() => new Date(), []);

    const initialYear = value ? Number(value.slice(0, 4)) : today.getFullYear();
    const initialMonth = value ? Number(value.slice(5, 7)) - 1 : today.getMonth();
    const [viewYear, setViewYear] = useState(initialYear);
    const [viewMonth, setViewMonth] = useState(initialMonth);

    useEffect(() => {
        if (value) {
            setInputText(toDisplayFormat(value));
        }
    }, [value]);

    const days = useMemo(() => {
        const count = getDaysInMonth(viewYear, viewMonth);
        const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
        const cells: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let i = 1; i <= count; i++) cells.push(i);
        return cells;
    }, [viewYear, viewMonth]);

    const isToday = useCallback((day: number) => {
        return day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear();
    }, [viewYear, viewMonth, today]);

    const isSelected = useCallback((day: number) => {
        if (!value) return false;
        const sel = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
        return sel === value;
    }, [value, viewYear, viewMonth]);

    const isDisabled = useCallback((day: number) => {
        if (!minDate) return false;
        const d = new Date(viewYear, viewMonth, day);
        d.setHours(0, 0, 0, 0);
        const min = new Date(minDate);
        min.setHours(0, 0, 0, 0);
        return d < min;
    }, [minDate, viewYear, viewMonth]);

    const selectDay = (day: number) => {
        if (isDisabled(day)) return;
        const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
        onChange(dateStr);
        setInputText(toDisplayFormat(dateStr));
        justClosed.current = true;
        setOpen(false);
        inputRef.current?.blur();
    };

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const handleInputChange = (text: string) => {
        const digits = text.replace(/\D/g, '');
        let formatted = '';
        if (digits.length <= 2) {
            formatted = digits;
        } else if (digits.length <= 4) {
            formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`;
        } else {
            formatted = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
        }
        setInputText(formatted);

        if (/^\d{2}\.\d{2}\.\d{4}$/.test(formatted)) {
            const [dd, mm, yyyy] = formatted.split('.').map(Number);
            if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= getDaysInMonth(yyyy, mm - 1)) {
                const isoDate = `${yyyy}-${pad(mm)}-${pad(dd)}`;
                onChange(isoDate);
                setViewYear(yyyy);
                setViewMonth(mm - 1);
            }
        }
    };

    const handleFocus = () => {
        if (justClosed.current) {
            justClosed.current = false;
            return;
        }
        setOpen(true);
        if (value) {
            setViewYear(Number(value.slice(0, 4)));
            setViewMonth(Number(value.slice(5, 7)) - 1);
        }
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
    };

    const handleTriggerPress = () => {
        if (!useInlinePopover) {
            if (justClosed.current) {
                justClosed.current = false;
                return;
            }
            if (value) {
                setViewYear(Number(value.slice(0, 4)));
                setViewMonth(Number(value.slice(5, 7)) - 1);
            }
            setOpen(true);
        } else {
            inputRef.current?.focus();
        }
    };

    const calendarContent = (
        <>
            <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={prevMonth} style={styles.navButton} hitSlop={8}>
                    <Text style={[styles.navText, { color: colors.onSurface }]}>‹</Text>
                </TouchableOpacity>
                <Text style={[styles.monthLabel, { color: colors.onSurface }]}>
                    {MONTHS[viewMonth]} {viewYear}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navButton} hitSlop={8}>
                    <Text style={[styles.navText, { color: colors.onSurface }]}>›</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
                {WEEKDAYS.map((wd) => (
                    <View key={wd} style={styles.dayCell}>
                        <Text style={[styles.weekdayText, { color: colors.onSurfaceVariant }]}>
                            {wd}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.daysGrid}>
                {days.map((day, idx) => (
                    <View key={idx} style={styles.dayCell}>
                        {day !== null ? (
                            <TouchableOpacity
                                onPress={() => selectDay(day)}
                                disabled={isDisabled(day)}
                                style={[
                                    styles.dayButton,
                                    isSelected(day) && { backgroundColor: colors.primary },
                                    isToday(day) && !isSelected(day) && { backgroundColor: colors.primaryContainer },
                                ]}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.dayText,
                                    { color: colors.onSurface },
                                    isSelected(day) && { color: colors.onPrimary },
                                    isToday(day) && !isSelected(day) && { color: colors.onPrimaryContainer },
                                    isDisabled(day) && { opacity: 0.3 },
                                ]}>
                                    {day}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                ))}
            </View>
        </>
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
                    <CalendarIcon size={18} color={colors.onSurfaceVariant} />
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
                        maxLength={10}
                    />
                </View>
            </Pressable>

            {open && useInlinePopover && (
                <Pressable
                    onPressIn={() => { popoverPressed.current = true; }}
                    onMouseDown={(e: any) => e.preventDefault()}
                    style={[styles.inlinePopover, {
                        backgroundColor: colors.surfaceContainerLow,
                        borderColor: colors.outlineVariant,
                    }]}
                >
                    {calendarContent}
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
                            {calendarContent}
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
        zIndex: 50,
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
        marginTop: 4,
        minWidth: 280,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
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
        maxWidth: 340,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        elevation: 12,
    },
    calendarHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    navButton: {
        padding: 8,
    },
    navText: {
        fontSize: 22,
        fontWeight: '600',
        lineHeight: 24,
    },
    monthLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    weekRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
    },
    weekdayText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
