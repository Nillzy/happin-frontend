import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useUserCity } from '@/hooks/use-user-city';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import MapView, { MapMarker } from '../components/MapView';
import { api } from '../services/api';
import { geocodeCity, geocodeAddress } from '../services/geocoding';
import { getSession } from '../services/supabase';
import type { EventListItem } from '../types/events';

const BERLIN = { lat: 52.52, lng: 13.405 };
const API_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';

const MAP_STYLES = [
    { label: 'Base Light', url: `https://api.maptiler.com/maps/019dfc91-be68-7eb0-a241-e7a2d1d21b6a/style.json?key=${API_KEY}` },
    { label: 'Base Dark + Layer', url: `https://api.maptiler.com/maps/019dfca2-7a0c-7ac9-bae7-dfa64252c3f0/style.json?key=${API_KEY}` },
];

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
    const [styleIndex, setStyleIndex] = useState(isDark ? 1 : 0);

    const loadingRef = useRef(false);

    useEffect(() => {
        if (!cityLoaded) return;

        if (cachedMarkers !== null && cachedCity !== null && city !== cachedCity) {
            cachedCity = city;
            geocodeCity(city).then((c) => {
                cachedCenter = c;
                setCenter(c);
            });
            return;
        }

        if (cachedMarkers !== null) return;
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

                const withCoords = events.filter((e: EventListItem) =>
                    e.location?.latitude != null && e.location?.longitude != null
                );

                const needsGeocode = events.filter((e: EventListItem) =>
                    (e.location?.latitude == null || e.location?.longitude == null)
                    && (e.location?.street || e.location?.city)
                );

                const geocoded = await Promise.all(
                    needsGeocode.map(async (e: EventListItem) => {
                        try {
                            const street = e.location?.street && e.location?.house_number
                                ? `${e.location.street} ${e.location.house_number}`
                                : e.location?.street;
                            const coords = await geocodeAddress(street, e.location?.city, e.location?.postal_code, e.location?.country);
                            if (!coords) return null;
                            return { event: e, ...coords };
                        } catch {
                            return null;
                        }
                    })
                );

                const pins: MapMarker[] = [
                    ...withCoords.map((e: EventListItem) => ({
                        lat: e.location!.latitude!,
                        lng: e.location!.longitude!,
                        title: e.title,
                        eventId: e.event_id,
                        location: [e.location?.street && e.location?.house_number ? `${e.location.street} ${e.location.house_number}` : e.location?.street, e.location?.city].filter(Boolean).join(', ') || undefined,
                        startsAt: e.starts_at,
                        isFree: e.is_free,
                        imageUrl: e.image_url,
                    })),
                    ...geocoded.filter(Boolean).map((g: any) => ({
                        lat: g.lat,
                        lng: g.lng,
                        title: g.event.title,
                        eventId: g.event.event_id,
                        location: [g.event.location?.street && g.event.location?.house_number ? `${g.event.location.street} ${g.event.location.house_number}` : g.event.location?.street, g.event.location?.city].filter(Boolean).join(', ') || undefined,
                        startsAt: g.event.starts_at,
                        isFree: g.event.is_free,
                        imageUrl: g.event.image_url,
                    })),
                ];

                cachedMarkers = pins;
                cachedCenter = resolvedCenter;
                cachedCity = city;

                setMarkers(pins);
                setCenter(resolvedCenter);
            } catch (err) {
                console.error('[MapScreen] Fehler beim Laden:', err);
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
                        <View style={styles.styleBar}>
                            {MAP_STYLES.map((s, i) => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => setStyleIndex(i)}
                                    style={[
                                        styles.styleBtn,
                                        { borderColor: colors.primary },
                                        styleIndex === i && { backgroundColor: colors.primary },
                                    ]}
                                >
                                    <Text style={[
                                        styles.styleBtnText,
                                        { color: styleIndex === i ? colors.onPrimary : colors.primary },
                                    ]}>
                                        {s.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <MapView
                            markers={markers}
                            centerLat={center.lat}
                            centerLng={center.lng}
                            isDark={isDark}
                            styleUrl={MAP_STYLES[styleIndex].url}
                            onMarkerPress={(eventId) => router.push(`/event/${eventId}` as any)}
                        />
                    </View>
                )}
            </View>
        </ScreenWithNav>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    mapWrapper: { flex: 1 },
    styleBar: {
        flexDirection: 'row',
        gap: 8,
        padding: 10,
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
    },
    styleBtn: {
        borderWidth: 1,
        borderRadius: 9999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    styleBtnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    hint: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
});
