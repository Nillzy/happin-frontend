import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
    Animated,
    PanResponder,
    Dimensions,
    ScrollView,
    Platform,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface EditDrawerProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    noScroll?: boolean;
    disableClose?: boolean;
}

export default function EditDrawer({
    visible,
    onClose,
    title,
    children,
    noScroll,
    disableClose,
}: EditDrawerProps) {
    const { colors } = useTheme();

    const [keyboardOffset, setKeyboardOffset] = useState(0);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const show = Keyboard.addListener(showEvent, e => setKeyboardOffset(e.endCoordinates.height));
        const hide = Keyboard.addListener(hideEvent, () => setKeyboardOffset(0));
        return () => { show.remove(); hide.remove(); };
    }, []);

    const disableCloseRef = useRef(disableClose);
    disableCloseRef.current = disableClose;

    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!visible) return;
        setIsClosing(false);
        translateY.setValue(SCREEN_HEIGHT);
        backdropOpacity.setValue(0);
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
    }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

    const animateClose = useCallback(() => {
        setIsClosing(true);
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => onCloseRef.current());
    }, [translateY, backdropOpacity]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !disableCloseRef.current,
            onMoveShouldSetPanResponder: (_, gs) => !disableCloseRef.current && Math.abs(gs.dy) > 5,
            onPanResponderMove: (_, gs) => {
                if (gs.dy > 0) translateY.setValue(gs.dy);
            },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 100) {
                    animateClose();
                } else {
                    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
                }
            },
        })
    ).current;

    const handleClose = useCallback(() => {
        if (disableCloseRef.current) return;
        animateClose();
    }, [animateClose]);

    if (!visible) return null;

    const content = noScroll ? (
        <View style={styles.contentContainer}>{children}</View>
    ) : (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {children}
        </ScrollView>
    );

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View
                style={[styles.backdrop, { opacity: backdropOpacity }]}
                pointerEvents={isClosing ? 'none' : 'box-none'}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View
                style={[
                    styles.sheet,
                    {
                        backgroundColor: colors.background,
                        transform: [{ translateY }],
                        bottom: keyboardOffset,
                        paddingBottom: keyboardOffset > 0 ? 8 : (Platform.OS === 'ios' ? 34 : 24),
                    },
                ]}
            >
                <View {...panResponder.panHandlers} style={styles.dragHandle}>
                    <View style={[styles.dragIndicator, { backgroundColor: colors.outlineVariant }]} />
                </View>

                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.onSurface }]}>{title}</Text>
                    {!disableClose && (
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color={colors.onSurface} />
                        </TouchableOpacity>
                    )}
                </View>

                {content}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: SCREEN_HEIGHT * 0.88,
    },
    dragHandle: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 12,
    },
    dragIndicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    contentContainer: {
        paddingBottom: 24,
        flex: 1,
    },
});
