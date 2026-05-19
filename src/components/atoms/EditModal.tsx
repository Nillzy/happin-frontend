import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    TouchableOpacity,
    StyleSheet,
    Platform,
    ScrollView,
    PanResponder,
    Animated,
    Dimensions,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const animateClose = () => {
        Animated.parallel([
            Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onClose());
    };

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
                    animateClose();
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
        animateClose();
    };

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View
                style={[styles.backdrop, { opacity: backdropOpacity }]}
                pointerEvents="box-none"
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View
                style={[
                    styles.sheet,
                    { backgroundColor: colors.surfaceContainerLow },
                    { transform: [{ translateY }] },
                ]}
            >
                {!isWeb && (
                    <View {...panResponder.panHandlers} style={styles.handleArea}>
                        <View style={[styles.handle, { backgroundColor: colors.outlineVariant }]} />
                    </View>
                )}

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
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
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
