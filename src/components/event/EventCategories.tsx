import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import EditButton from '../atoms/EditButton';

interface EventCategoriesProps {
    categories: string[];
    editMode?: boolean;
    edited?: boolean;
    onEdit?: () => void;
}

export default function EventCategories({ categories, editMode = false, edited = false, onEdit }: EventCategoriesProps) {
    const { colors } = useTheme();

    if (categories.length === 0 && !editMode) return null;

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Kategorien</Text>
                {editMode && onEdit && <EditButton onPress={onEdit} edited={edited} />}
            </View>
            {categories.length > 0 ? (
                <View style={styles.chipRow}>
                    {categories.map((cat) => (
                        <View
                            key={cat}
                            style={[styles.chip, {
                                backgroundColor: `${colors.primary}18`,
                                borderColor: `${colors.primary}30`,
                            }]}
                        >
                            <Text style={[styles.chipText, { color: colors.primary }]}>{cat}</Text>
                        </View>
                    ))}
                </View>
            ) : (
                <Text style={[styles.placeholder, { color: colors.onSurfaceVariant }]}>
                    Noch keine Kategorien
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        borderRadius: 8,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    placeholder: {
        fontSize: 14,
        fontStyle: 'italic',
    },
});
