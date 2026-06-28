import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/hooks/use-theme';

type Props = {
    imageUrl?: string | null;
    gradientColors: [string, string];
};

const isWeb = Platform.OS === 'web';

export default function EventBlurBackground({ imageUrl, gradientColors }: Props) {
    const { isDark } = useTheme();

    return (
        <>
            {imageUrl ? (
                <Image
                    source={{ uri: imageUrl }}
                    style={[
                        styles.bgImage,
                        isWeb
                            ? ({ filter: 'blur(60px) saturate(1.8) brightness(0.7)' } as any)
                            : {},
                    ]}
                    blurRadius={isWeb ? 0 : 25}
                    resizeMode="cover"
                />
            ) : (
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bgImage}
                />
            )}
            <View
                style={[
                    styles.bgOverlay,
                    {
                        backgroundColor: isDark
                            ? 'rgba(12,13,20,0.35)'
                            : 'rgba(248,249,250,0.25)',
                    },
                ]}
            />
        </>
    );
}

const styles = StyleSheet.create({
    bgImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
    },
    bgOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});
