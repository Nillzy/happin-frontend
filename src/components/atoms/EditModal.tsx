import React from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface EditModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    onSave: () => void;
    children: React.ReactNode;
}

export default function EditModal({ visible, onClose, title, onSave, children }: EditModalProps) {
    const { colors } = useTheme();

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose} />
            <KeyboardAvoidingView
                style={styles.sheetWrapper}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={[styles.sheet, { backgroundColor: colors.surfaceContainerLow }]}>
                    <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
                    <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>

                    <ScrollView
                        style={styles.content}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {children}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            onPress={onSave}
                            activeOpacity={0.85}
                            style={[styles.saveButton, { backgroundColor: colors.primary }]}
                        >
                            <Text style={[styles.saveButtonText, { color: colors.onPrimary }]}>
                                Speichern
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetWrapper: {
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        maxHeight: '80%',
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 16,
    },
    content: {
        marginBottom: 16,
    },
    footer: {
        paddingTop: 8,
    },
    saveButton: {
        paddingVertical: 14,
        borderRadius: 9999,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
