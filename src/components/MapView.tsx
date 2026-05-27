import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

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
}: MapViewProps) {
    const apiKey = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';
    const cameraRef = useRef<any>(null);
    const onMapMovedRef = useRef(onMapMoved);
    onMapMovedRef.current = onMapMoved;
    const isProgrammaticMoveRef = useRef(false);
    const [currentZoom, setCurrentZoom] = useState<number>(zoom);

    const isDraggable = !!onMapMoved;
    const initialCenterRef = useRef({ lat: centerLat, lng: centerLng, zoom });

    const styleUrl = styleUrlProp ?? `${isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}?key=${apiKey}`;

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
                    if (!isDraggable) return;
                    if (!ev?.userInteraction) return;
                    const c = ev.center;
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
                {markers.map((m) => (
                    <Marker
                        key={`pin-${m.eventId}`}
                        id={`pin-${m.eventId}`}
                        lngLat={[m.lng, m.lat]}
                        anchor="bottom"
                        onPress={() => {
                            if (!showPopups) {
                                onMarkerPress?.(m.eventId);
                                return;
                            }
                            isProgrammaticMoveRef.current = true;
                            cameraRef.current?.flyTo({
                                centerCoordinate: [m.lng, m.lat],
                                zoomLevel: POPUP_FLY_ZOOM,
                                animationDuration: 600,
                            });
                        }}
                    >
                        <PinIcon />
                    </Marker>
                ))}
                {popupsVisible
                    ? markers.map((m) => (
                          <Marker
                              key={`popup-${m.eventId}`}
                              id={`popup-${m.eventId}`}
                              lngLat={[m.lng, m.lat]}
                              anchor="bottom"
                              offset={[0, -46]}
                              onPress={() => onMarkerPress?.(m.eventId)}
                          >
                              <EventPopupCard marker={m} />
                          </Marker>
                      ))
                    : null}
            </Map>

            {isDraggable && (
                <View pointerEvents="none" style={styles.centerPin}>
                    <PinIcon />
                </View>
            )}
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
}: MapViewProps) {
    const apiKey = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null);
    const centerPinRef = useRef<HTMLDivElement | null>(null);
    const markersRef = useRef(markers);
    markersRef.current = markers;
    const onMapMovedRef = useRef(onMapMoved);
    onMapMovedRef.current = onMapMoved;
    // After a user drag we skip the next external setCenter to avoid fighting the map
    const skipNextSetCenterRef = useRef(false);
    // Tracks programmatic setCenter calls so moveend doesn't fire onMapMoved
    const isProgrammaticMoveRef = useRef(false);

    // For draggable maps (onMapMoved set), freeze the initial center so that
    // parent state updates from onMapMoved don't cause the WebView to reload.
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

        async function init() {
            const sdk = await import('@maptiler/sdk');
            sdk.config.apiKey = apiKey;
            sdk.config.primaryLanguage = sdk.Language.GERMAN;

            // Inject MapTiler CSS if not already present
            if (!document.getElementById('maptiler-sdk-css')) {
                const link = document.createElement('link');
                link.id = 'maptiler-sdk-css';
                link.rel = 'stylesheet';
                link.href = 'https://cdn.maptiler.com/maptiler-sdk-js/v4.0.1/maptiler-sdk.css';
                document.head.appendChild(link);
            }

            if (!mapContainerRef.current || mapInstanceRef.current) return;

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

            // MapTiler-Logo ausblenden
            const logoEl = mapContainerRef.current.querySelector('.maplibregl-ctrl-logo, .maptiler-ctrl-logo, [class*="logo"]');
            if (logoEl) (logoEl as HTMLElement).style.display = 'none';

            // Steuerelemente im Dark Mode dunkel färben
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
                // Logo auch im Light Mode ausblenden
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
                // Force resize so the map fills its container correctly when
                // mounted inside nested layouts (ScrollView, glassCard, etc.)
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

                // Zentrierte Nadel für Draggable-Modus
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

            let popupMarkers: any[] = [];

            function addPopupMarkers(sdkModule: any) {
                popupMarkers.forEach(pm => pm.remove());
                popupMarkers = [];

                markersRef.current.forEach((m) => {
                    const el = createPopupEl(m);
                    const pm = new sdkModule.Marker({ element: el, anchor: 'bottom', offset: [0, -46] })
                        .setLngLat([m.lng, m.lat])
                        .addTo(map);
                    const pmEl = pm.getElement();
                    if (pmEl) pmEl.style.overflow = 'visible';
                    popupMarkers.push(pm);
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

                popupMarkers.forEach((pm) => {
                    const el = pm.getElement();
                    if (el) el.style.display = popupsVisible ? '' : 'none';
                });
            }

            function addMarkers(sdkModule: any) {
                markerInstances.forEach(mi => mi.remove());
                markerInstances = [];

                markersRef.current.forEach((m) => {
                    const el = document.createElement('div');
                    el.style.cssText =
                        'width:28px;height:34px;cursor:pointer;line-height:0;';
                    el.innerHTML = '<svg width="28" height="34" viewBox="0 0 28 34" fill="none"><path d="M14 1C7.9 1 3 5.9 3 12c0 7.4 11 20 11 20s11-12.6 11-20c0-6.1-4.9-11-11-11z" fill="#b32053" stroke="#fff" stroke-width="2"/><circle cx="14" cy="12" r="4.5" fill="#fff"/></svg>';
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Auf Pin zoomen
                        map.flyTo({ center: [m.lng, m.lat], zoom: 15, duration: 800 });
                        // Nach Zoom-Animation Popup anzeigen
                        const idx = markersRef.current.indexOf(m);
                        const pm = popupMarkers[idx];
                        if (pm) {
                            const pmEl = pm.getElement();
                            if (pmEl) pmEl.style.display = '';
                        }
                    });

                    const mi = new sdkModule.Marker({ element: el, anchor: 'bottom' })
                        .setLngLat([m.lng, m.lat])
                        .addTo(map);
                    const markerEl = mi.getElement();
                    if (markerEl) markerEl.style.overflow = 'visible';
                    markerInstances.push(mi);
                });
            }

            map.on('zoom', () => updatePopupVisibility());

            interval = setInterval(() => {
                if (markersRef.current.length > markerInstances.length && map.loaded()) {
                    import('@maptiler/sdk').then(s => {
                        addMarkers(s);
                        addPopupMarkers(s);
                    });
                }
            }, 1000);

            map.on('click', () => {
                if (map.getZoom() < 14) {
                    popupMarkers.forEach((pm) => {
                        const pmEl = pm.getElement();
                        if (pmEl) pmEl.style.display = 'none';
                    });
                }
            });
        }

        init();

        return () => {
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

    // Karte auf neue Koordinaten/Zoom zentrieren wenn sich Props ändern.
    // Bei draggable Karten (onMapMoved) nicht eingreifen — der Nutzer steuert die Position.
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
            />
        );
    }

    // web container
    // Reference unused web-only refs to satisfy linter on native bundles is not needed here,
    // since this branch only runs on web.
    void effectiveCenterLat; void effectiveCenterLng; void skipNextSetCenterRef;

    return (
        <View style={styles.container}>
            {/* @ts-ignore */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
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
