import React from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface ConfirmModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmModal({
    visible,
    title,
    message,
    confirmLabel,
    cancelLabel = 'Abbrechen',
    onConfirm,
    onCancel,
}: ConfirmModalProps) {
    const { colors } = useTheme();

    const accentColor = colors.error;
    const accentOnColor = colors.onError;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
            <Pressable style={styles.backdrop} onPress={onCancel} />
            <View style={[styles.sheet, { backgroundColor: colors.surfaceContainerLow }]}>
                <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />

                <View style={styles.iconContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: `${accentColor}18` }]}>
                        <Text style={[styles.iconText, { color: accentColor }]}>!</Text>
                    </View>
                </View>

                <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
                <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>{message}</Text>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.cancelBtn, { borderColor: colors.outlineVariant }]}
                        onPress={onCancel}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.cancelBtnText, { color: colors.onSurface }]}>{cancelLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: accentColor }]}
                        onPress={onConfirm}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.confirmBtnText, { color: accentOnColor }]}>{confirmLabel}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.bottomSpacer} />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 24,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 24,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconText: {
        fontSize: 28,
        fontWeight: '800',
    },
    title: {
        fontSize: 19,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 9999,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 9999,
        alignItems: 'center',
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    bottomSpacer: {
        height: Platform.OS === 'ios' ? 34 : 24,
    },
});
