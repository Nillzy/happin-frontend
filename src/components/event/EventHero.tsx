import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import GradientHero from '../atoms/GradientHero';
import EditButton from '../atoms/EditButton';

interface EventHeroProps {
    title: string;
    subtitle?: string;
    categories?: string[];
    imageUrl?: string;
    editMode?: boolean;
    edited?: boolean;
    onEdit?: () => void;
}

const HERO_HEIGHT = 380;

export default function EventHero({
    title,
    subtitle,
    categories = [],
    imageUrl,
    editMode = false,
    edited = false,
    onEdit,
}: EventHeroProps) {
    return (
        <View style={styles.container}>
            {imageUrl ? (
                <>
                    <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
                    <View style={styles.overlayTop} />
                    <View style={styles.overlayBottom} />
                    <View style={styles.titleBlock}>
                        {categories.length > 0 && (
                            <View style={styles.chips}>
                                {categories.slice(0, 2).map((cat) => (
                                    <View key={cat} style={styles.badge}>
                                        <Text style={styles.badgeText}>{cat}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        <Text style={styles.title}>{title}</Text>
                        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                    </View>
                </>
            ) : (
                <GradientHero title={title} subtitle={subtitle} categories={categories} height={HERO_HEIGHT} />
            )}

            {editMode && onEdit && (
                <View style={styles.editPosition}>
                    <EditButton onPress={onEdit} edited={edited} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: HERO_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    overlayTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        backgroundColor: 'rgba(13,14,21,0.55)',
    },
    overlayBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
        backgroundColor: 'rgba(13,14,21,0.85)',
    },
    titleBlock: {
        position: 'absolute',
        bottom: 28,
        left: 22,
        right: 22,
    },
    chips: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
    badge: {
        backgroundColor: 'rgba(255,177,192,0.22)',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,177,192,0.35)',
    },
    badgeText: {
        color: '#ffb1c0',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    title: {
        color: '#ffffff',
        fontSize: 38,
        fontWeight: '800',
        letterSpacing: -1,
        lineHeight: 44,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.65)',
        fontSize: 15,
        marginTop: 4,
        fontWeight: '500',
    },
    editPosition: {
        position: 'absolute',
        top: 16,
        right: 16,
    },
});
