import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import EditButton from '../atoms/EditButton';
import { CATEGORIES } from '../atoms/CategorySelector';

interface EventCategoriesProps {
    categories: string[];
    editMode?: boolean;
    edited?: boolean;
    onEdit?: () => void;
    accentColor?: string | null;
}

function resolveLabel(idOrLabel: string): string {
    const found = CATEGORIES.find(c => c.id === idOrLabel);
    return found ? found.label : idOrLabel;
}

export default function EventCategories({ categories, editMode = false, edited = false, onEdit, accentColor }: EventCategoriesProps) {
    const { colors, isDark } = useTheme();
    const isWeb = Platform.OS === 'web';

    if (categories.length === 0 && !editMode) return null;

    const chipBg = accentColor ?? colors.primary;
    const chipText = accentColor ? '#ffffff' : colors.onPrimary;

    const cardStyle = [
        styles.card,
        isWeb
            ? { backgroundColor: isDark ? 'rgba(18,19,26,0.55)' : 'rgba(255,255,255,0.55)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as any
            : { backgroundColor: isDark ? 'rgba(18,19,26,0.85)' : 'rgba(255,255,255,0.85)' },
        { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' },
    ];

    return (
        <View style={styles.section}>
            <View style={cardStyle}>
                <View style={styles.header}>
                    <Text style={[styles.sectionTitle, { color: colors.onSurfaceVariant }]}>Kategorien</Text>
                    {editMode && onEdit && <EditButton onPress={onEdit} edited={edited} />}
                </View>
                {categories.length > 0 ? (
                    <View style={styles.chipRow}>
                        {categories.map((cat) => (
                            <View
                                key={cat}
                                style={[styles.chip, { backgroundColor: chipBg }]}
                            >
                                <Text style={[styles.chipText, { color: chipText }]}>{resolveLabel(cat).toUpperCase()}</Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={[styles.placeholder, { color: colors.onSurfaceVariant }]}>
                        Noch keine Kategorien
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 32,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        overflow: 'hidden',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        borderRadius: 8,
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
