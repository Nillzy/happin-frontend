import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Text } from 'react-native';
import ClusterSheet from './ClusterSheet';
import { groupMarkers } from './clustering';
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_STYLE_DARK, MAP_STYLE_LIGHT, MapMarker, MapViewProps, MarkerCluster } from './types';

let MapLibre: any = null;
if (Platform.OS !== 'web') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    MapLibre = require('@maplibre/maplibre-react-native');
}

const POPUP_ZOOM_THRESHOLD = 12.5;
const POPUP_FLY_ZOOM = 14;

export function PinIcon() {
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

function formatDate(iso: string): string {
    const d = new Date(iso);
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]} · ${hh}:${mm}`;
}

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

export default function NativeMapView({
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
    const apiKey = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';
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

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    centerPin: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        marginLeft: -14,
        marginTop: -34,
        zIndex: 100,
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
    popupImage: {
        width: '100%',
        height: 80,
    },
    popupImageFallback: {
        backgroundColor: '#7c3aed',
    },
    popupBody: { padding: 10 },
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