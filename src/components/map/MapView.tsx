import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import ClusterSheet from './ClusterSheet';
import { groupMarkers } from './clustering';
import NativeMapView from './NativeMapView';
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_STYLE_DARK, MAP_STYLE_LIGHT, MapMarker, MapViewProps, MarkerCluster, MarkerOrCluster } from './types';

export type { MapMarker, MarkerCluster, MarkerOrCluster };
export { groupMarkers };

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
    const apiKey = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';
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

    React.useEffect(() => {
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

    React.useEffect(() => {
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
    container: { flex: 1 },
});