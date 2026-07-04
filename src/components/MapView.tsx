import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { getEnv } from '@/src/utils/env';

let MapLibre: any = null;
if (Platform.OS !== 'web') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    MapLibre = require('@maplibre/maplibre-react-native');
}

export interface MapMarker {
    lat: number;
    lng: number;
    title: string;
    eventId: string;
    location?: string;
    startsAt?: string;
    isFree?: boolean;
    imageUrl?: string;
}

export interface MarkerCluster {
    type: 'cluster';
    lat: number;
    lng: number;
    count: number;
    markers: MapMarker[];
}

export type MarkerOrCluster = (MapMarker & { type: 'single' }) | MarkerCluster;

const CLUSTER_RADIUS_DEG = 0.0005; // ~55m

export function groupMarkers(markers: MapMarker[]): MarkerOrCluster[] {
    const visited = new Set<number>();
    const result: MarkerOrCluster[] = [];
    for (let i = 0; i < markers.length; i++) {
        if (visited.has(i)) continue;
        visited.add(i);
        const group: MapMarker[] = [markers[i]];
        for (let j = i + 1; j < markers.length; j++) {
            if (visited.has(j)) continue;
            if (
                Math.abs(markers[i].lat - markers[j].lat) <= CLUSTER_RADIUS_DEG &&
                Math.abs(markers[i].lng - markers[j].lng) <= CLUSTER_RADIUS_DEG
            ) {
                visited.add(j);
                group.push(markers[j]);
            }
        }
        if (group.length === 1) {
            result.push({ ...group[0], type: 'single' });
        } else {
            const lat = group.reduce((s, m) => s + m.lat, 0) / group.length;
            const lng = group.reduce((s, m) => s + m.lng, 0) / group.length;
            result.push({ type: 'cluster', lat, lng, count: group.length, markers: group });
        }
    }
    return result;
}

interface MapViewProps {
    markers: MapMarker[];
    onMarkerPress?: (eventId: string) => void;
    centerLat?: number;
    centerLng?: number;
    zoom?: number;
    isDark?: boolean;
    styleUrl?: string;
    showPopups?: boolean;
    interactive?: boolean;
    onMapMoved?: (lat: number, lng: number) => void;
    onPositionChanged?: (lat: number, lng: number, zoom: number) => void;
}

const DEFAULT_CENTER = { lat: 52.52, lng: 13.405 };
const DEFAULT_ZOOM = 11;

const MAP_STYLE_LIGHT = 'https://api.maptiler.com/maps/019dfc91-be68-7eb0-a241-e7a2d1d21b6a/style.json';
const MAP_STYLE_DARK  = 'https://api.maptiler.com/maps/019dfca2-7a0c-7ac9-bae7-dfa64252c3f0/style.json';

function formatDate(iso: string): string {
    const d = new Date(iso);
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]} · ${hh}:${mm}`;
}

function PinIcon() {
    return (
        <Svg width={28} height={34} viewBox="0 0 28 34">
            <Path
                d="M14 1C7.9 1 3 5.9 3 12c0 7.4 11 20 11 20s11-12.6 11-20c0-6.1-4.9-11-11-11z"
                fill="#b32053"
                stroke="#fff"
                strokeWidth={2}
            />
            <Circle cx={14} cy={12} r={4.5} fill="#fff" />
        </Svg>
    );
}

function ClusterPin({ count }: { count: number }) {
    return (
        <View style={{ width: 28, height: 34 }}>
            <PinIcon />
            <View style={clusterBadgeStyles.badge}>
                <Text style={clusterBadgeStyles.text}>{count}</Text>
            </View>
        </View>
    );
}

const clusterBadgeStyles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: -4,
        right: -6,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#b32053',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    text: { color: '#b32053', fontSize: 10, fontWeight: '700', lineHeight: 12 },
});

const POPUP_ZOOM_THRESHOLD = 12.5;
const POPUP_FLY_ZOOM = 14;

function EventPopupCard({ marker }: { marker: MapMarker }) {
    return (
        <View style={styles.popupCard}>
            {marker.imageUrl ? (
                <Image source={{ uri: marker.imageUrl }} style={styles.popupImage} />
            ) : (
                <View style={[styles.popupImage, styles.popupImageFallback]} />
            )}
            <View style={styles.popupBody}>
                <Text numberOfLines={1} style={styles.popupTitle}>
                    {marker.title}
                </Text>
                {marker.location ? (
                    <Text numberOfLines={1} style={styles.popupSub}>
                        📍 {marker.location}
                    </Text>
                ) : null}
                {marker.startsAt ? (
                    <Text numberOfLines={1} style={styles.popupSub}>
                        🗓 {formatDate(marker.startsAt)}
                    </Text>
                ) : null}
                <View style={styles.popupFooter}>
                    <View style={styles.popupBtn}>
                        <Text style={styles.popupBtnText}>
                            {marker.isFree === false ? 'Tickets' : 'Ansehen'}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

function ClusterSheet({
    cluster,
    onClose,
    onEventPress,
    isDark,
}: {
    cluster: MarkerCluster | null;
    onClose: () => void;
    onEventPress: (eventId: string) => void;
    isDark: boolean;
}) {
    const bg = isDark ? '#1e1f26' : '#f8f9fa';
    const surface = isDark ? '#292931' : '#ffffff';
    const onSurface = isDark ? '#e3e1ec' : '#191c1d';
    const onSurfaceVariant = isDark ? '#cac4d0' : '#49454f';
    const outlineVariant = isDark ? '#49454f' : '#cac4d0';

    const translateY = useRef(new Animated.Value(600)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const animateClose = useCallback(() => {
        Animated.parallel([
            Animated.timing(translateY, { toValue: 600, duration: 280, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start(() => onCloseRef.current());
    }, [translateY, backdropOpacity]);

    const animateOpen = useCallback(() => {
        translateY.setValue(600);
        backdropOpacity.setValue(0);
        Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
            Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
    }, [translateY, backdropOpacity]);

    useEffect(() => {
        if (cluster) animateOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cluster]);

    if (!cluster) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View
                style={[sheetStyles.backdrop, { opacity: backdropOpacity }]}
                pointerEvents="box-none"
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={animateClose} />
            </Animated.View>

            <Animated.View
                style={[sheetStyles.sheet, { backgroundColor: bg, transform: [{ translateY }] }]}
            >
                <View style={sheetStyles.dragHandle}>
                    <View style={[sheetStyles.dragIndicator, { backgroundColor: outlineVariant }]} />
                </View>

                <View style={sheetStyles.header}>
                    <Text style={[sheetStyles.headerTitle, { color: onSurface }]}>
                        {cluster.count} Events hier
                    </Text>
                    <Pressable onPress={animateClose} style={sheetStyles.closeBtn} hitSlop={8}>
                        <Text style={[sheetStyles.closeBtnText, { color: onSurfaceVariant }]}>✕</Text>
                    </Pressable>
                </View>

                <ScrollView
                    style={sheetStyles.scroll}
                    contentContainerStyle={sheetStyles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {cluster.markers.map((m) => (
                        <Pressable
                            key={m.eventId}
                            style={[sheetStyles.row, { backgroundColor: surface, borderColor: outlineVariant }]}
                            onPress={() => {
                                onEventPress(m.eventId);
                                animateClose();
                            }}
                            android_ripple={{ color: '#b3205322' }}
                        >
                            {m.imageUrl ? (
                                <Image
                                    source={{ uri: m.imageUrl }}
                                    style={sheetStyles.thumb}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[sheetStyles.thumb, sheetStyles.thumbFallback]} />
                            )}
                            <View style={sheetStyles.rowBody}>
                                <Text numberOfLines={1} style={[sheetStyles.rowTitle, { color: onSurface }]}>
                                    {m.title}
                                </Text>
                                <View style={sheetStyles.rowMeta}>
                                    {m.startsAt ? (
                                        <Text style={[sheetStyles.rowMetaText, { color: onSurfaceVariant }]}>
                                            {formatDate(m.startsAt)}
                                        </Text>
                                    ) : null}
                                    <View
                                        style={[
                                            sheetStyles.badge,
                                            { backgroundColor: m.isFree === false ? '#b3205322' : '#16a34a22' },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                sheetStyles.badgeText,
                                                { color: m.isFree === false ? '#b32053' : '#16a34a' },
                                            ]}
                                        >
                                            {m.isFree === false ? 'Kostenpflichtig' : 'Kostenlos'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <Text style={[sheetStyles.chevron, { color: onSurfaceVariant }]}>›</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const sheetStyles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    },
    dragHandle: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    dragIndicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    closeBtn: { padding: 4 },
    closeBtnText: { fontSize: 20 },
    scroll: { flex: 1 },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        minHeight: 68,
    },
    thumb: {
        width: 56,
        alignSelf: 'stretch',
    },
    thumbFallback: {
        backgroundColor: '#b32053',
    },
    rowBody: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 6,
    },
    rowTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    rowMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    rowMetaText: { fontSize: 12 },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    chevron: {
        fontSize: 22,
        paddingRight: 14,
        fontWeight: '300',
    },
});

function NativeMapView({
    markers,
    onMarkerPress,
    centerLat = DEFAULT_CENTER.lat,
    centerLng = DEFAULT_CENTER.lng,
    zoom = DEFAULT_ZOOM,
    isDark = false,
    styleUrl: styleUrlProp,
    showPopups = true,
    interactive = true,
    onMapMoved,
    onPositionChanged,
}: MapViewProps) {
    const apiKey = getEnv('EXPO_PUBLIC_MAPTILER_KEY');
    const cameraRef = useRef<any>(null);
    const onMapMovedRef = useRef(onMapMoved);
    onMapMovedRef.current = onMapMoved;
    const onPositionChangedRef = useRef(onPositionChanged);
    onPositionChangedRef.current = onPositionChanged;
    const isProgrammaticMoveRef = useRef(false);
    const [currentZoom, setCurrentZoom] = useState<number>(zoom);
    const [activeCluster, setActiveCluster] = useState<MarkerCluster | null>(null);

    const isDraggable = !!onMapMoved;
    const initialCenterRef = useRef({ lat: centerLat, lng: centerLng, zoom });

    const styleUrl = styleUrlProp ?? `${isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}?key=${apiKey}`;

    const grouped = useMemo(() => groupMarkers(markers), [markers]);

    useEffect(() => {
        if (isDraggable) return;
        const cam = cameraRef.current;
        if (!cam) return;
        isProgrammaticMoveRef.current = true;
        cam.setStop({
            centerCoordinate: [centerLng, centerLat],
            zoomLevel: zoom,
            animationDuration: 0,
        });
        setCurrentZoom(zoom);
    }, [centerLat, centerLng, zoom, isDraggable]);

    if (!MapLibre) {
        return <View style={styles.container} />;
    }

    const Map = MapLibre.Map;
    const Camera = MapLibre.Camera;
    const Marker = MapLibre.Marker;

    const allowGestures = interactive || isDraggable;
    const popupsVisible = showPopups && currentZoom >= POPUP_ZOOM_THRESHOLD;

    return (
        <View style={styles.container}>
            <Map
                style={styles.map}
                mapStyle={styleUrl}
                attribution={false}
                logo={false}
                compass={false}
                scaleBar={false}
                dragPan={allowGestures}
                touchZoom={allowGestures}
                doubleTapZoom={allowGestures}
                touchRotate={false}
                touchPitch={false}
                onRegionDidChange={(e: any) => {
                    const ev = e?.nativeEvent;
                    if (typeof ev?.zoom === 'number') {
                        setCurrentZoom(ev.zoom);
                    }
                    if (isProgrammaticMoveRef.current) {
                        isProgrammaticMoveRef.current = false;
                        return;
                    }
                    const c = ev?.center;
                    if (c) {
                        onPositionChangedRef.current?.(c[1], c[0], typeof ev?.zoom === 'number' ? ev.zoom : currentZoom);
                    }
                    if (!isDraggable) return;
                    if (!ev?.userInteraction) return;
                    if (!c) return;
                    onMapMovedRef.current?.(c[1], c[0]);
                }}
            >
                <Camera
                    ref={cameraRef}
                    initialViewState={{
                        center: [initialCenterRef.current.lng, initialCenterRef.current.lat],
                        zoom: initialCenterRef.current.zoom,
                    }}
                />
                {grouped.map((item, idx) =>
                    item.type === 'cluster' ? (
                        <Marker
                            key={`cluster-${idx}`}
                            id={`cluster-${idx}`}
                            lngLat={[item.lng, item.lat]}
                            anchor="bottom"
                            onPress={() => setActiveCluster(item)}
                        >
                            <ClusterPin count={item.count} />
                        </Marker>
                    ) : (
                        <Marker
                            key={`pin-${item.eventId}`}
                            id={`pin-${item.eventId}`}
                            lngLat={[item.lng, item.lat]}
                            anchor="bottom"
                            onPress={() => {
                                if (!showPopups) {
                                    onMarkerPress?.(item.eventId);
                                    return;
                                }
                                isProgrammaticMoveRef.current = true;
                                cameraRef.current?.flyTo({
                                    centerCoordinate: [item.lng, item.lat],
                                    zoomLevel: POPUP_FLY_ZOOM,
                                    animationDuration: 600,
                                });
                            }}
                        >
                            <PinIcon />
                        </Marker>
                    )
                )}
                {popupsVisible
                    ? grouped
                          .filter((item): item is MapMarker & { type: 'single' } => item.type === 'single')
                          .map((item) => (
                              <Marker
                                  key={`popup-${item.eventId}`}
                                  id={`popup-${item.eventId}`}
                                  lngLat={[item.lng, item.lat]}
                                  anchor="bottom"
                                  offset={[0, -46]}
                                  onPress={() => onMarkerPress?.(item.eventId)}
                              >
                                  <EventPopupCard marker={item} />
                              </Marker>
                          ))
                    : null}
            </Map>

            {isDraggable && (
                <View pointerEvents="none" style={styles.centerPin}>
                    <PinIcon />
                </View>
            )}

            <ClusterSheet
                cluster={activeCluster}
                onClose={() => setActiveCluster(null)}
                onEventPress={(id) => onMarkerPress?.(id)}
                isDark={isDark}
            />
        </View>
    );
}

export default function MapView({
    markers,
    onMarkerPress,
    centerLat = DEFAULT_CENTER.lat,
    centerLng = DEFAULT_CENTER.lng,
    zoom = DEFAULT_ZOOM,
    isDark = false,
    styleUrl: styleUrlProp,
    showPopups = true,
    interactive = true,
    onMapMoved,
    onPositionChanged,
}: MapViewProps) {
    const apiKey = getEnv('EXPO_PUBLIC_MAPTILER_KEY');
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null);
    const centerPinRef = useRef<HTMLDivElement | null>(null);
    const markersRef = useRef(markers);
    markersRef.current = markers;
    const onMapMovedRef = useRef(onMapMoved);
    onMapMovedRef.current = onMapMoved;
    const onPositionChangedRef = useRef(onPositionChanged);
    onPositionChangedRef.current = onPositionChanged;
    const skipNextSetCenterRef = useRef(false);
    const isProgrammaticMoveRef = useRef(false);
    const groupedMarkersRef = useRef<MarkerOrCluster[]>([]);
    const [activeCluster, setActiveCluster] = useState<MarkerCluster | null>(null);
    const setActiveClusterRef = useRef<((c: MarkerCluster | null) => void) | null>(null);

    const initialCenterRef = useRef({ lat: centerLat, lng: centerLng });
    const isDraggable = !!onMapMoved;
    const effectiveCenterLat = isDraggable ? initialCenterRef.current.lat : centerLat;
    const effectiveCenterLng = isDraggable ? initialCenterRef.current.lng : centerLng;

    const styleUrl = styleUrlProp ?? `${isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}?key=${apiKey}`;

    useEffect(() => {
        if (Platform.OS !== 'web') return;

        let map: any;
        let markerInstances: any[] = [];
        let interval: ReturnType<typeof setInterval> | null = null;
        let resizeObserver: ResizeObserver | null = null;
        let destroyed = false;

        async function init() {
            const sdk = await import('@maptiler/sdk');
            if (destroyed) return;
            sdk.config.apiKey = apiKey;
            sdk.config.primaryLanguage = sdk.Language.GERMAN;

            if (!document.getElementById('maptiler-sdk-css')) {
                const link = document.createElement('link');
                link.id = 'maptiler-sdk-css';
                link.rel = 'stylesheet';
                link.href = 'https://cdn.maptiler.com/maptiler-sdk-js/v4.0.1/maptiler-sdk.css';
                document.head.appendChild(link);
            }

            if (!mapContainerRef.current || mapInstanceRef.current) return;

            // If the container has no size yet (hidden parent), wait until it does.
            const container = mapContainerRef.current;
            if (container.offsetWidth === 0 || container.offsetHeight === 0) {
                if (typeof ResizeObserver !== 'undefined') {
                    resizeObserver = new ResizeObserver(() => {
                        if (destroyed) { resizeObserver?.disconnect(); return; }
                        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                            resizeObserver?.disconnect();
                            resizeObserver = null;
                            init();
                        }
                    });
                    resizeObserver.observe(container);
                }
                return;
            }

            setActiveClusterRef.current = setActiveCluster;

            map = new sdk.Map({
                container: mapContainerRef.current,
                style: styleUrl,
                center: [effectiveCenterLng, effectiveCenterLat],
                zoom,
                maptilerLogo: false,
                interactive: interactive || !!onMapMovedRef.current,
                ...((interactive || !!onMapMovedRef.current) ? {} : {
                    scrollZoom: false,
                    boxZoom: false,
                    dragRotate: false,
                    dragPan: false,
                    keyboard: false,
                    doubleClickZoom: false,
                    touchZoomRotate: false,
                }),
            });

            const logoEl = mapContainerRef.current.querySelector('.maplibregl-ctrl-logo, .maptiler-ctrl-logo, [class*="logo"]');
            if (logoEl) (logoEl as HTMLElement).style.display = 'none';

            if (isDark) {
                const style = document.createElement('style');
                style.id = 'maptiler-dark-controls';
                style.textContent = `
                    .maplibregl-ctrl-group {
                        background: #1e1f26 !important;
                        border-color: #34343c !important;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
                    }
                    .maplibregl-ctrl-group button {
                        background-color: #1e1f26 !important;
                    }
                    .maplibregl-ctrl-group button + button {
                        border-top-color: #34343c !important;
                    }
                    .maplibregl-ctrl-group button .maplibregl-ctrl-icon {
                        filter: invert(1);
                    }
                    .maplibregl-ctrl-attrib {
                        background: rgba(30,31,38,0.7) !important;
                        color: #aaa !important;
                    }
                    .maplibregl-ctrl-attrib a {
                        color: #aaa !important;
                    }
                    .maplibregl-ctrl-logo, .maplibregl-compact-show,
                    a[href*="maptiler"], .maptilergl-ctrl-logo {
                        display: none !important;
                    }
                `;
                if (!document.getElementById('maptiler-dark-controls')) {
                    document.head.appendChild(style);
                }
            } else {
                const existing = document.getElementById('maptiler-dark-controls');
                if (existing) existing.remove();
                const hideLogoStyle = document.createElement('style');
                hideLogoStyle.id = 'maptiler-hide-logo';
                hideLogoStyle.textContent = `
                    .maplibregl-ctrl-logo, a[href*="maptiler"], .maptilergl-ctrl-logo {
                        display: none !important;
                    }
                `;
                if (!document.getElementById('maptiler-hide-logo')) {
                    document.head.appendChild(hideLogoStyle);
                }
            }

            mapInstanceRef.current = map;

            map.on('load', () => {
                map.resize();

                const container = mapContainerRef.current;
                if (container) {
                    container.querySelectorAll('.maplibregl-ctrl-logo, [class*="maptiler"]').forEach((el: Element) => {
                        (el as HTMLElement).style.display = 'none';
                    });
                    if (!interactive) {
                        container.querySelectorAll('.maplibregl-ctrl-top-right, .maplibregl-ctrl-top-left, .maplibregl-ctrl-bottom-right, .maplibregl-ctrl-bottom-left').forEach((el: Element) => {
                            (el as HTMLElement).style.display = 'none';
                        });
                    }
                }
                addMarkers(sdk);
                addPopupMarkers(sdk);
                updatePopupVisibility();

                if (onMapMovedRef.current && mapContainerRef.current) {
                    const pin = document.createElement('div');
                    pin.style.cssText =
                        'position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);' +
                        'pointer-events:none;z-index:1000;transition:transform 0.15s ease;';
                    pin.innerHTML = '<svg width="32" height="40" viewBox="0 0 28 34" fill="none"><path d="M14 1C7.9 1 3 5.9 3 12c0 7.4 11 20 11 20s11-12.6 11-20c0-6.1-4.9-11-11-11z" fill="#b32053" stroke="#fff" stroke-width="2"/><circle cx="14" cy="12" r="4.5" fill="#fff"/></svg>';
                    centerPinRef.current = pin as any;
                    mapContainerRef.current.style.position = 'relative';
                    mapContainerRef.current.appendChild(pin);

                    map.on('movestart', () => {
                        if (centerPinRef.current) {
                            (centerPinRef.current as HTMLElement).style.transform =
                                'translate(-50%, calc(-100% - 10px)) scale(1.15)';
                        }
                    });
                    map.on('moveend', () => {
                        if (centerPinRef.current) {
                            (centerPinRef.current as HTMLElement).style.transform = 'translate(-50%, -100%)';
                        }
                        if (isProgrammaticMoveRef.current) {
                            isProgrammaticMoveRef.current = false;
                            return;
                        }
                        const c = map.getCenter();
                        skipNextSetCenterRef.current = true;
                        onMapMovedRef.current?.(c.lat, c.lng);
                    });
                }
            });

            // Popup elements keyed by eventId for O(1) lookup
            const popupMarkerMap = new Map<string, any>();

            function createPopupEl(m: MapMarker): HTMLDivElement {
                const dateStr = m.startsAt
                    ? new Date(m.startsAt).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
                      + ' · ' + new Date(m.startsAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                    : '';

                const el = document.createElement('div');
                el.style.cssText =
                    'width:220px;background:#1e1e2e;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.7);pointer-events:auto;cursor:pointer;';
                el.innerHTML = `
                    <div style="width:100%;height:70px;border-radius:14px 14px 0 0;background:${m.imageUrl ? `url(${m.imageUrl}) center/cover` : 'linear-gradient(135deg,#b32053,#7c3aed)'};"></div>
                    <div style="padding:8px 10px 10px;">
                        <div style="font-family:sans-serif;font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;">${m.title}</div>
                        ${m.location ? `<div style="font-family:sans-serif;font-size:10px;color:#aaa;margin-bottom:1px;">📍 ${m.location}</div>` : ''}
                        ${dateStr ? `<div style="font-family:sans-serif;font-size:10px;color:#aaa;">📅 ${dateStr}</div>` : ''}
                    </div>
                `;
                el.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    onMarkerPress?.(m.eventId);
                });
                return el;
            }

            function addPopupMarkers(sdkModule: any) {
                popupMarkerMap.forEach(pm => pm.remove());
                popupMarkerMap.clear();

                groupedMarkersRef.current
                    .filter((item): item is MapMarker & { type: 'single' } => item.type === 'single')
                    .forEach((item) => {
                        const el = createPopupEl(item);
                        const pm = new sdkModule.Marker({ element: el, anchor: 'bottom', offset: [0, -46] })
                            .setLngLat([item.lng, item.lat])
                            .addTo(map);
                        const pmEl = pm.getElement();
                        if (pmEl) pmEl.style.overflow = 'visible';
                        popupMarkerMap.set(item.eventId, pm);
                    });

                updatePopupVisibility();
            }

            function updatePopupVisibility() {
                const z = map.getZoom();
                const showPins = z >= 4;
                const popupsVisible = showPopups && z >= 14;

                markerInstances.forEach((mi) => {
                    const el = mi.getElement();
                    if (el) el.style.display = showPins ? '' : 'none';
                });

                popupMarkerMap.forEach((pm) => {
                    const el = pm.getElement();
                    if (el) el.style.display = popupsVisible ? '' : 'none';
                });
            }

            function createClusterPinEl(count: number): HTMLDivElement {
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'position:relative;width:28px;height:34px;cursor:pointer;line-height:0;';
                wrapper.innerHTML =
                    '<svg width="28" height="34" viewBox="0 0 28 34" fill="none">' +
                    '<path d="M14 1C7.9 1 3 5.9 3 12c0 7.4 11 20 11 20s11-12.6 11-20c0-6.1-4.9-11-11-11z" fill="#b32053" stroke="#fff" stroke-width="2"/>' +
                    '<circle cx="14" cy="12" r="4.5" fill="#fff"/>' +
                    '</svg>';
                const badge = document.createElement('div');
                badge.style.cssText =
                    'position:absolute;top:-4px;right:-6px;min-width:18px;height:18px;border-radius:9px;' +
                    'background:#fff;border:1.5px solid #b32053;display:flex;align-items:center;' +
                    'justify-content:center;padding:0 3px;box-sizing:border-box;' +
                    'font-family:sans-serif;font-size:10px;font-weight:700;color:#b32053;line-height:12px;';
                badge.textContent = String(count);
                wrapper.appendChild(badge);
                return wrapper;
            }

            function addMarkers(sdkModule: any) {
                markerInstances.forEach(mi => mi.remove());
                markerInstances = [];

                groupedMarkersRef.current.forEach((item) => {
                    if (item.type === 'cluster') {
                        const el = createClusterPinEl(item.count);
                        el.addEventListener('click', (e) => {
                            e.stopPropagation();
                            setActiveClusterRef.current?.(item);
                        });
                        const mi = new sdkModule.Marker({ element: el, anchor: 'bottom' })
                            .setLngLat([item.lng, item.lat])
                            .addTo(map);
                        const markerEl = mi.getElement();
                        if (markerEl) markerEl.style.overflow = 'visible';
                        markerInstances.push(mi);
                    } else {
                        const el = document.createElement('div');
                        el.style.cssText = 'width:28px;height:34px;cursor:pointer;line-height:0;';
                        el.innerHTML =
                            '<svg width="28" height="34" viewBox="0 0 28 34" fill="none">' +
                            '<path d="M14 1C7.9 1 3 5.9 3 12c0 7.4 11 20 11 20s11-12.6 11-20c0-6.1-4.9-11-11-11z" fill="#b32053" stroke="#fff" stroke-width="2"/>' +
                            '<circle cx="14" cy="12" r="4.5" fill="#fff"/>' +
                            '</svg>';
                        el.addEventListener('click', (e) => {
                            e.stopPropagation();
                            map.flyTo({ center: [item.lng, item.lat], zoom: 15, duration: 800 });
                            const pm = popupMarkerMap.get(item.eventId);
                            if (pm) {
                                const pmEl = pm.getElement();
                                if (pmEl) pmEl.style.display = '';
                            }
                        });
                        const mi = new sdkModule.Marker({ element: el, anchor: 'bottom' })
                            .setLngLat([item.lng, item.lat])
                            .addTo(map);
                        const markerEl = mi.getElement();
                        if (markerEl) markerEl.style.overflow = 'visible';
                        markerInstances.push(mi);
                    }
                });
            }

            map.on('zoom', () => updatePopupVisibility());

            map.on('moveend', () => {
                if (!isProgrammaticMoveRef.current) {
                    const c = map.getCenter();
                    onPositionChangedRef.current?.(c.lat, c.lng, map.getZoom());
                }
            });

            interval = setInterval(() => {
                if (groupedMarkersRef.current.length !== markerInstances.length && map.loaded()) {
                    groupedMarkersRef.current = groupMarkers(markersRef.current);
                    import('@maptiler/sdk').then(s => {
                        addMarkers(s);
                        addPopupMarkers(s);
                    });
                }
            }, 1000);

            map.on('click', () => {
                if (map.getZoom() < 14) {
                    popupMarkerMap.forEach((pm) => {
                        const pmEl = pm.getElement();
                        if (pmEl) pmEl.style.display = 'none';
                    });
                }
            });
        }

        groupedMarkersRef.current = groupMarkers(markersRef.current);
        init();

        return () => {
            destroyed = true;
            resizeObserver?.disconnect();
            if (interval) clearInterval(interval);
            map?.remove();
            mapInstanceRef.current = null;
            if (centerPinRef.current) {
                centerPinRef.current.remove();
                centerPinRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiKey, styleUrl]);

    useEffect(() => {
        if (Platform.OS !== 'web') return;
        if (isDraggable) return;
        const map = mapInstanceRef.current;
        if (!map) return;
        isProgrammaticMoveRef.current = true;
        map.setCenter([centerLng, centerLat]);
        map.setZoom(zoom);
    }, [centerLat, centerLng, zoom, isDraggable]);

    if (Platform.OS !== 'web') {
        return (
            <NativeMapView
                markers={markers}
                onMarkerPress={onMarkerPress}
                centerLat={centerLat}
                centerLng={centerLng}
                zoom={zoom}
                isDark={isDark}
                styleUrl={styleUrlProp}
                showPopups={showPopups}
                interactive={interactive}
                onMapMoved={onMapMoved}
                onPositionChanged={onPositionChanged}
            />
        );
    }

    void effectiveCenterLat; void effectiveCenterLng; void skipNextSetCenterRef;

    return (
        <View style={styles.container}>
            {/* @ts-ignore */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
            <ClusterSheet
                cluster={activeCluster}
                onClose={() => setActiveCluster(null)}
                onEventPress={(id) => onMarkerPress?.(id)}
                isDark={isDark}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    centerPin: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        marginLeft: -14,
        marginTop: -34,
        zIndex: 100,
    },
    popupOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 16,
        alignItems: 'center',
        zIndex: 200,
    },
    popupCard: {
        width: 240,
        backgroundColor: '#1e1e2e',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },
    popupClose: {
        position: 'absolute',
        top: 6,
        right: 8,
        zIndex: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    popupCloseText: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 16,
    },
    popupImage: {
        width: '100%',
        height: 80,
    },
    popupImageFallback: {
        backgroundColor: '#7c3aed',
    },
    popupBody: {
        padding: 10,
    },
    popupTitle: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 3,
    },
    popupSub: {
        color: '#aaa',
        fontSize: 11,
        marginBottom: 2,
    },
    popupFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 8,
    },
    popupBtn: {
        backgroundColor: '#b32053',
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
    popupBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
});
