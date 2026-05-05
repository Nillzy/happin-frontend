---
title: MapScreen - Simple Implementation
created: 2026-05-05
status: implemented
---

# MapScreen - Einfache Kartenansicht

## Überblick

Der MapScreen zeigt eine einfache, interaktive Karte mit MapTiler SDK. Die Implementierung ist bewusst minimal gehalten und bietet nur Basis-Funktionen wie Zoom und Pan.

**Keine Event-Marker, keine Interaktionen, keine Bottom Sheets** — nur die Karte selbst.

## Features

✅ **Zoom**: +/- Buttons in der Karte
✅ **Pan**: Karte mit Maus/Touch verschieben
✅ **Light/Dark Mode**: Automatische Style-Anpassung
✅ **Fixierte Navbar**: Immer sichtbar oben
✅ **Responsive Layout**: Fullscreen-Karte

## Architektur

### Komponenten-Hierarchie

```
MapScreen
└── ScreenWithNav
    └── View (fullScreen)
        ├── View (navbarContainer)
        │   └── Navbar
        └── View (mapContainer)
            └── MapView
```

### Dateien

**Screen:**
- [`src/screens/MapScreen.tsx`](../src/screens/MapScreen.tsx) — MapScreen Component (60 Zeilen)

**Map Component:**
- [`src/components/map/MapView.tsx`](../src/components/map/MapView.tsx) — MapView Component (196 Zeilen)

**Konfiguration:**
- `.env.local` — MapTiler API Key (`EXPO_PUBLIC_MAPTILER_API_KEY`)

## MapView Component

### Props

```typescript
export interface MapViewProps {
    center?: [number, number]; // [lng, lat]
    zoom?: number;
}
```

### Standardwerte

```typescript
center: [13.4050, 52.5200] // Berlin
zoom: 12
```

### States

- `isLoading: boolean` — Wird die Karte gerade geladen?
- `error: string | null` — Fehlermeldung, falls die Karte nicht geladen werden kann

### MapTiler SDK

**Dynamic Import** (nur Web):
```typescript
let MapTilerSDK: any = null;
if (Platform.OS === 'web') {
    MapTilerSDK = require('@maptiler/sdk');
}
```

**Map-Initialisierung**:
```typescript
MapTilerSDK.config.apiKey = apiKey;

const map = new MapTilerSDK.Map({
    container: mapContainerRef.current,
    style: isDark
        ? MapTilerSDK.MapStyle.DATAVIZ.DARK
        : MapTilerSDK.MapStyle.STREETS,
    center: center,
    zoom: zoom,
});
```

**Events**:
- `map.on('load', ...)` — Karte erfolgreich geladen
- `map.on('error', ...)` — Fehler beim Laden

### Plattform-Unterstützung

**Web**:
- MapTiler SDK wird verwendet
- Karte ist voll funktionsfähig

**Mobile** (iOS/Android):
- Placeholder-Ansicht: "📱 Mobile Karte kommt bald"
- Hinweis: "Nutze die Web-Version"

## MapScreen Component

Der MapScreen ist extrem simpel und hat keine eigene State-Logic:

```typescript
export default function MapScreen() {
    return (
        <ScreenWithNav>
            <View style={styles.fullScreen}>
                {/* Navbar (fixiert oben) */}
                <View style={styles.navbarContainer}>
                    <Navbar showCta={false} />
                </View>

                {/* Map (füllt ganzen Screen) */}
                <View style={styles.mapContainer}>
                    <MapView
                        center={[13.4050, 52.5200]} // Berlin
                        zoom={12}
                    />
                </View>
            </View>
        </ScreenWithNav>
    );
}
```

### Styling

**Absolute Positioning** verhindert Scroll-Probleme:

```typescript
const styles = StyleSheet.create({
    fullScreen: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        overflow: 'hidden',
    },
    navbarContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        zIndex: 10,
    },
    mapContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1,
    },
});
```

## Setup

### 1. MapTiler API Key

**Registrierung**:
1. Gehe zu [maptiler.com](https://maptiler.com/)
2. Erstelle einen kostenlosen Account
3. Hole den API Key aus dem Dashboard

**Konfiguration**:
```bash
# .env.local
EXPO_PUBLIC_MAPTILER_API_KEY=your_key_here
```

⚠️ **Wichtig**: Nach dem Hinzufügen von `.env.local` muss der Expo Dev Server neu gestartet werden!

### 2. Installation

MapTiler SDK ist bereits installiert:
```json
{
  "dependencies": {
    "@maptiler/sdk": "^4.0.1"
  }
}
```

### 3. Dev Server starten

```bash
npm start
```

Öffne http://localhost:8081/map im Browser.

## Error Handling

### Fehlermeldungen

**MapTiler API Key fehlt**:
```
⚠️ MapTiler API Key fehlt
Füge EXPO_PUBLIC_MAPTILER_API_KEY zu .env.local hinzu
```

**Nur Web unterstützt**:
```
⚠️ Nur Web wird aktuell unterstützt
```

**MapTiler SDK nicht geladen**:
```
⚠️ MapTiler SDK nicht geladen
```

**Karte konnte nicht geladen werden**:
```
⚠️ Karte konnte nicht geladen werden
```

## Theme-Integration

Die Karte passt sich automatisch an den Theme-Modus an:

**Light Mode (Happin Light)**:
- MapTiler Style: `MapTilerSDK.MapStyle.STREETS`

**Dark Mode (Neon Horizon)**:
- MapTiler Style: `MapTilerSDK.MapStyle.DATAVIZ.DARK`

Der Theme-Wechsel wird via `useTheme()` Hook erkannt:
```typescript
const { colors, isDark } = useTheme();
```

## Bottom Navigation Integration

Der MapScreen ist in die Bottom Navigation eingebunden:

**Tab**: "Karte"
**Icon**: `map-outline` / `map` (Ionicons)
**Route**: `/map`

Siehe [15-bottom-navigation.md](./15-bottom-navigation.md) für Details.

## Routing

**Route**: `/map`

**File**: `app/map.tsx`

```typescript
import MapScreen from '@/src/screens/MapScreen';

export default function MapRoute() {
    return <MapScreen />;
}
```

## Bekannte Einschränkungen

1. **Mobile nicht unterstützt**
   - Aktuell nur Web-Version funktionsfähig
   - Mobile zeigt Placeholder
   - TODO: react-native-maps oder MapLibre für Mobile

2. **Keine Event-Marker**
   - Bewusste Entscheidung für Phase 1
   - Backend liefert noch keine Latitude/Longitude-Daten
   - TODO: Marker-Layer hinzufügen, wenn Backend lat/lng bereitstellt

3. **Keine Interaktionen**
   - Keine Event-Clicks
   - Keine Bottom Sheets
   - Keine Cluster-Logik
   - TODO: Interaktive Marker-Features in Phase 2

## Zukünftige Erweiterungen

### Phase 2: Event-Marker

Wenn das Backend Latitude/Longitude für Events bereitstellt:

1. **Event-Marker auf Karte anzeigen**
   - Marker mit Event-Thumbnail
   - Cluster bei vielen Events
   - Click → Event-Detail

2. **MapEventCard Component**
   - Bottom Sheet mit Event-Preview
   - Swipe zum Schließen
   - "Details ansehen" Button

3. **Location-Suche**
   - Adresseingabe → Karte zentrieren
   - "Events in meiner Nähe" Button

### Phase 3: Mobile Support

1. **react-native-maps** für iOS/Android
2. Platform-spezifische Styling
3. Geolocation-Unterstützung

## Testing

### Browser (Web)

1. Starte Dev Server: `npm start`
2. Öffne http://localhost:8081/map
3. Teste:
   - ✅ Karte lädt in ~2 Sekunden
   - ✅ Zoom +/- funktioniert
   - ✅ Pan (Karte verschieben) funktioniert
   - ✅ Theme-Wechsel (Light/Dark)
   - ✅ Navbar ist fixiert oben
   - ✅ Kein Scroll aus der Anwendung hinaus

### Mobile (Expo Go)

1. Starte Dev Server: `npm start`
2. Scanne QR-Code mit Expo Go App
3. Navigiere zu "Karte" Tab
4. Erwarte: Placeholder "📱 Mobile Karte kommt bald"

## Änderungshistorie

- **2026-05-05**: Simplification - Alle komplexen Features entfernt
  - Gelöscht: MapBottomSheet, MapEventCard, map-fixes.css, formatDate, mockCoordinates, categoryColors
  - MapView auf 196 Zeilen reduziert (vorher: ~400 Zeilen)
  - MapScreen auf 60 Zeilen reduziert (vorher: ~200 Zeilen)
  - Keine Event-Marker mehr (bewusste Entscheidung)
  - Fokus auf Basis-Funktionalität: Zoom, Pan, Light/Dark Mode

- **2026-05-04**: Initial implementiert
  - MapTiler SDK Integration
  - Event-Marker mit Mock-Koordinaten
  - MapBottomSheet für Event-Preview
  - Cluster-Logic für viele Events
