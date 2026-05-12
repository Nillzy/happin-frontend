import React, { useRef } from 'react';
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
    PanResponder,
    Animated,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface EditModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    onSave: () => void;
    children: React.ReactNode;
}

const isWeb = Platform.OS === 'web';
const DISMISS_THRESHOLD = 80;

export default function EditModal({ visible, onClose, title, onSave, children }: EditModalProps) {
    const { colors } = useTheme();
    const translateY = useRef(new Animated.Value(0)).current;

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) =>
                !isWeb && gestureState.dy > 5,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > DISMISS_THRESHOLD) {
                    Animated.timing(translateY, {
                        toValue: 600,
                        duration: 200,
                        useNativeDriver: true,
                    }).start(() => {
                        translateY.setValue(0);
                        onClose();
                    });
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 4,
                    }).start();
                }
            },
        })
    ).current;

    const handleClose = () => {
        translateY.setValue(0);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent
            statusBarTranslucent
            hardwareAccelerated
            onRequestClose={handleClose}
        >
            {/* Backdrop fills screen immediately — no animation */}
            <Pressable style={styles.backdrop} onPress={handleClose} />

            <KeyboardAvoidingView
                style={styles.sheetWrapper}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                pointerEvents="box-none"
            >
                <Animated.View
                    style={[
                        styles.sheet,
                        { backgroundColor: colors.surfaceContainerLow },
                        { transform: [{ translateY }] },
                    ]}
                >
                    {/* Drag handle — mobile only, used to pull down and dismiss */}
                    {!isWeb && (
                        <View {...panResponder.panHandlers} style={styles.handleArea}>
                            <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
                        </View>
                    )}

                    {/* Header: title + close button on web */}
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
                        {isWeb && (
                            <TouchableOpacity
                                onPress={handleClose}
                                hitSlop={8}
                                activeOpacity={0.7}
                                style={styles.closeBtn}
                            >
                                <Text style={[styles.closeBtnText, { color: colors.onSurfaceVariant }]}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>

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
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheetWrapper: {
        flex: 1,
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
    handleArea: {
        alignItems: 'center',
        paddingBottom: 12,
        marginTop: -4,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
    },
    closeBtn: {
        marginLeft: 12,
        padding: 4,
    },
    closeBtnText: {
        fontSize: 18,
        fontWeight: '400',
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
