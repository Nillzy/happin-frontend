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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { type AddressSuggestion, searchAddresses, verifyAddressExists } from '@/src/services/geocoding';

interface AddressAutocompleteProps {
    onSelect: (address: AddressSuggestion) => void;
    onClear?: () => void;
    initialValue?: string;
    initialSelected?: AddressSuggestion | null;
}

export default function AddressAutocomplete({
    onSelect,
    onClear,
    initialValue,
    initialSelected,
}: AddressAutocompleteProps) {
    const { colors } = useTheme();
    const [query, setQuery] = useState(initialSelected?.displayLabel ?? initialValue ?? '');
    const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [selected, setSelected] = useState<AddressSuggestion | null>(initialSelected ?? null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (selected) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            const results = await searchAddresses(query);
            // Nur Adressen mit Hausnummer anzeigen
            setSuggestions(results.filter(r => !!r.houseNumber));
            setLoading(false);
        }, 300);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, selected]);

    const handleSelect = async (address: AddressSuggestion) => {
        setSuggestions([]);
        setVerifyError(null);
        setVerifying(true);
        const exists = await verifyAddressExists(address);
        setVerifying(false);
        if (!exists) {
            setVerifyError('Diese Adresse konnte nicht verifiziert werden. Bitte wähle eine andere.');
            return;
        }
        setSelected(address);
        setQuery(address.displayLabel);
        onSelect(address);
    };

    const handleClear = () => {
        setSelected(null);
        setQuery('');
        setSuggestions([]);
        setVerifyError(null);
        onClear?.();
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.inputRow}>
                <TextInput
                    style={[
                        styles.input,
                        {
                            color: colors.onSurface,
                            borderColor: selected ? colors.primary : verifyError ? colors.error : colors.outlineVariant,
                            backgroundColor: selected ? `${colors.primary}08` : undefined,
                        },
                    ]}
                    value={query}
                    onChangeText={(t) => {
                        if (!selected) {
                            setQuery(t);
                            setVerifyError(null);
                        }
                    }}
                    editable={!selected && !verifying}
                    placeholder="z.B. Musterstraße 5, Musterstadt"
                    placeholderTextColor={colors.onSurfaceVariant}
                    returnKeyType="search"
                />
                {(loading || verifying) && (
                    <ActivityIndicator
                        size="small"
                        color={colors.primary}
                        style={styles.spinner}
                    />
                )}
                {selected && (
                    <TouchableOpacity
                        onPress={handleClear}
                        style={styles.clearBtn}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close-circle" size={20} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                )}
            </View>

            {verifyError && (
                <Text style={[styles.errorText, { color: colors.error }]}>{verifyError}</Text>
            )}

            {suggestions.length > 0 && !selected && (
                <View
                    style={[
                        styles.dropdown,
                        {
                            backgroundColor: colors.surfaceContainerLow,
                            borderColor: colors.outlineVariant,
                            ...Platform.select({
                                ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
                                android: { elevation: 6 },
                            }),
                        },
                    ]}
                >
                    {suggestions.map((s, i) => (
                        <TouchableOpacity
                            key={`${s.lat}-${s.lng}-${i}`}
                            style={[
                                styles.suggestionRow,
                                { borderBottomColor: colors.outlineVariant },
                                i === suggestions.length - 1 && styles.lastRow,
                            ]}
                            onPress={() => handleSelect(s)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.suggestionContent}>
                                <Text style={[styles.suggestionMain, { color: colors.onSurface }]} numberOfLines={1}>
                                    {s.houseNumber ? `${s.street} ${s.houseNumber}` : s.street}
                                </Text>
                                <Text style={[styles.suggestionSub, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                                    {[s.postalCode, s.city].filter(Boolean).join(' ')}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        zIndex: 10,
    },
    inputRow: {
        position: 'relative',
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        paddingRight: 36,
        fontSize: 15,
        fontWeight: '500',
        ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
    },
    spinner: {
        position: 'absolute',
        right: 12,
        top: '50%',
        marginTop: -8,
    },
    clearBtn: {
        position: 'absolute',
        right: 10,
        top: '50%',
        marginTop: -10,
    },
    errorText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 6,
        marginLeft: 2,
    },
    dropdown: {
        marginTop: 4,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    suggestionRow: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    suggestionContent: {
        gap: 2,
    },
    suggestionMain: {
        fontSize: 14,
        fontWeight: '600',
    },
    suggestionSub: {
        fontSize: 12,
        fontWeight: '400',
    },
});
