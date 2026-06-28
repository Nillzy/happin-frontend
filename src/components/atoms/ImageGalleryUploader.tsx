import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';
import { uploadEventImage } from '@/src/services/supabase';

interface ImageGalleryUploaderProps {
    images: string[];
    onChange: (images: string[]) => void;
    maxImages?: number;
}

export default function ImageGalleryUploader({
    images,
    onChange,
    maxImages = 10
}: ImageGalleryUploaderProps) {
    const { colors } = useTheme();
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const uploadUri = async (uri: string) => {
        try {
            setUploading(true);
            const publicUrl = await uploadEventImage(uri);
            onChange([...images, publicUrl]);
        } catch (e) {
            console.error('Gallery image upload failed:', e);
            if (Platform.OS !== 'web') Alert.alert('Upload fehlgeschlagen', 'Bitte versuche es erneut.');
        } finally {
            setUploading(false);
        }
    };

    const handleWebFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        await uploadUri(objectUrl);
        // Reset so the same file can be picked again
        (e.target as HTMLInputElement).value = '';
    };

    const pickAndUpload = async (source: 'camera' | 'library') => {
        if (images.length >= maxImages) {
            Alert.alert('Maximum erreicht', `Du kannst maximal ${maxImages} Bilder hinzufügen.`);
            return;
        }

        if (Platform.OS !== 'web') {
            const { status } = source === 'camera'
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Berechtigung erforderlich',
                    `Bitte erlaube Zugriff auf ${source === 'camera' ? 'die Kamera' : 'die Galerie'}.`
                );
                return;
            }
        }

        const result = source === 'camera'
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.85,
                exif: false,
            })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.85,
                exif: false,
            });

        if (!result.canceled && result.assets[0]) {
            await uploadUri(result.assets[0].uri);
        }
    };

    const handleAddPress = () => {
        if (images.length >= maxImages || uploading) return;
        if (Platform.OS === 'web') {
            fileInputRef.current?.click();
        } else {
            Alert.alert(
                'Bild hinzufügen',
                'Woher möchtest du das Bild nehmen?',
                [
                    { text: 'Kamera', onPress: () => pickAndUpload('camera') },
                    { text: 'Galerie', onPress: () => pickAndUpload('library') },
                    { text: 'Abbrechen', style: 'cancel' },
                ]
            );
        }
    };

    const removeImage = (index: number) => {
        onChange(images.filter((_, i) => i !== index));
    };

    return (
        <View style={styles.container}>
            {Platform.OS === 'web' && (
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleWebFileChange as any}
                />
            )}
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.onSurface }]}>
                    Weitere Bilder
                </Text>
                <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
                    {images.length}/{maxImages}
                </Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Add Button */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleAddPress}
                    style={[
                        styles.addButton,
                        {
                            backgroundColor: colors.surfaceContainer,
                            borderColor: colors.outlineVariant,
                        },
                    ]}
                    disabled={images.length >= maxImages || uploading}
                >
                    {uploading ? (
                        <>
                            <ActivityIndicator size="small" color={colors.primary} />
                            <Text style={[styles.addButtonText, { color: colors.primary }]}>
                                Lädt hoch...
                            </Text>
                        </>
                    ) : (
                        <>
                            <Ionicons
                                name="add"
                                size={32}
                                color={images.length >= maxImages ? colors.outlineVariant : colors.primary}
                            />
                            <Text
                                style={[
                                    styles.addButtonText,
                                    {
                                        color: images.length >= maxImages
                                            ? colors.onSurfaceVariant
                                            : colors.primary,
                                    },
                                ]}
                            >
                                Hinzufügen
                            </Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Image Cards */}
                {images.map((uri, index) => (
                    <View key={index} style={styles.imageCard}>
                        <Image source={{ uri }} style={styles.image} />
                        <TouchableOpacity
                            style={[styles.removeButton, { backgroundColor: colors.error }]}
                            onPress={() => removeImage(index)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="close" size={20} color={colors.onError} />
                        </TouchableOpacity>
                        {/* Image Number Badge */}
                        <View style={[styles.badge, { backgroundColor: colors.onSurface }]}>
                            <Text style={[styles.badgeText, { color: colors.surface }]}>
                                {index + 1}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
                Zeige dein Event aus verschiedenen Perspektiven
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '600',
    },
    scrollContent: {
        paddingVertical: 4,
        gap: 12,
    },
    addButton: {
        width: 140,
        height: 180,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    addButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    imageCard: {
        width: 140,
        height: 180,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    hint: {
        fontSize: 12,
        marginTop: 8,
        lineHeight: 16,
    },
});
