import React from 'react';
import { View, TouchableOpacity, Image, Text, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/hooks/use-theme';

interface ImageUploaderProps {
    value: string | null;
    onChange: (uri: string) => void;
    aspectRatio?: '16:9' | '4:3' | '1:1';
    maxSizeMB?: number;
}

export default function ImageUploader({
    value,
    onChange,
    aspectRatio = '16:9',
    maxSizeMB = 5
}: ImageUploaderProps) {
    const { colors } = useTheme();

    const pickImage = async (source: 'camera' | 'library') => {
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

        const result = source === 'camera'
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: aspectRatio === '16:9' ? [16, 9] : aspectRatio === '4:3' ? [4, 3] : [1, 1],
                quality: 0.8,
            })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: aspectRatio === '16:9' ? [16, 9] : aspectRatio === '4:3' ? [4, 3] : [1, 1],
                quality: 0.8,
            });

        if (!result.canceled && result.assets[0]) {
            const asset = result.assets[0];
            onChange(asset.uri);
        }
    };

    const showOptions = () => {
        Alert.alert(
            'Titelbild auswählen',
            'Woher möchtest du das Bild nehmen?',
            [
                { text: 'Kamera', onPress: () => pickImage('camera') },
                { text: 'Galerie', onPress: () => pickImage('library') },
                { text: 'Abbrechen', style: 'cancel' },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
                Titelbild *
            </Text>

            <TouchableOpacity
                activeOpacity={0.8}
                onPress={showOptions}
                style={[
                    styles.uploadArea,
                    {
                        backgroundColor: colors.surfaceContainer,
                        borderColor: colors.outlineVariant,
                    },
                ]}
            >
                {value ? (
                    <>
                        <Image source={{ uri: value }} style={styles.previewImage} />
                        <View style={[styles.changeButton, { backgroundColor: colors.primary }]}>
                            <Ionicons name="camera" size={20} color={colors.onPrimary} />
                        </View>
                    </>
                ) : (
                    <View style={styles.placeholder}>
                        <Ionicons name="image-outline" size={48} color={colors.onSurfaceVariant} />
                        <Text style={[styles.placeholderText, { color: colors.onSurfaceVariant }]}>
                            Tippen zum Hochladen
                        </Text>
                        <Text style={[styles.placeholderHint, { color: colors.onSurfaceVariant }]}>
                            Max. {maxSizeMB}MB · {aspectRatio} Format
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
    },
    uploadArea: {
        borderRadius: 20,
        borderWidth: 2,
        borderStyle: 'dashed',
        overflow: 'hidden',
        aspectRatio: 16 / 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholder: {
        alignItems: 'center',
        padding: 24,
    },
    placeholderText: {
        fontSize: 15,
        fontWeight: '600',
        marginTop: 12,
    },
    placeholderHint: {
        fontSize: 12,
        marginTop: 4,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    changeButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
