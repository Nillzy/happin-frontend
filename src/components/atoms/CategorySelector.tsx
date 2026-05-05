import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

interface Category {
    id: string;
    label: string;
}

const CATEGORIES: Category[] = [
    { id: 'music', label: 'Musik' },
    { id: 'sport', label: 'Sport' },
    { id: 'art', label: 'Kunst' },
    { id: 'food', label: 'Essen & Trinken' },
    { id: 'networking', label: 'Networking' },
    { id: 'education', label: 'Bildung' },
    { id: 'culture', label: 'Kultur' },
    { id: 'party', label: 'Party' },
    { id: 'outdoor', label: 'Outdoor' },
    { id: 'business', label: 'Business & Professional' },
    { id: 'science', label: 'Science & Technology' },
    { id: 'health', label: 'Health & Wellness' },
    { id: 'charity', label: 'Charity & Causes' },
    { id: 'community', label: 'Community & Culture' },
    { id: 'family', label: 'Family & Education' },
    { id: 'fashion', label: 'Fashion & Beauty' },
    { id: 'film', label: 'Film, Media & Entertainment' },
    { id: 'hobbies', label: 'Hobbies & Special Interest' },
    { id: 'travel', label: 'Travel & Outdoor' },
    { id: 'spirituality', label: 'Spirituality & Religion' },
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
    const [expanded, setExpanded] = useState(false);

    // Show first 9 categories (approximately 3 rows) when collapsed
    const visibleCategories = expanded ? CATEGORIES : CATEGORIES.slice(0, 9);

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
                Wir empfehlen Events basierend auf deiner Auswahl.
            </Text>

            <View style={styles.chipGrid}>
                {visibleCategories.map((cat) => {
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

            {/* Show More / Show Less Button */}
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExpanded(!expanded)}
                style={styles.expandButton}
            >
                <Text style={[styles.expandButtonText, { color: colors.primary }]}>
                    {expanded ? 'Weniger anzeigen' : `${CATEGORIES.length - 9} weitere Kategorien anzeigen`}
                </Text>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.primary}
                />
            </TouchableOpacity>
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
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        gap: 6,
    },
    expandButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export { CATEGORIES };
export type { Category };
