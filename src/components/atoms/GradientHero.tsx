import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientHeroProps {
    title: string;
    subtitle?: string;
    categories?: string[];
    height?: number;
}

const HERO_HEIGHT = 380;

export default function GradientHero({
    title,
    subtitle,
    categories = [],
    height = HERO_HEIGHT,
}: GradientHeroProps) {
    return (
        <View style={[styles.container, { height }]}>
            <LinearGradient
                colors={['#D4006B', '#8B3DC8'] as const}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
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
                <Text style={styles.title} numberOfLines={2}>{title || 'Dein Event'}</Text>
                {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        overflow: 'hidden',
    },
    overlayBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
        backgroundColor: 'rgba(13,14,21,0.65)',
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
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
    },
    badgeText: {
        color: '#ffffff',
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
});
