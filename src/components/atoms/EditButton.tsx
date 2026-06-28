import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import PencilIcon from './PencilIcon';

interface EditButtonProps {
    onPress: () => void;
    edited?: boolean;
}

export default function EditButton({ onPress, edited = false }: EditButtonProps) {
    const { colors } = useTheme();

    const iconColor = edited ? colors.onSurfaceVariant : colors.primary;
    const bgColor = edited
        ? `${colors.onSurfaceVariant}14`
        : `${colors.primary}18`;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={[styles.container, { backgroundColor: bgColor }]}
            hitSlop={8}
        >
            <PencilIcon size={14} color={iconColor} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
