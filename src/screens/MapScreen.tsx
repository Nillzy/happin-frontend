import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useUserCity } from '@/hooks/use-user-city';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import MapView, { MapMarker } from '../components/MapView';
import { api } from '../services/api';
import { geocodeCity } from '../services/geocoding';
import { getSession } from '../services/supabase';
import type { EventListItem } from '../types/events';

const BERLIN = { lat: 52.52, lng: 13.405 };

// Modul-Level Cache — überlebt Tab-Wechsel
let cachedMarkers: MapMarker[] | null = null;
let cachedCenter: { lat: number; lng: number } | null = null;
let cachedCity: string | null = null;

export default function MapScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { city, loaded: cityLoaded } = useUserCity();

    const [markers, setMarkers] = useState<MapMarker[]>(cachedMarkers ?? []);
    const [center, setCenter] = useState(cachedCenter ?? BERLIN);
    const [loading, setLoading] = useState(cachedMarkers === null);
    const [error, setError] = useState(false);

    const loadingRef = useRef(false);

    useEffect(() => {
        if (!cityLoaded) return;

        // Stadtänderung — nur Mittelpunkt neu berechnen
        if (cachedMarkers !== null && cachedCity !== null && city !== cachedCity) {
            cachedCity = city;
            geocodeCity(city).then((c) => {
                cachedCenter = c;
                setCenter(c);
            });
            return;
        }

        // Bereits geladen — nichts tun
        if (cachedMarkers !== null) return;

        // Verhindert doppelten Load bei StrictMode
        if (loadingRef.current) return;
        loadingRef.current = true;

        (async () => {
            setLoading(true);
            setError(false);
            try {
                const [token, resolvedCenter] = await Promise.all([
                    getSession(),
                    city ? geocodeCity(city) : Promise.resolve(BERLIN),
                ]);

                const { events } = await api.getPublicEvents(50, 0, token ?? undefined);
                const pins: MapMarker[] = events
                    .filter((e: EventListItem) =>
                        e.location?.latitude != null && e.location?.longitude != null
                    )
                    .map((e: EventListItem) => ({
                        lat: e.location!.latitude!,
                        lng: e.location!.longitude!,
                        title: e.title,
                        eventId: e.event_id,
                    }));

                cachedMarkers = pins;
                cachedCenter = resolvedCenter;
                cachedCity = city;

                setMarkers(pins);
                setCenter(resolvedCenter);
            } catch {
                setError(true);
                loadingRef.current = false;
            } finally {
                setLoading(false);
            }
        })();
    }, [cityLoaded, city]);

    return (
        <ScreenWithNav>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                {Platform.OS === 'web' && <Navbar showCta={false} />}

                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
                            Karte wird geladen…
                        </Text>
                    </View>
                ) : error ? (
                    <View style={styles.centered}>
                        <Text style={[styles.hint, { color: colors.error }]}>
                            Events konnten nicht geladen werden.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.mapWrapper}>
                        <MapView
                            markers={markers}
                            centerLat={center.lat}
                            centerLng={center.lng}
                            isDark={isDark}
                            onMarkerPress={(eventId) => router.push(`/event/${eventId}` as any)}
                        />
                    </View>
                )}
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    mapWrapper: {
        flex: 1,
    },
    hint: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 24,
    },
});
