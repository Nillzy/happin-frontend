import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import EditButton from '../atoms/EditButton';

interface EventDescriptionProps {
    description: string;
    editMode?: boolean;
    edited?: boolean;
    onEdit?: () => void;
}

export default function EventDescription({ description, editMode = false, edited = false, onEdit }: EventDescriptionProps) {
    const { colors } = useTheme();
    const [expanded, setExpanded] = useState(false);

    const paragraphs = description.split('\n\n');
    const shortDesc = paragraphs[0];
    const hasMore = paragraphs.length > 1 || description.length > 200;

    if (!description && !editMode) return null;

    return (
        <View style={styles.section}>
            <View style={styles.header}>
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Über dieses Event</Text>
                {editMode && onEdit && <EditButton onPress={onEdit} edited={edited} />}
            </View>
            {description ? (
                <>
                    <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
                        {expanded ? description : shortDesc}
                    </Text>
                    {hasMore && (
                        <TouchableOpacity onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
                            <Text style={[styles.readMore, { color: colors.primary }]}>
                                {expanded ? 'Weniger anzeigen' : 'Mehr lesen'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </>
            ) : (
                <Text style={[styles.placeholder, { color: colors.onSurfaceVariant }]}>
                    Noch keine Beschreibung
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
    description: {
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 10,
    },
    readMore: {
        fontSize: 14,
        fontWeight: '700',
    },
    placeholder: {
        fontSize: 14,
        fontStyle: 'italic',
    },
});
