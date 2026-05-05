import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export interface MapMarker {
    lat: number;
    lng: number;
    title: string;
    eventId: string;
}

interface MapViewProps {
    markers: MapMarker[];
    onMarkerPress?: (eventId: string) => void;
    centerLat?: number;
    centerLng?: number;
    zoom?: number;
}

const DEFAULT_CENTER = { lat: 52.52, lng: 13.405 };
const DEFAULT_ZOOM = 11;

function buildMapHtml(
    apiKey: string,
    markers: MapMarker[],
    centerLat: number,
    centerLng: number,
    zoom: number,
): string {
    const markersJson = JSON.stringify(markers);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://cdn.maptiler.com/maptiler-sdk-js/latest/maptiler-sdk.css" />
  <script src="https://cdn.maptiler.com/maptiler-sdk-js/latest/maptiler-sdk.umd.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    maptilersdk.config.apiKey = '${apiKey}';
    const map = new maptilersdk.Map({
      container: 'map',
      style: maptilersdk.MapStyle.STREETS,
      center: [${centerLng}, ${centerLat}],
      zoom: ${zoom},
    });

    const markers = ${markersJson};

    map.on('load', function () {
      markers.forEach(function (m) {
        const el = document.createElement('div');
        el.style.cssText = 'width:32px;height:32px;background:#b32053;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.4);';
        el.addEventListener('click', function () {
          window.ReactNativeWebView
            ? window.ReactNativeWebView.postMessage(m.eventId)
            : window.parent.postMessage({ type: 'markerPress', eventId: m.eventId }, '*');
        });
        new maptilersdk.Marker({ element: el })
          .setLngLat([m.lng, m.lat])
          .setPopup(new maptilersdk.Popup({ offset: 25 }).setText(m.title))
          .addTo(map);
      });
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
}: MapViewProps) {
    const apiKey = process.env.EXPO_PUBLIC_MAPTILER_KEY ?? '';
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null);

    if (Platform.OS === 'web') {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
            let map: any;
            async function init() {
                const sdk = await import('@maptiler/sdk');
                sdk.config.apiKey = apiKey;

                if (!mapContainerRef.current || mapInstanceRef.current) return;

                map = new sdk.Map({
                    container: mapContainerRef.current,
                    style: sdk.MapStyle.STREETS,
                    center: [centerLng, centerLat],
                    zoom,
                });

                mapInstanceRef.current = map;

                map.on('load', () => {
                    markers.forEach((m) => {
                        const el = document.createElement('div');
                        el.style.cssText =
                            'width:32px;height:32px;background:#b32053;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.4);';
                        el.addEventListener('click', () => onMarkerPress?.(m.eventId));

                        new sdk.Marker({ element: el })
                            .setLngLat([m.lng, m.lat])
                            .setPopup(new sdk.Popup({ offset: 25 }).setText(m.title))
                            .addTo(map);
                    });
                });
            }
            init();
            return () => {
                map?.remove();
                mapInstanceRef.current = null;
            };
        // markers und onMarkerPress absichtlich nicht in deps — Karte wird einmalig initialisiert
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [apiKey, centerLat, centerLng, zoom]);

        return (
            <View style={styles.container}>
                {/* @ts-ignore — ref auf div ist auf Web gültig */}
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
            </View>
        );
    }

    const html = buildMapHtml(apiKey, markers, centerLat, centerLng, zoom);

    return (
        <View style={styles.container}>
            <WebView
                source={{ html }}
                style={styles.webview}
                onMessage={(e) => onMarkerPress?.(e.nativeEvent.data)}
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
