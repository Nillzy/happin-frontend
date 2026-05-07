import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

let WebView: any = null;
if (Platform.OS !== 'web') {
    WebView = require('react-native-webview').WebView;
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
}

const DEFAULT_CENTER = { lat: 52.52, lng: 13.405 };
const DEFAULT_ZOOM = 11;

const MAP_STYLE_LIGHT = 'https://api.maptiler.com/maps/019dfc91-be68-7eb0-a241-e7a2d1d21b6a/style.json';
const MAP_STYLE_DARK  = 'https://api.maptiler.com/maps/019dfca2-7a0c-7ac9-bae7-dfa64252c3f0/style.json';

function buildMapHtml(
    apiKey: string,
    markers: MapMarker[],
    centerLat: number,
    centerLng: number,
    zoom: number,
    isDark: boolean,
    styleUrlOverride?: string,
): string {
    const tileUrl = styleUrlOverride
        ? styleUrlOverride.replace('/style.json', '/tiles/256/{z}/{x}/{y}.png')
        : `https://api.maptiler.com/maps/${isDark ? '019dfca2-7a0c-7ac9-bae7-dfa64252c3f0' : '019dfc91-be68-7eb0-a241-e7a2d1d21b6a'}/tiles/256/{z}/{x}/{y}.png?key=${apiKey}`;

    const markersJson = JSON.stringify(markers);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #1a1a2e; }
    #map { width: 100%; height: 100%; position: relative; overflow: hidden; }
    .pin-wrap {
      position: absolute;
      transform: translate(-50%, -100%);
      cursor: pointer;
      z-index: 100;
    }
    .pin {
      width: 28px; height: 34px;
    }
    .pin svg {
      width: 28px; height: 34px;
    }
    .event-popup {
      position: absolute;
      width: 220px;
      background: #1e1e2e;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.7);
      z-index: 200;
      display: none;
    }
    .event-popup.visible { display: block; }
    .popup-img {
      width: 100%; height: 80px;
      background: linear-gradient(135deg, #b32053, #7c3aed);
      background-size: cover; background-position: center;
    }
    .popup-body { padding: 10px 12px 12px; }
    .popup-close {
      position: absolute; top: 6px; right: 8px;
      color: #fff; font-size: 16px; cursor: pointer;
      font-family: sans-serif; z-index: 300;
      background: rgba(0,0,0,0.4); border-radius: 50%;
      width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
    }
    .popup-title { font-family: sans-serif; font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .popup-sub   { font-family: sans-serif; font-size: 11px; color: #aaa; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .popup-footer { display: flex; align-items: center; margin-top: 10px; }
    .popup-btn { font-family: sans-serif; font-size: 12px; font-weight: 700; color: #fff; background: #b32053; border: none; border-radius: 999px; padding: 6px 16px; cursor: pointer; margin-left: auto; }
  </style>
</head>
<body>
  <div id="map">
    <div class="event-popup" id="popup">
      <div class="popup-close" id="popup-close">✕</div>
      <div class="popup-img" id="popup-img"></div>
      <div class="popup-body">
        <div class="popup-title" id="popup-title"></div>
        <div class="popup-sub"   id="popup-loc"></div>
        <div class="popup-sub"   id="popup-date"></div>
        <div class="popup-footer">
          <button class="popup-btn" id="popup-btn">Ansehen</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    var API_KEY = '${apiKey}';
    var isDark  = ${isDark};
    var mapId   = isDark
      ? '019dfca2-7a0c-7ac9-bae7-dfa64252c3f0'
      : '019dfc91-be68-7eb0-a241-e7a2d1d21b6a';

    var W = window.innerWidth;
    var H = window.innerHeight;

    // ── tile grid ──────────────────────────────────────────────────────────────
    var zoom  = ${zoom};
    var cLat  = ${centerLat};
    var cLng  = ${centerLng};

    function latLngToTile(lat, lng, z) {
      var n = Math.pow(2, z);
      var tx = Math.floor((lng + 180) / 360 * n);
      var ty = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
      return { tx: tx, ty: ty };
    }
    function tileToPixel(tx, ty, z, cTx, cTy, cFracX, cFracY) {
      return {
        x: (tx - cTx + cFracX) * 256 + W / 2,
        y: (ty - cTy + cFracY) * 256 + H / 2,
      };
    }
    function latLngToScreen(lat, lng) {
      var n  = Math.pow(2, zoom);
      var fx = (lng + 180) / 360 * n;
      var fy = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n;
      return {
        x: (fx - cFracX) * 256 + W / 2,
        y: (fy - cFracY) * 256 + H / 2,
      };
    }

    var cTile  = latLngToTile(cLat, cLng, zoom);
    var cN     = Math.pow(2, zoom);
    var cFracX = (cLng + 180) / 360 * cN;
    var cFracY = (1 - Math.log(Math.tan(cLat * Math.PI / 180) + 1 / Math.cos(cLat * Math.PI / 180)) / Math.PI) / 2 * cN;

    var mapEl = document.getElementById('map');
    var tilesPerRow = Math.ceil(W / 256) + 2;
    var tilesPerCol = Math.ceil(H / 256) + 2;

    for (var dx = -tilesPerRow; dx <= tilesPerRow; dx++) {
      for (var dy = -tilesPerCol; dy <= tilesPerCol; dy++) {
        var tx = cTile.tx + dx;
        var ty = cTile.ty + dy;
        if (tx < 0 || ty < 0 || tx >= cN || ty >= cN) continue;
        var px = tileToPixel(tx, ty, zoom, Math.floor(cFracX), Math.floor(cFracY),
                             Math.floor(cFracX) - cFracX + 0.5, Math.floor(cFracY) - cFracY + 0.5);
        var img = document.createElement('img');
        img.src = 'https://api.maptiler.com/maps/' + mapId + '/tiles/256/' + zoom + '/' + tx + '/' + ty + '.png?key=' + API_KEY;
        img.style.cssText = 'position:absolute;width:256px;height:256px;left:' + (px.x - 128) + 'px;top:' + (px.y - 128) + 'px;';
        mapEl.insertBefore(img, mapEl.firstChild);
      }
    }

    // ── pins ───────────────────────────────────────────────────────────────────
    var markersData = ${markersJson};
    var currentMarker = null;

    var popup     = document.getElementById('popup');
    var popupImg  = document.getElementById('popup-img');
    var popupTitle= document.getElementById('popup-title');
    var popupLoc  = document.getElementById('popup-loc');
    var popupDate = document.getElementById('popup-date');
    var popupBtn  = document.getElementById('popup-btn');

    function fmt(iso) {
      var d = new Date(iso);
      var days   = ['So','Mo','Di','Mi','Do','Fr','Sa'];
      var months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
      return days[d.getDay()] + ', ' + d.getDate() + '. ' + months[d.getMonth()] +
             ' · ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    }

    markersData.forEach(function(m) {
      var sc = latLngToScreen(m.lat, m.lng);
      var wrap = document.createElement('div');
      wrap.className = 'pin-wrap';
      wrap.style.left = sc.x + 'px';
      wrap.style.top  = sc.y + 'px';
      var pin = document.createElement('div');
      pin.className = 'pin';
      pin.innerHTML = '<svg width="28" height="34" viewBox="0 0 28 34" fill="none"><path d="M14 1C7.9 1 3 5.9 3 12c0 7.4 11 20 11 20s11-12.6 11-20c0-6.1-4.9-11-11-11z" fill="#b32053" stroke="#fff" stroke-width="2"/><circle cx="14" cy="12" r="4.5" fill="#fff"/></svg>';
      wrap.appendChild(pin);
      mapEl.appendChild(wrap);

      wrap.addEventListener('click', function(e) {
        e.stopPropagation();
        currentMarker = m;

        popupTitle.textContent = m.title;
        popupLoc.textContent   = m.location  ? '📍 ' + m.location  : '';
        popupDate.textContent  = m.startsAt  ? '🗓 ' + fmt(m.startsAt) : '';
        popupBtn.textContent   = m.isFree === false ? 'Tickets' : 'Ansehen';
        popupImg.style.backgroundImage = m.imageUrl
          ? 'url(' + m.imageUrl + ')'
          : 'linear-gradient(135deg, #b32053, #7c3aed)';

        var px = sc.x - 110;
        var py = sc.y - 240;
        if (px < 8) px = 8;
        if (px + 220 > W - 8) px = W - 228;
        if (py < 8) py = 8;
        popup.style.left = px + 'px';
        popup.style.top  = py + 'px';
        popup.classList.add('visible');
      });
    });

    document.getElementById('popup-close').addEventListener('click', function(e) {
      e.stopPropagation();
      popup.classList.remove('visible');
    });

    popupBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (currentMarker) {
        var msg = JSON.stringify({ type: 'navigate', eventId: currentMarker.eventId });
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
        else window.parent.postMessage(msg, '*');
      }
    });

    mapEl.addEventListener('click', function() {
      popup.classList.remove('visible');
    });

  </script>
</body>
</html>`;
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
}: MapViewProps) {
    const apiKey = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef(markers);
    markersRef.current = markers;

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
                center: [centerLng, centerLat],
                zoom,
                maptilerLogo: false,
                interactive,
                ...(interactive ? {} : {
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
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiKey, styleUrl, centerLat, centerLng, zoom]);

    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                {/* @ts-ignore */}
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
            </View>
        );
    }

    const html = buildMapHtml(apiKey, markers, centerLat, centerLng, zoom, isDark, styleUrlProp);

    return (
        <View style={styles.container}>
            <WebView
                source={{ html }}
                style={styles.webview}
                onMessage={(e: any) => {
                    try {
                        const msg = JSON.parse(e.nativeEvent.data);
                        if (msg.type === 'navigate') onMarkerPress?.(msg.eventId);
                    } catch { /* ignore */ }
                }}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    webview: {
        flex: 1,
    },
});
