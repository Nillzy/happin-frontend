import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';

interface Category {
    id: string;
    label: string;
}

const CATEGORIES: Category[] = [
    { id: 'music', label: 'Musik' },
    { id: 'party', label: 'Party' },
    { id: 'sport', label: 'Sport' },
    { id: 'art', label: 'Kunst' },
    { id: 'culture', label: 'Kultur' },
    { id: 'food', label: 'Essen & Trinken' },
    { id: 'outdoor', label: 'Outdoor' },
    { id: 'networking', label: 'Networking' },
    { id: 'education', label: 'Bildung' },
    { id: 'science', label: 'Wissenschaft & Tech' },
    { id: 'health', label: 'Gesundheit' },
    { id: 'charity', label: 'Wohltätigkeit' },
];

interface CategorySelectorProps {
    value: string[];
    onChange: (categories: string[]) => void;
    maxSelection?: number;
}

export default function CategorySelector({
    value,
    onChange,
    maxSelection = 5
}: CategorySelectorProps) {
    const { colors } = useTheme();

    const toggleCategory = (id: string) => {
        if (value.includes(id)) {
            onChange(value.filter(c => c !== id));
        } else {
            if (value.length < maxSelection) {
                onChange([...value, id]);
            }
        }
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.headerText, { color: colors.onSurface }]}>
                Wähle Kategorien
            </Text>
            <Text style={[styles.subText, { color: colors.onSurfaceVariant }]}>
                Du kannst bis zu 5 Kategorien auswählen.
            </Text>

            <View style={styles.chipGrid}>
                {CATEGORIES.map((cat) => {
                    const isSelected = value.includes(cat.id);
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            activeOpacity={0.7}
                            onPress={() => toggleCategory(cat.id)}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor: isSelected
                                        ? colors.onSurface
                                        : colors.surface,
                                    borderColor: isSelected
                                        ? colors.onSurface
                                        : colors.outline,
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.chipText,
                                    {
                                        color: isSelected
                                            ? colors.surface
                                            : colors.onSurface,
                                    },
                                ]}
                            >
                                {cat.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 8,
        alignItems: 'center',
    },
    headerText: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    subText: {
        fontSize: 15,
        fontWeight: '400',
        marginBottom: 24,
        lineHeight: 20,
        textAlign: 'center',
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 2,
    },
    chipText: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: -0.2,
    },
});

export { CATEGORIES };
export type { Category };
