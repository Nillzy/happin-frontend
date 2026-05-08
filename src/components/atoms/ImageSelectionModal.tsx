import React, { useRef, useState, useEffect } from 'react';
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
    Image,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/use-theme';
import { GRADIENT_PAIRS, type GradientId } from '@/src/constants/gradients';
import { api } from '@/src/services/api';
import { uploadEventImage } from '@/src/services/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StockPhoto {
    url: string;
    thumbnail: string;
    photographer: string;
    unsplash_link: string;
}

function extractSearchTerms(title: string): string {
    const stopWords = new Set([
        'mit', 'und', 'der', 'die', 'das', 'ein', 'eine', 'von', 'zu', 'am', 'im',
        'für', 'auf', 'bei', 'nach', 'an', 'in', 'um', 'den', 'dem', 'des',
        'the', 'a', 'an', 'and', 'or', 'of', 'to', 'at', 'in', 'on', 'for', 'with',
    ]);
    const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    return words.slice(0, 3).join(' ') || title;
}

interface ImageSelectionModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectGradient: (gradientId: GradientId) => void;
    onSelectStockImage?: (imageUrl: string, photographerName: string) => void;
    selectedGradientId?: GradientId;
    selectedImageUrl?: string;
    eventTitle?: string;
}

export default function ImageSelectionModal({
    visible,
    onClose,
    onSelectGradient,
    onSelectStockImage,
    selectedGradientId,
    selectedImageUrl,
    eventTitle,
}: ImageSelectionModalProps) {
    const { colors } = useTheme();

    const [stockPhotos, setStockPhotos] = useState<StockPhoto[]>([]);
    const [stockLoading, setStockLoading] = useState(false);
    const [, setStockError] = useState(false);
    const [uploading, setUploading] = useState(false);

    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
            onPanResponderMove: (_, gs) => { if (gs.dy > 0) translateY.setValue(gs.dy); },
            onPanResponderRelease: (_, gs) => {
                if (gs.dy > 100) handleClose();
                else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
            if (eventTitle?.trim()) fetchStockPhotos(eventTitle);
        }
    }, [visible, eventTitle]);

    const fetchStockPhotos = async (title: string) => {
        try {
            setStockLoading(true);
            setStockError(false);
            const query = extractSearchTerms(title);
            const results = await api.searchStockImages(query, 8);
            setStockPhotos(results);
        } catch (e) {
            console.warn('Stock image search failed:', e);
            setStockPhotos([]);
            setStockError(true);
        } finally {
            setStockLoading(false);
        }
    };

    const handlePickImage = async () => {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Berechtigung erforderlich', 'Bitte erlaube Zugriff auf die Galerie.');
                return;
            }
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.85,
            exif: false,
        });

        if (result.canceled || !result.assets[0]) return;

        try {
            setUploading(true);
            const publicUrl = await uploadEventImage(result.assets[0].uri);
            onSelectStockImage?.(publicUrl, 'Eigenes Bild');
            handleClose();
        } catch (e) {
            console.error('Image upload failed:', e);
            Alert.alert('Upload fehlgeschlagen', 'Bitte versuche es erneut.');
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true })
            .start(() => onClose());
    };

    const handleGradientSelect = (id: GradientId) => {
        onSelectGradient(id);
        handleClose();
    };

    const handleStockSelect = (photo: StockPhoto) => {
        onSelectStockImage?.(photo.url, photo.photographer);
        handleClose();
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <View style={styles.modalOverlay}>
                <Animated.View
                    style={[styles.sheetContainer, { backgroundColor: colors.background, transform: [{ translateY }] }]}
                    {...panResponder.panHandlers}
                >
                    <View>
                        <View style={styles.dragHandle}>
                            <View style={[styles.dragIndicator, { backgroundColor: colors.outlineVariant }]} />
                        </View>

                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Titelbild wählen</Text>
                            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                                <Ionicons name="close" size={28} color={colors.onSurface} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                            {/* Eigenes Bild hochladen */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Eigenes Bild</Text>
                                <TouchableOpacity
                                    style={[styles.uploadCard, { backgroundColor: colors.surfaceContainerHigh, borderColor: colors.outlineVariant }]}
                                    onPress={handlePickImage}
                                    activeOpacity={0.7}
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <>
                                            <ActivityIndicator size="large" color={colors.primary} />
                                            <Text style={[styles.uploadText, { color: colors.onSurface }]}>Wird hochgeladen...</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Ionicons name="cloud-upload-outline" size={36} color={colors.primary} />
                                            <Text style={[styles.uploadText, { color: colors.onSurface }]}>Bild hochladen</Text>
                                            <Text style={[styles.uploadSubtext, { color: colors.onSurfaceVariant }]}>JPG, PNG bis 10 MB</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Stockbilder-Vorschläge */}
                            {eventTitle?.trim() && (
                                <View style={styles.section}>
                                    <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>{'Vorschläge für „'}{eventTitle}{'"'}</Text>
                                    {stockLoading ? (
                                        <View style={styles.stockLoading}>
                                            <ActivityIndicator size="small" color={colors.primary} />
                                        </View>
                                    ) : stockPhotos.length > 0 ? (
                                        <>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stockScroll}>
                                                {stockPhotos.map((photo, index) => {
                                                    const isSelected = selectedImageUrl === photo.url;
                                                    return (
                                                        <TouchableOpacity
                                                            key={`stock-${index}`}
                                                            style={[
                                                                styles.stockCard,
                                                                isSelected && { borderColor: colors.primary, borderWidth: 2.5 },
                                                            ]}
                                                            onPress={() => handleStockSelect(photo)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Image
                                                                source={{ uri: photo.thumbnail }}
                                                                style={styles.stockImage}
                                                                resizeMode="cover"
                                                            />
                                                            {isSelected && (
                                                                <View style={[styles.checkmark, styles.stockCheckmark, { backgroundColor: colors.primary }]}>
                                                                    <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                                                                </View>
                                                            )}
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </ScrollView>
                                            <Text style={[styles.unsplashCredit, { color: colors.onSurfaceVariant }]}>
                                                Kostenlose Bilder von Unsplash
                                            </Text>
                                        </>
                                    ) : null}
                                </View>
                            )}

                            {/* Gradient-Vorlagen */}
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitleSmall, { color: colors.onSurfaceVariant }]}>
                                    Oder eine Farbvorlage wählen
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gradientScroll}>
                                    {GRADIENT_PAIRS.map((gradient, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.gradientCard,
                                                selectedGradientId === index && { borderColor: colors.primary, borderWidth: 2.5 },
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
                                                    <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
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
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 14,
    },
    sectionTitleSmall: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
    },

    // Upload
    uploadCard: {
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        paddingVertical: 48,
        alignItems: 'center',
        gap: 8,
    },
    uploadText: {
        fontSize: 17,
        fontWeight: '700',
        marginTop: 4,
    },
    uploadSubtext: {
        fontSize: 13,
    },

    // Stock photos
    stockScroll: {
        marginHorizontal: -24,
        paddingHorizontal: 24,
    },
    stockCard: {
        width: 140,
        height: 96,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        marginRight: 10,
    },
    stockImage: {
        width: '100%',
        height: '100%',
    },
    stockCheckmark: {
        top: 6,
        right: 6,
    },
    stockLoading: {
        height: 96,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unsplashCredit: {
        fontSize: 11,
        marginTop: 8,
    },

    // Gradients
    gradientScroll: {
        marginHorizontal: -24,
        paddingHorizontal: 24,
    },
    gradientCard: {
        width: 80,
        height: 56,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        marginRight: 10,
    },
    gradientPreview: {
        width: '100%',
        height: '100%',
    },
    checkmark: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
