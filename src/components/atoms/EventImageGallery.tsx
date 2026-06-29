import React from 'react';
import { View, ScrollView, Image, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';

interface EventImageGalleryProps {
    images: string[];
}

export default function EventImageGallery({ images }: EventImageGalleryProps) {
    const { colors } = useTheme();

    if (images.length === 0) return null;

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: colors.onSurfaceVariant }]}>
                Weitere Bilder
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {images.map((uri, index) => (
                    <View key={index} style={styles.imageCard}>
                        <Image source={{ uri }} style={styles.image} />
                        <View style={[styles.badge, { backgroundColor: colors.onSurface }]}>
                            <Text style={[styles.badgeText, { color: colors.surface }]}>
                                {index + 1}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    title: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
        letterSpacing: 0.2,
    },
    scrollContent: {
        paddingVertical: 4,
        gap: 12,
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
});
