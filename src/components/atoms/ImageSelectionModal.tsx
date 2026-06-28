import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    Platform,
    TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/src/hooks/use-theme';
import { GRADIENT_PAIRS, type GradientId } from '@/src/constants/gradients';
import { api } from '@/src/services/api';
import { uploadEventImage } from '@/src/services/supabase';
import EditDrawer from './EditDrawer';
import { SkeletonBox } from './SkeletonBox';

interface StockPhoto {
    url: string;
    thumbnail: string;
    photographer: string;
    unsplash_link: string;
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
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const initializedRef = useRef(false);

    // Beim Öffnen: Suchfeld mit Eventtitel befüllen und sofort laden
    useEffect(() => {
        if (!visible) {
            initializedRef.current = false;
            return;
        }
        if (initializedRef.current) return;
        initializedRef.current = true;

        const title = eventTitle?.trim() ?? '';
        setSearchQuery(title);
        if (title) {
            fetchStockPhotos(title);
        }
    }, [visible, eventTitle]);

    const fetchStockPhotos = async (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        try {
            setStockLoading(true);
            setStockPhotos([]);
            const results = await api.searchStockImages(trimmed, 8);
            setStockPhotos(results);
        } catch (e) {
            console.warn('Stock image search failed:', e);
            setStockPhotos([]);
        } finally {
            setStockLoading(false);
        }
    };

    const handleSearch = () => {
        fetchStockPhotos(searchQuery);
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
            onClose();
        } catch (e) {
            console.error('Image upload failed:', e);
            Alert.alert('Upload fehlgeschlagen', 'Bitte versuche es erneut.');
        } finally {
            setUploading(false);
        }
    };

    const handleGradientSelect = (id: GradientId) => {
        onSelectGradient(id);
        onClose();
    };

    const handleStockSelect = (photo: StockPhoto) => {
        onSelectStockImage?.(photo.url, photo.photographer);
        onClose();
    };

    return (
        <EditDrawer visible={visible} onClose={onClose} title="Titelbild wählen">
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

            {/* Stockbild suchen */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Stockbild wählen</Text>
                <View style={[styles.searchRow, { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerHigh }]}>
                    <TextInput
                        style={[styles.searchInput, { color: colors.onSurface }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Suchbegriff eingeben..."
                        placeholderTextColor={colors.onSurfaceVariant}
                        returnKeyType="search"
                        onSubmitEditing={handleSearch}
                        editable={!stockLoading}
                    />
                    <TouchableOpacity
                        style={[styles.searchBtn, { backgroundColor: colors.primary }]}
                        onPress={handleSearch}
                        activeOpacity={0.8}
                        disabled={stockLoading || !searchQuery.trim()}
                    >
                        {stockLoading ? (
                            <ActivityIndicator size="small" color={colors.onPrimary} />
                        ) : (
                            <Ionicons name="search" size={18} color={colors.onPrimary} />
                        )}
                    </TouchableOpacity>
                </View>

                {stockLoading ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stockScroll} scrollEnabled={false}>
                        {[0, 1, 2, 3].map(i => (
                            <SkeletonBox key={i} width={140} height={96} borderRadius={12} style={{ marginRight: 10 }} />
                        ))}
                    </ScrollView>
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
                ) : searchQuery.trim() ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="images-outline" size={28} color={colors.onSurfaceVariant} />
                        <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
                            Keine Bilder gefunden
                        </Text>
                    </View>
                ) : null}
            </View>

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
        </EditDrawer>
    );
}

const styles = StyleSheet.create({
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
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 14,
        overflow: 'hidden',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    searchBtn: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    emptyState: {
        height: 96,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
    },
    unsplashCredit: {
        fontSize: 11,
        marginTop: 8,
    },
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
