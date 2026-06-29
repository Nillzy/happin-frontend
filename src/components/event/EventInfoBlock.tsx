import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import EditButton from '../atoms/EditButton';

interface InfoRowData {
    icon: React.ReactNode;
    primary: string;
    secondary?: string;
}

interface EventInfoBlockProps {
    rows: InfoRowData[];
    editMode?: boolean;
    edited?: boolean;
    onEdit?: () => void;
}

export default function EventInfoBlock({ rows, editMode = false, edited = false, onEdit }: EventInfoBlockProps) {
    const { colors } = useTheme();

    return (
        <View style={styles.container}>
            {editMode && onEdit && (
                <View style={styles.editPosition}>
                    <EditButton onPress={onEdit} edited={edited} />
                </View>
            )}
            {rows.map((row, idx) => (
                <View key={idx} style={styles.row}>
                    <View style={[styles.iconWrap, { backgroundColor: colors.surfaceContainer }]}>
                        {row.icon}
                    </View>
                    <View style={styles.text}>
                        <Text style={[styles.primary, { color: colors.onSurface }]}>{row.primary}</Text>
                        {row.secondary && (
                            <Text style={[styles.secondary, { color: colors.onSurfaceVariant }]}>
                                {row.secondary}
                            </Text>
                        )}
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
        marginBottom: 24,
        position: 'relative',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    text: {
        flex: 1,
        justifyContent: 'center',
        paddingTop: 2,
    },
    primary: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
    secondary: {
        fontSize: 13,
        marginTop: 2,
        lineHeight: 18,
    },
    editPosition: {
        position: 'absolute',
        top: -4,
        right: 0,
        zIndex: 1,
    },
});
