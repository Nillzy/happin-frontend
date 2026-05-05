/**
 * MapView Component
 *
 * Einfache interaktive Karte mit MapTiler SDK.
 * Nur Basis-Funktionen: Zoom, Pan, Light/Dark Mode
 *
 * SETUP:
 * 1. Erstelle Account bei maptiler.com (kostenlos)
 * 2. Hole API Key vom Dashboard
 * 3. Füge zu .env.local hinzu: EXPO_PUBLIC_MAPTILER_API_KEY=dein_key
 * 4. Starte Expo neu
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

// Dynamic import für MapTiler SDK (nur Web)
let MapTilerSDK: any = null;
if (Platform.OS === 'web') {
    // @ts-ignore
    MapTilerSDK = require('@maptiler/sdk');
}

export interface MapViewProps {
    center?: [number, number]; // [lng, lat]
    zoom?: number;
}

/**
 * Basis-Karte mit MapTiler
 */
export default function MapView({
    center = [13.4050, 52.5200], // Berlin
    zoom = 12,
}: MapViewProps) {
    const { colors, isDark } = useTheme();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const apiKey = process.env.EXPO_PUBLIC_MAPTILER_API_KEY;

    // Map initialisieren (Web)
    useEffect(() => {
        if (Platform.OS !== 'web') {
            setError('Nur Web wird aktuell unterstützt');
            setIsLoading(false);
            return;
        }

        if (!MapTilerSDK) {
            setError('MapTiler SDK nicht geladen');
            setIsLoading(false);
            return;
        }

        if (!apiKey) {
            setError('MapTiler API Key fehlt');
            setIsLoading(false);
            return;
        }

        if (!mapContainerRef.current) return;

        // API Key setzen
        MapTilerSDK.config.apiKey = apiKey;

        // Map erstellen
        const map = new MapTilerSDK.Map({
            container: mapContainerRef.current,
            style: isDark
                ? MapTilerSDK.MapStyle.DATAVIZ.DARK
                : MapTilerSDK.MapStyle.STREETS,
            center: center,
            zoom: zoom,
        });

        mapInstanceRef.current = map;

        map.on('load', () => {
            setIsLoading(false);
        });

        map.on('error', (e: any) => {
            console.error('MapTiler error:', e);
            setError('Karte konnte nicht geladen werden');
            setIsLoading(false);
        });

        // Cleanup
        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [apiKey, isDark, center[0], center[1], zoom]);

    // Web: Map Container
    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                {/* Map Container */}
                <div
                    ref={mapContainerRef}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: colors.surfaceContainer,
                    }}
                />

                {/* Loading */}
                {isLoading && (
                    <View style={[styles.overlay, { backgroundColor: colors.surface }]}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.text, { color: colors.onSurface }]}>
                            Karte wird geladen...
                        </Text>
                    </View>
                )}

                {/* Error */}
                {error && !isLoading && (
                    <View style={[styles.overlay, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.errorText, { color: colors.error }]}>
                            ⚠️ {error}
                        </Text>
                        {!apiKey && (
                            <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
                                Füge EXPO_PUBLIC_MAPTILER_API_KEY zu .env.local hinzu
                            </Text>
                        )}
                    </View>
                )}
            </View>
        );
    }

    // Mobile: Placeholder
    return (
        <View style={[styles.container, styles.center, { backgroundColor: colors.surfaceContainer }]}>
            <Text style={[styles.text, { color: colors.onSurface }]}>
                📱 Mobile Karte kommt bald
            </Text>
            <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
                Nutze die Web-Version
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        zIndex: 100,
    },
    text: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    hint: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
});
