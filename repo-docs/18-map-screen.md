# Kartenansicht — MapTiler Integration (Tab „Karte")

## Übersicht

Der `MapScreen` (`src/screens/MapScreen.tsx`) zeigt öffentliche Events als interaktive Pins auf einer Karte. Die Karte wird mit **MapTiler** und **MapLibre GL JS** gerendert und läuft plattformübergreifend auf Web, iOS und Android.

Route: `/map` → `app/map.tsx` → `src/screens/MapScreen.tsx`

---

## Architektur

### Plattformstrategie

| Plattform | Rendering |
|---|---|
| **Web** | `@maptiler/sdk` wird via dynamischem `import()` direkt im DOM initialisiert (`useEffect` + `ref` auf ein `<div>`) |
| **iOS / Android** | `react-native-webview` mit einer in-memory HTML-Seite (`source={{ html }}`) — MapLibre GL JS wird via CDN geladen |

Beide Wege nutzen dieselbe Marker-Logik und denselben API-Key.

### Komponente `MapView` (`src/components/MapView.tsx`)

```typescript
interface MapViewProps {
    markers: MapMarker[];           // Event-Pins
    onMarkerPress?: (eventId: string) => void;
    centerLat?: number;             // Default: 52.52 (Berlin)
    centerLng?: number;             // Default: 13.405 (Berlin)
    zoom?: number;                  // Default: 11
    isDark?: boolean;               // Wechselt zwischen Custom MapTiler Styles
}

interface MapMarker {
    lat: number;
    lng: number;
    title: string;
    eventId: string;
}
```

Marker werden als pink-rote Teardrop-Pins dargestellt (Happin-Primärfarbe `#b32053`). Klick auf einen Pin öffnet ein Popup mit dem Event-Titel und löst `onMarkerPress(eventId)` aus.

Auf Native wird `postMessage` genutzt um Klick-Events aus dem WebView-Kontext zurück in React Native zu übergeben.

### Custom Map Styles

Je nach `isDark`-Prop wird ein anderer MapTiler-Style geladen:

| Theme | Style-URL |
|---|---|
| Light | `https://api.maptiler.com/maps/019df984-95c4-700c-903c-d2b6e4f609ac/style.json` |
| Dark | `https://api.maptiler.com/maps/019df980-9d7f-7211-a4d0-6ed2331bf2c5/style.json` |

Beide Styles sind eigene MapTiler-Custom-Maps, die im MapTiler Cloud Studio angelegt wurden.

---

## Geocoding-Strategie

### Problem
Die `location`-Tabelle und die API-Response hatten keine Koordinaten — nur Textadressen (Straße, PLZ, Stadt, Land).

### Lösung: Geocoding beim Event-Erstellen (Backend)

Beim Anlegen eines Events führt `event_service.create_event()` nach dem Location-Insert automatisch ein Geocoding durch:

1. Location wird in die `location`-Tabelle geschrieben
2. `geocoding_service.geocode_address()` ruft die **MapTiler Forward Geocoding API** auf
3. Die zurückgegebenen Koordinaten (`latitude`, `longitude`) werden sofort in die `location`-Zeile zurückgeschrieben

```python
# backend/app/services/geocoding_service.py
def geocode_address(street, house_number, postal_code, city, country) -> tuple[float, float] | None
```

Fehler (kein Key, Timeout, keine Treffer) werden geloggt und führen nicht zum Abbruch des Event-Erstell-Vorgangs — `latitude`/`longitude` bleiben dann `NULL`.

### Datenbankschema-Erweiterung

Migration: `supabase/migrations/20260505120000_add_coordinates_to_location.sql`

```sql
ALTER TABLE "public"."location"
    ADD COLUMN IF NOT EXISTS "latitude"  double precision,
    ADD COLUMN IF NOT EXISTS "longitude" double precision;
```

---

## Betroffene Dateien

### Frontend

| Datei | Änderung |
|---|---|
| `src/components/MapView.tsx` | Neu — plattformübergreifende Kartenkomponente |
| `src/screens/MapScreen.tsx` | Ersetzt Placeholder — lädt Events, baut Marker-Array, rendert `MapView` |
| `src/services/geocoding.ts` | Neu — `geocodeCity(city)` für Stadtnamen → Koordinaten (nur Europa) |
| `src/types/events.ts` | `EventLocation` um `latitude?` und `longitude?` erweitert |
| `package.json` | `react-native-webview@13.15.0` und `@maptiler/sdk@^4.0.1` hinzugefügt |
| `.env` | `EXPO_PUBLIC_MAPTILER_KEY` hinzugefügt |

### Backend

| Datei | Änderung |
|---|---|
| `app/services/geocoding_service.py` | Neu — MapTiler Geocoding via `urllib` |
| `app/services/event_service.py` | `create_event()` ruft Geocoding nach Location-Insert auf |
| `app/schemas/events.py` | `LocationResponse` um `latitude` und `longitude` erweitert |
| `app/core/config.py` | `MAPTILER_KEY: str | None = None` als optionale Setting |
| `supabase/migrations/20260505120000_add_coordinates_to_location.sql` | Neu — `latitude`/`longitude`-Spalten zur `location`-Tabelle |
| `.env` | `MAPTILER_KEY` hinzugefügt |

---

## Umgebungsvariablen

| Variable | Wo | Beschreibung |
|---|---|---|
| `EXPO_PUBLIC_MAPTILER_KEY` | Frontend `.env` | API-Key für Kartenrendering und City-Geocoding |
| `MAPTILER_KEY` | Backend `.env` | API-Key für Adress-Geocoding beim Event-Erstellen |

---

## Stadtbasierte Zentrierung

Beim Öffnen des Karten-Tabs wird die gespeicherte Heimatstadt des Nutzers aus `AsyncStorage` gelesen und via `geocodeCity()` in Koordinaten umgewandelt. Die Karte zentriert sich dann auf diese Stadt.

- Implementierung: `hooks/useUserCity.ts` + `src/services/geocoding.ts`
- Einstellung: AccountScreen → Sektion „Einstellungen" → „Mein Standort"
- Europa-Einschränkung via `country`-Parameter (alle europäischen ISO-2-Codes), nicht via `bbox` (wird von der MapTiler API nicht zuverlässig erzwungen)
- Fallback bei leerem/ungültigem Wert: **Berlin** (lat: 52.52, lng: 13.405)

---

<<<<<<< HEAD
## City Autocomplete (`src/services/geocoding.ts`)

### `searchCities(query)`

Sucht Städte für die Autocomplete-Eingabe im AccountScreen:

- Fragt `https://api.maptiler.com/geocoding/{query}.json` ohne `types`-Filter ab (nötig weil MapTiler verschiedene Typen für Städte verwendet: `region` für Berlin, `county` für München, `municipal_district` für Karlsruhe etc.)
- `limit=10`, danach client-seitiger Filter via `EXCLUDE_TYPES`
- Slice auf maximal 6 Ergebnisse

**`EXCLUDE_TYPES`** — gefilterte Typen:
```
locality, neighbourhood, place, poi, address, postal_code, major_landform, continental_marine
```
Dies entfernt Stadtteile, Viertel, POIs und geografische Features — es bleiben administrative Einheiten (Städte, Gemeinden, Regionen).

### `CitySuggestion`

```typescript
interface CitySuggestion {
    name: string;           // z.B. "Karlsruhe"
    region: string | null;  // z.B. "Baden-Württemberg"
    regionCode: string | null; // z.B. "BW"
    country: string;        // z.B. "Deutschland"
    displayLabel: string;   // z.B. "Karlsruhe, BW, Deutschland"
    lat: number;
    lng: number;
}
```

`regionCode` wird aus der `REGION_CODES`-Map aufgelöst — enthält alle deutschen Bundesländer, österreichischen Bundesländer und Schweizer Kantone.

---

## Bekannte Einschränkungen / TODOs

- Bestehende Events haben noch keine Koordinaten — erst neu erstellte Events werden geocodet. Für Altdaten müsste ein Migrations-Skript die Geocoding-API für alle existierenden Locations aufrufen.
- Cluster-Ansicht bei vielen Pins noch nicht implementiert.
- Karten-Filter (Kategorie, Datum, Umkreis) noch nicht implementiert.
