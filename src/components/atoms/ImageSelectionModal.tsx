import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    PanResponder,
    Dimensions,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { GRADIENT_PAIRS, type GradientId } from '@/src/constants/gradients';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectGradient: (gradientId: GradientId) => void;
    selectedGradientId?: GradientId;
}

/**
 * ImageSelectionModal - Bottom Sheet für Titelbild-Auswahl
 *
 * Bietet zwei Optionen:
 * 1. Vordefinierte Gradient-Vorlagen (funktional)
 * 2. Eigenes Bild hochladen (noch nicht implementiert)
 */
export default function ImageSelectionModal({
    visible,
    onClose,
    onSelectGradient,
    selectedGradientId,
}: ImageSelectionModalProps) {
    const { colors } = useTheme();

    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    translateY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100) {
                    handleClose();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    React.useEffect(() => {
        if (visible) {
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const handleGradientSelect = (id: GradientId) => {
        onSelectGradient(id);
        handleClose();
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay}>
                <Animated.View
                    style={[
                        styles.sheetContainer,
                        {
                            backgroundColor: colors.background,
                            transform: [{ translateY }],
                        },
                    ]}
                    {...panResponder.panHandlers}
                >
                    <View>
                        {/* Drag Handle */}
                        <View style={styles.dragHandle}>
                            <View style={[styles.dragIndicator, { backgroundColor: colors.outlineVariant }]} />
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
                                Titelbild wählen
                            </Text>
                            <TouchableOpacity
                                onPress={handleClose}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={28} color={colors.onSurface} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Vordefinierte Vorlagen */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                                    Vordefinierte Vorlagen
                                </Text>
                                <View style={styles.gradientGrid}>
                                    {GRADIENT_PAIRS.map((gradient, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.gradientCard,
                                                selectedGradientId === index && {
                                                    borderColor: colors.primary,
                                                    borderWidth: 3,
                                                },
                                            ]}
                                            onPress={() => handleGradientSelect(index as GradientId)}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={gradient as [string, string]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={styles.gradientPreview}
                                            />
                                            {selectedGradientId === index && (
                                                <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                                                    <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Eigenes Bild (noch nicht funktional) */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
                                    Eigenes Bild
                                </Text>
                                <TouchableOpacity
                                    style={[
                                        styles.uploadCard,
                                        {
                                            backgroundColor: colors.surfaceContainerHigh,
                                            borderColor: colors.outlineVariant,
                                        },
                                    ]}
                                    onPress={() => {
                                        // TODO: Image Upload implementieren
                                        console.log('Image upload coming soon');
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="image-outline" size={32} color={colors.onSurfaceVariant} />
                                    <Text style={[styles.uploadText, { color: colors.onSurfaceVariant }]}>
                                        Bild hochladen
                                    </Text>
                                    <Text style={[styles.uploadSubtext, { color: colors.onSurfaceVariant }]}>
                                        (Demnächst verfügbar)
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: SCREEN_HEIGHT * 0.85,
        paddingBottom: 24,
    },
    dragHandle: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
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
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    gradientGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    gradientCard: {
        width: '47%',
        aspectRatio: 1.5,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    gradientPreview: {
        width: '100%',
        height: '100%',
    },
    checkmark: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadCard: {
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        paddingVertical: 40,
        alignItems: 'center',
        gap: 8,
    },
    uploadText: {
        fontSize: 16,
        fontWeight: '600',
    },
    uploadSubtext: {
        fontSize: 12,
        fontStyle: 'italic',
    },
});
