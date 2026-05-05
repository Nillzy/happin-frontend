import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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

export default function MapScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { city, loaded: cityLoaded } = useUserCity();

    const [markers, setMarkers] = useState<MapMarker[]>([]);
    const [center, setCenter] = useState(BERLIN);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async (userCity: string) => {
        setLoading(true);
        setError(false);
        try {
            const [token, resolvedCenter] = await Promise.all([
                getSession(),
                userCity ? geocodeCity(userCity) : Promise.resolve(BERLIN),
            ]);
            setCenter(resolvedCenter);

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
            setMarkers(pins);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (cityLoaded) load(city);
    }, [cityLoaded, city, load]);

    return (
        <ScreenWithNav>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                <Navbar />

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
                            onMarkerPress={(eventId) => router.push(`/event/${eventId}` as any)}
                        />
                        {markers.length === 0 && (
                            <View style={styles.emptyOverlay}>
                                <Text style={[styles.hint, { color: colors.onSurfaceVariant }]}>
                                    Noch keine Events mit Standort verfügbar.
                                </Text>
                            </View>
                        )}
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
    emptyOverlay: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    hint: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 24,
    },
});
