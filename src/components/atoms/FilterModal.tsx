import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Switch,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import EditDrawer from './EditDrawer';
import FilterChip from './FilterChip';
import DatePicker from './DatePicker';
import { searchCities, type CitySuggestion } from '@/src/services/geocoding';
import type { EventFilterParams, FilterPeriod } from '@/src/types/events';

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    initialFilters: EventFilterParams;
    onApply: (filters: EventFilterParams) => void;
}

const PERIOD_OPTIONS: { value: FilterPeriod; label: string }[] = [
    { value: 'today', label: 'Heute' },
    { value: 'week', label: 'Diese Woche' },
    { value: 'month', label: 'Diesen Monat' },
    { value: 'custom', label: 'Benutzerdefiniert' },
];

const CATEGORY_OPTIONS = [
    'Musik', 'Sport', 'Party', 'Techno', 'Kunst', 'Business', 'Sonstiges',
];

export default function FilterModal({
    visible,
    onClose,
    initialFilters,
    onApply,
}: FilterModalProps) {
    const { colors } = useTheme();
    const [draft, setDraft] = useState<EventFilterParams>(initialFilters);
    const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
    const [cityLoading, setCityLoading] = useState(false);
    const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (visible) {
            setDraft(initialFilters);
            setCitySuggestions([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    useEffect(() => {
        return () => {
            if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
        };
    }, []);

    const toggleCategory = (cat: string) => {
        setDraft(prev => {
            const cats = prev.categories ?? [];
            return {
                ...prev,
                categories: cats.includes(cat)
                    ? cats.filter(c => c !== cat)
                    : [...cats, cat],
            };
        });
    };

    const handleApply = () => {
        const clean: EventFilterParams = {};
        if (draft.period) {
            clean.period = draft.period;
            if (draft.period === 'custom') {
                if (draft.dateFrom) clean.dateFrom = draft.dateFrom;
                if (draft.dateTo) clean.dateTo = draft.dateTo;
            }
        }
        if (draft.categories?.length) clean.categories = draft.categories;
        if (draft.city?.trim()) clean.city = draft.city.trim();
        if (draft.isFree) clean.isFree = true;
        onApply(clean);
        onClose();
    };

    const handleReset = () => {
        onApply({});
        onClose();
    };

    const searchCity = (text: string) => {
        setDraft(prev => ({ ...prev, city: text }));
        setCitySuggestions([]);
        if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current);
        if (text.trim().length < 2) return;
        cityDebounceRef.current = setTimeout(async () => {
            setCityLoading(true);
            try {
                const results = await searchCities(text);
                setCitySuggestions(results);
            } finally {
                setCityLoading(false);
            }
        }, 300);
    };

    return (
        <EditDrawer visible={visible} onClose={onClose} title="Filter">
            {/* Zeitraum */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
                        ZEITRAUM
                    </Text>
                    <View style={styles.chipRow}>
                        {PERIOD_OPTIONS.map(({ value, label }) => (
                            <FilterChip
                                key={value}
                                label={label}
                                selected={draft.period === value}
                                onPress={() =>
                                    setDraft(prev => {
                                        const newPeriod = prev.period === value ? undefined : value;
                                        return {
                                            ...prev,
                                            period: newPeriod,
                                            ...(newPeriod !== 'custom' ? { dateFrom: undefined, dateTo: undefined } : {}),
                                        };
                                    })
                                }
                            />
                        ))}
                    </View>
                    {draft.period === 'custom' && (
                        <View style={styles.dateRangeRow}>
                            <View style={styles.datePickerWrapper}>
                                <Text style={[styles.datePickerLabel, { color: colors.onSurfaceVariant }]}>Von</Text>
                                <DatePicker
                                    value={draft.dateFrom ?? ''}
                                    onChange={dateFrom => setDraft(prev => ({ ...prev, dateFrom }))}
                                    placeholder="TT.MM.JJJJ"
                                    forceInline
                                />
                            </View>
                            <View style={styles.datePickerWrapper}>
                                <Text style={[styles.datePickerLabel, { color: colors.onSurfaceVariant }]}>Bis</Text>
                                <DatePicker
                                    value={draft.dateTo ?? ''}
                                    onChange={dateTo => setDraft(prev => ({ ...prev, dateTo }))}
                                    placeholder="TT.MM.JJJJ"
                                    minDate={draft.dateFrom ? new Date(draft.dateFrom + 'T00:00:00') : undefined}
                                    forceInline
                                />
                            </View>
                        </View>
                    )}
                </View>

                <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

                {/* Kategorie */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
                        KATEGORIE
                    </Text>
                    <View style={styles.chipRow}>
                        {CATEGORY_OPTIONS.map(cat => (
                            <FilterChip
                                key={cat}
                                label={cat}
                                selected={(draft.categories ?? []).includes(cat)}
                                onPress={() => toggleCategory(cat)}
                            />
                        ))}
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

                {/* Standort */}
                <View style={[styles.section, styles.citySection]}>
                    <Text style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}>
                        STANDORT
                    </Text>
                    <View style={[styles.cityInputRow, { backgroundColor: colors.surfaceContainerHigh }]}>
                        <Ionicons name="location-outline" size={18} color={colors.onSurfaceVariant} />
                        <TextInput
                            style={[styles.cityInput, { color: colors.onSurface }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}]}
                            placeholder="Stadt eingeben, z.B. Berlin"
                            placeholderTextColor={colors.onSurfaceVariant}
                            value={draft.city ?? ''}
                            onChangeText={searchCity}
                            autoCapitalize="words"
                            autoCorrect={false}
                        />
                        {cityLoading && <ActivityIndicator size="small" color={colors.primary} />}
                        {!!draft.city && !cityLoading && (
                            <TouchableOpacity onPress={() => {
                                setDraft(prev => ({ ...prev, city: '' }));
                                setCitySuggestions([]);
                            }}>
                                <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
                            </TouchableOpacity>
                        )}
                    </View>
                    {citySuggestions.length > 0 && (
                        <View style={[styles.cityDropdown, {
                            backgroundColor: colors.surfaceContainerLow,
                            borderColor: colors.outlineVariant,
                        }]}>
                            {citySuggestions.map((s, i) => {
                                const meta = [s.regionCode, s.country].filter(Boolean).join(', ');
                                return (
                                    <TouchableOpacity
                                        key={`${s.name}-${i}`}
                                        style={[
                                            styles.citySuggestionRow,
                                            { borderBottomColor: colors.outlineVariant },
                                            i === citySuggestions.length - 1 && styles.cityLastRow,
                                        ]}
                                        onPress={() => {
                                            setDraft(prev => ({ ...prev, city: s.name }));
                                            setCitySuggestions([]);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.citySuggestionName, { color: colors.onSurface }]}>{s.name}</Text>
                                        {!!meta && <Text style={[styles.citySuggestionMeta, { color: colors.onSurfaceVariant }]}>{meta}</Text>}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

                {/* Kostenlos */}
                <View style={styles.toggleRow}>
                    <View>
                        <Text style={[styles.toggleLabel, { color: colors.onSurface }]}>
                            Nur kostenlose Events
                        </Text>
                        <Text style={[styles.toggleSubLabel, { color: colors.onSurfaceVariant }]}>
                            Kostenpflichtige Events ausblenden
                        </Text>
                    </View>
                    <Switch
                        value={draft.isFree ?? false}
                        onValueChange={val => setDraft(prev => ({ ...prev, isFree: val }))}
                        trackColor={{ false: colors.surfaceContainerHigh, true: colors.primary }}
                        thumbColor={colors.onPrimary}
                    />
                </View>

                <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

                {/* Footer buttons */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.resetButton, { borderColor: colors.outlineVariant }]}
                        onPress={handleReset}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.resetText, { color: colors.onSurface }]}>Zurücksetzen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.applyButton, { backgroundColor: colors.primary }]}
                        onPress={handleApply}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.applyText, { color: colors.onPrimary }]}>Anwenden</Text>
                    </TouchableOpacity>
                </View>
        </EditDrawer>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingVertical: 16,
        gap: 12,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    divider: {
        height: 1,
    },
    cityInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 10,
    },
    cityInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '400',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    toggleSubLabel: {
        fontSize: 13,
        marginTop: 2,
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 16,
    },
    resetButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 9999,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    resetText: {
        fontSize: 15,
        fontWeight: '600',
    },
    applyButton: {
        flex: 2,
        paddingVertical: 14,
        borderRadius: 9999,
        alignItems: 'center',
    },
    applyText: {
        fontSize: 15,
        fontWeight: '600',
    },
    dateRangeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    datePickerWrapper: {
        flex: 1,
        gap: 6,
    },
    datePickerLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    citySection: {
        zIndex: 10,
    },
    cityDropdown: {
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        marginTop: 4,
    },
    citySuggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderBottomWidth: 1,
        gap: 8,
    },
    cityLastRow: {
        borderBottomWidth: 0,
    },
    citySuggestionName: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    citySuggestionMeta: {
        fontSize: 12,
        fontWeight: '500',
    },
});
