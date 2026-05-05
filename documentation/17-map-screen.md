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

- Implementierung: `hooks/use-user-city.ts` + `src/services/geocoding.ts`
- Einstellung: AccountScreen → Sektion „Einstellungen" → „Mein Standort"
- Bounding Box begrenzt Geocoding auf Europa: `bbox=-31.266,27.636,69.033,81.008`
- Fallback bei leerem/ungültigem Wert: **Berlin** (lat: 52.52, lng: 13.405)

---

## Bekannte Einschränkungen / TODOs

- Bestehende Events haben noch keine Koordinaten — erst neu erstellte Events werden geocodet. Für Altdaten müsste ein Migrations-Skript die Geocoding-API für alle existierenden Locations aufrufen.
- Cluster-Ansicht bei vielen Pins noch nicht implementiert.
- Karten-Filter (Kategorie, Datum, Umkreis) noch nicht implementiert.
