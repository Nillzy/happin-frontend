import React, { useRef, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

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

    const disableCloseRef = useRef(disableClose);
    disableCloseRef.current = disableClose;

    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    // Gleiche Pattern wie TicketDetailScreen: Animation beim Mount, kein Modal
    useEffect(() => {
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
    }, []);

    const animateClose = useCallback(() => {
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
                pointerEvents="box-none"
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            </Animated.View>

            <Animated.View
                style={[
                    styles.sheet,
                    { backgroundColor: colors.background, transform: [{ translateY }] },
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
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
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
