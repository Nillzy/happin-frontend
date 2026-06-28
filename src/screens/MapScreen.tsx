import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useUserCity } from '@/src/utils/useUserCity';
import Navbar from '../components/atoms/Navbar';
import ScreenWithNav from '../components/atoms/ScreenWithNav';
import { SkeletonBox } from '../components/atoms/SkeletonBox';
import MapView, { MapMarker } from '../components/map/MapView';
import { api } from '../services/api';
import { geocodeCity, geocodeAddress } from '../services/geocoding';
import { getSession, authorize } from '../services/supabase';
import type { EventListItem } from '../types/events';

const BERLIN = { lat: 52.52, lng: 13.405 };
const API_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';

const MAP_STYLE_LIGHT = `https://api.maptiler.com/maps/019dfc91-be68-7eb0-a241-e7a2d1d21b6a/style.json?key=${API_KEY}`;
const MAP_STYLE_DARK  = `https://api.maptiler.com/maps/019dfca2-7a0c-7ac9-bae7-dfa64252c3f0/style.json?key=${API_KEY}`;

// Modul-Level Cache — überlebt Tab-Wechsel
let cachedMarkers: MapMarker[] | null = null;
let cachedCenter: { lat: number; lng: number } | null = null;
let cachedCity: string | null = null;
let lastViewedCenter: { lat: number; lng: number } | null = null;
let lastViewedZoom: number | null = null;

export default function MapScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { city, loaded: cityLoaded } = useUserCity();

    const [markers, setMarkers] = useState<MapMarker[]>(cachedMarkers ?? []);
    const [center, setCenter] = useState(lastViewedCenter ?? cachedCenter ?? BERLIN);
    const [zoom, setZoom] = useState(lastViewedZoom ?? 11);
    const [loading, setLoading] = useState(cachedMarkers === null);
    const [error, setError] = useState(false);
    const [readyToLoad, setReadyToLoad] = useState(cityLoaded);

    const loadingRef = useRef(false);

    useEffect(() => {
        authorize().then((isAuthorized) => {
            if (!isAuthorized) router.replace('/login');
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (cityLoaded) setReadyToLoad(true);
    }, [cityLoaded]);

    // Fallback: proceed after 5s even if cityLoaded never fires
    useEffect(() => {
        const id = setTimeout(() => setReadyToLoad(true), 5000);
        return () => clearTimeout(id);
    }, []);

    useEffect(() => {
        if (!readyToLoad) return;

        if (cachedMarkers !== null && cachedCity !== null && city !== cachedCity) {
            cachedCity = city;
            geocodeCity(city).then((c) => {
                cachedCenter = c;
                lastViewedCenter = c;
                lastViewedZoom = 11;
                setCenter(c);
                setZoom(11);
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

                const now = Date.now();
                const upcomingEvents = events.filter((e: EventListItem) => new Date(e.starts_at).getTime() > now);

                const withCoords = upcomingEvents.filter((e: EventListItem) =>
                    e.location?.latitude != null && e.location?.longitude != null
                );

                const needsGeocode = upcomingEvents.filter((e: EventListItem) =>
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
                if (!lastViewedCenter) {
                    lastViewedCenter = resolvedCenter;
                    lastViewedZoom = 11;
                    setCenter(resolvedCenter);
                    setZoom(11);
                }
            } catch (err) {
                console.error('[MapScreen] Fehler beim Laden:', err);
                setError(true);
                loadingRef.current = false;
            } finally {
                setLoading(false);
            }
        })();
    }, [readyToLoad, city]);

    return (
        <ScreenWithNav>
            <Head><title>Karte – Happin</title></Head>
            <View style={[styles.root, { backgroundColor: colors.background }]}>
                {Platform.OS === 'web' && <Navbar showCta={false} />}

                {loading ? (
                    <View style={styles.skeletonMap}>
                        {/* Karten-Fläche */}
                        <SkeletonBox height={'100%' as any} borderRadius={0} />
                        {/* Marker-Punkte */}
                        <SkeletonBox width={18} height={18} borderRadius={9} style={{ position: 'absolute', top: '28%', left: '35%' }} />
                        <SkeletonBox width={18} height={18} borderRadius={9} style={{ position: 'absolute', top: '42%', left: '55%' }} />
                        <SkeletonBox width={18} height={18} borderRadius={9} style={{ position: 'absolute', top: '55%', left: '25%' }} />
                        <SkeletonBox width={18} height={18} borderRadius={9} style={{ position: 'absolute', top: '35%', left: '70%' }} />
                        <SkeletonBox width={18} height={18} borderRadius={9} style={{ position: 'absolute', top: '65%', left: '60%' }} />
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
                            zoom={zoom}
                            isDark={isDark}
                            styleUrl={isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
                            onMarkerPress={(eventId) => router.push(`/event/${eventId}` as any)}
                            onPositionChanged={(lat, lng, z) => {
                                lastViewedCenter = { lat, lng };
                                lastViewedZoom = z;
                            }}
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
    skeletonMap: { flex: 1, position: 'relative', overflow: 'hidden' },
    hint: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
});
