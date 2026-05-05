import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { CitySuggestion, searchCities } from '@/src/services/geocoding';

interface CityAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (suggestion: CitySuggestion) => void;
    onCancel: () => void;
    onSubmit: () => void;
    saving?: boolean;
}

export default function CityAutocomplete({
    value,
    onChange,
    onSelect,
    onCancel,
    onSubmit,
    saving = false,
}: CityAutocompleteProps) {
    const { colors } = useTheme();
    const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (value.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            const results = await searchCities(value);
            setSuggestions(results);
            setLoading(false);
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [value]);

    return (
        <View style={styles.wrapper}>
            <View style={styles.inputRow}>
                <TextInput
                    style={[styles.input, {
                        color: colors.onSurface,
                        borderColor: colors.primary,
                        backgroundColor: colors.surfaceContainerLow,
                    }]}
                    value={value}
                    onChangeText={(t) => { onChange(t); setSuggestions([]); }}
                    autoFocus
                    placeholder="z.B. Karlsruhe"
                    placeholderTextColor={colors.outline}
                    returnKeyType="done"
                    onSubmitEditing={onSubmit}
                />
                {loading && (
                    <ActivityIndicator
                        size="small"
                        color={colors.primary}
                        style={styles.spinner}
                    />
                )}
                <TouchableOpacity
                    style={[styles.okBtn, { backgroundColor: saving ? colors.surfaceContainerHigh : colors.primary }]}
                    onPress={onSubmit}
                    disabled={saving}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.okBtnText, { color: saving ? colors.onSurfaceVariant : colors.onPrimary }]}>
                        {saving ? '…' : 'OK'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>Abbrechen</Text>
                </TouchableOpacity>
            </View>

            {suggestions.length > 0 && (
                <View style={[styles.dropdown, {
                    backgroundColor: colors.surfaceContainerLow,
                    borderColor: colors.outlineVariant,
                    ...Platform.select({
                        ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
                        android: { elevation: 6 },
                    }),
                }]}>
                    {suggestions.map((s, i) => {
                        const meta = [s.regionCode, s.country].filter(Boolean).join(', ');
                        return (
                            <TouchableOpacity
                                key={`${s.lat}-${s.lng}-${i}`}
                                style={[
                                    styles.suggestionRow,
                                    { borderBottomColor: colors.outlineVariant },
                                    i === suggestions.length - 1 && styles.lastRow,
                                ]}
                                onPress={() => {
                                    setSuggestions([]);
                                    onSelect(s);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.suggestionName, { color: colors.onSurface }]}>
                                    {s.name}
                                </Text>
                                <Text style={[styles.suggestionMeta, { color: colors.onSurfaceVariant }]}>
                                    {meta}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        zIndex: 10,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        flex: 1,
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: Platform.OS === 'ios' ? 8 : 4,
        fontSize: 15,
        fontWeight: '500',
    },
    spinner: {
        position: 'absolute',
        right: 130,
    },
    okBtn: {
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    okBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    cancelBtn: {
        padding: 4,
    },
    dropdown: {
        marginTop: 4,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderBottomWidth: 1,
        gap: 8,
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    suggestionName: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    suggestionMeta: {
        fontSize: 12,
        fontWeight: '500',
    },
});
