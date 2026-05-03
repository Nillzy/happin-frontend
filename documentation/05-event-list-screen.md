# Event-Übersichtsseite (EventListScreen)

Dieses Dokument beschreibt den EventListScreen, den API-Client und die zugehörigen Architektur-Entscheidungen, einschließlich des responsiven Grid-Layouts für Web und Infinite Scroll Pagination.

## Übersicht

Der EventListScreen zeigt alle öffentlichen Events in einem responsiven Layout mit **Infinite Scroll Pagination**. Auf Mobile und Tablet wird eine scrollbare Liste verwendet, auf Web ein mehrspaliges Grid-Layout. Nutzer können auf Events tippen/klicken, um zum EventScreen (Detail) zu navigieren.

**Requirement:** M5 (Event-View-Grundlage), M11 (Öffentliche Event-Liste < 2s Ladezeit)

## Pagination & Performance

Der Screen verwendet **Infinite Scroll** für optimale Performance und UX:

### Pagination-Strategie

- **Page Size:** 30 Events pro Request
  - Desktop (3 Spalten): 3 × 10 Zeilen
  - Ultrawide (5 Spalten): 5 × 6 Zeilen
- **Initial Load:** Erste 30 Events beim Screen-Mount
- **Lazy Loading:** Weitere Events werden automatisch nachgeladen beim Scrollen
- **Trigger:** 500px vor Ende des Contents (Web) / `onEndReached` threshold 0.5 (Mobile)

### Vorteile

✅ **Schnellere Initial Load Time:** Nur 30 Events statt alle  
✅ **Reduzierter Memory Footprint:** Weniger Daten im State  
✅ **Skalierbar:** Funktioniert mit 1000+ Events ohne Performance-Einbußen  
✅ **Bessere UX:** Keine expliziten "Load More" Buttons nötig  
✅ **Backend-Effizienz:** Kleinere API-Responses

### Implementation Details

```typescript
const EVENTS_PER_PAGE = 30;

const [page, setPage] = useState(0);
const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);

// Load more events
const loadMoreEvents = useCallback(async (isInitial = false) => {
    // Load EVENTS_PER_PAGE starting from page * EVENTS_PER_PAGE
    const data = await api.getPublicEvents(
        EVENTS_PER_PAGE,
        currentPage * EVENTS_PER_PAGE,
        token
    );
    
    // Check if last page
    if (data.events.length < EVENTS_PER_PAGE) {
        setHasMore(false);
    }
    
    // Append or replace events
    if (isInitial) {
        setEvents(data.events);
    } else {
        setEvents(prev => [...prev, ...data.events]);
    }
}, [page, loadingMore, hasMore]);
```

### Scroll Detection

**Web (ScrollView):**
```typescript
const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 500;
    
    const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >= 
        contentSize.height - paddingToBottom;
    
    if (isCloseToBottom && hasMore && !loadingMore) {
        loadMoreEvents(false);
    }
}, [hasMore, loadingMore, loadMoreEvents]);

<ScrollView onScroll={handleScroll} scrollEventThrottle={400}>
```

**Mobile (FlatList):**
```typescript
<FlatList
    onEndReached={() => loadMoreEvents(false)}
    onEndReachedThreshold={0.5}
    ListFooterComponent={renderLoadingFooter()}
/>
```

## Responsive Layout

Der Screen verwendet ein **adaptives Layout-System**, das sich an die Plattform und Bildschirmgröße anpasst:

### Mobile & Tablet (iOS/Android)
- **Layout:** Vertikale `FlatList` mit Virtualisierung
- **Breite:** Full-width Cards mit 24px Margin
- **Performance:** Optimiert für lange Listen durch Item-Recycling

### Web
- **Layout:** Flexbox Grid mit dynamischen Spalten
- **Breakpoints:**
  - `< 768px`: 1 Spalte (Mobile/Tablet Portrait)
  - `768px - 1199px`: 2 Spalten (Tablet Landscape/Small Desktop)
  - `1200px - 1919px`: 3 Spalten (Desktop)
  - `1920px - 2559px`: 4 Spalten (2K/QHD)
  - `≥ 2560px`: 5 Spalten (Ultrawide 21:9, 4K)
- **Container:** Max-width 2560px, zentriert
- **Spacing:** 24px padding, 20px horizontal gap, 16px vertical gap
- **Resize:** Reagiert dynamisch auf Browser-Resize via `Dimensions.addEventListener`

### Design System Compliance
- Grid-Padding: `24px` (aus `DESIGN.md`: `grid_margin`)
- Grid-Gap: `20px` horizontal, `16px` vertikal (aus `DESIGN.md`: `grid_gutter`)
- Card-Radius: `20px` (Large Components)
- Container Max-Width: `2560px` (Support für Ultrawide/4K)

## API-Client (`src/services/api.ts`)

Ein dünner `fetch`-Wrapper ohne externe Dependencies (kein Axios).

```typescript
import { api } from '@/src/services/api';

// Pagination support
const events = await api.getPublicEvents(limit, offset, token);
// Example: limit=30, offset=0 → first page (Events 1-30)
//          limit=30, offset=30 → second page (Events 31-60)
```

### Konfiguration

- Base-URL kommt aus `EXPO_PUBLIC_BACKEND_URL` (`.env.local`)
- Fallback: `http://localhost:8001`
- Auth-Header können über den `options`-Parameter ergänzt werden
- **Pagination:** Backend unterstützt `limit` und `offset` Parameter

### Neue Endpoints hinzufügen

1. TypeScript-Interface in `src/types/` definieren
2. Funktion in `api`-Objekt ergänzen:
   ```typescript
   export const api = {
       // ... bestehende Endpoints
       createEvent: (data: CreateEventRequest) =>
           request<EventDetailResponse>('/api/v1/events/', {
               method: 'POST',
               body: JSON.stringify(data),
           }),
   };
   ```

## TypeScript Types (`src/types/events.ts`)

Die Interfaces spiegeln die Backend-Pydantic-Schemas 1:1. Wenn sich das Backend ändert, müssen die Types hier synchron gehalten werden.

| Interface | Backend-Schema | Verwendung |
|-----------|---------------|------------|
| `EventLocation` | `LocationResponse` | Adressdaten |
| `EventListItem` | `EventListItem` | Karten in der Liste |
| `EventListResponse` | `EventListResponse` | API-Response der Listenansicht |
| `EventDetailResponse` | `EventDetailResponse` | API-Response der Detailansicht |

## Screen-Aufbau

### Dual-Layout Strategie

Der Screen verwendet unterschiedliche Rendering-Strategien je nach Plattform:

**Mobile/Native (`Platform.OS !== 'web'`):**
```typescript
<FlatList
  data={events}
  renderItem={renderCard}
  // Virtualisierung für Performance
/>
```

**Web (`Platform.OS === 'web'`):**
```typescript
<ScrollView>
  <View style={gridContainer}>
    {events.map(renderCard)}
  </View>
</ScrollView>
```

### Warum unterschiedliche Layouts?

**FlatList für Mobile:**
- ✅ Virtualisierung: Rendert nur sichtbare Items
- ✅ Optimiert für Touch-Scrolling
- ✅ Essentiell für Performance bei langen Listen (M11: < 2s)
- ❌ Weniger flexible für Multi-Column Grid

**Flexbox Grid für Web:**
- ✅ Volle Kontrolle über Responsive Breakpoints
- ✅ Dynamische Spaltenanzahl basierend auf Viewport
- ✅ Bessere alignment control (gleiche Höhe pro Zeile)
- ✅ Bei typischen Event-Listen (<100 Items) keine Performance-Einbußen
- ❌ Keine Virtualisierung (nicht nötig für Web-Use-Case)

### Grid-Berechnung (Web)

Die Card-Breite wird dynamisch berechnet basierend auf Viewport und Spaltenanzahl:

```typescript
const numColumns = getNumColumns(dimensions.width); // 1-5 Spalten
const containerWidth = Math.min(dimensions.width, CONTAINER_MAX_WIDTH); // Max 2560px
const availableWidth = containerWidth - GRID_PADDING * 2;
const cardWidth = (availableWidth - GRID_GAP_H * (numColumns - 1)) / numColumns;
```

**Beispielberechnung für 3440px Ultrawide (5 Spalten):**
```
containerWidth = min(3440, 2560) = 2560px
availableWidth = 2560 - (24 * 2) = 2512px
cardWidth = (2512 - 20 * 4) / 5 = 486.4px pro Card
```

Cards bekommen dynamische Margins:
- **Rechts:** `GRID_GAP_H` (20px), außer letzte Card in der Zeile: `0`
- **Unten:** `GRID_GAP_V` (16px) für alle

### Komponenten-Struktur

```
EventListScreen
├── Navbar (showBack, showCta=false)
├── [Web] ScrollView + Flexbox Grid
│   ├── Header: "Entdecke Events" Titel-Block
│   ├── GridContainer (flexDirection: row, flexWrap: wrap)
│   │   └── GridItem × N (dynamische Breite basierend auf numColumns)
│   │       └── EventCard
│   │           ├── Image / Gradient-Placeholder
│   │           ├── Host-Badge (wenn is_host === true)
│   │           ├── Titel, Datum (de-DE), Stadt
│   │           └── Kategorie-Chip, Teilnehmer-Count
│   └── Footer
├── [Mobile] FlatList (virtualisiert)
│   ├── Header: "Entdecke Events" Titel-Block
│   ├── EventCard × N
│   │   ├── Image / Gradient-Placeholder
│   │   ├── Titel, Datum (de-DE), Stadt
│   │   └── Kategorie-Chip, Teilnehmer-Count
│   └── Footer
├── [States] Loading: ActivityIndicator
├── [States] Error: Fehlermeldung + Retry-Button
├── [States] Empty: "Keine Events gefunden"
└── FAB (Floating Action Button): "+" zum Event erstellen
```

### Responsive Behavior

**Window Resize Listener (nur Web):**
```typescript
useEffect(() => {
    if (!isWeb) return;
    
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
        setDimensions(window);
    });
    
    return () => subscription?.remove();
}, []);
```

Bei Browser-Resize wird die Spaltenanzahl neu berechnet und die Cards passen sich automatisch an.

### Gradient-Placeholder

Wenn ein Event kein Bild hat (`image_url` ist `null`), wird ein `LinearGradient` mit vordefinierten Farbpaaren angezeigt. Das Paket `expo-linear-gradient` muss installiert sein.

### Datumsformatierung

```typescript
new Intl.DateTimeFormat('de-DE', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
}).format(new Date(isoDate));
// → "Sa, 10. Mai, 22:00"
```

Kein externer Date-Library nötig — `Intl.DateTimeFormat` ist in allen Zielplattformen verfügbar.

### State-Management

Lokaler State mit `useState` und `useEffect`. Kein globaler Store — das Projekt nutzt bewusst keine State-Management-Bibliothek (siehe CLAUDE.md: "keep state local until a clear cross-screen need emerges").

## Navigation

### Route

| Name | Screen | Params | Deep-Link |
|------|--------|--------|-----------|
| `EventList` | `EventListScreen` | `undefined` | `happin:///events` |
| `Event` | `EventScreen` | `{ eventId?: number }` | `happin:///event/:eventId` |

### Einstiegspunkte

- **HomeScreen:** "Mehr erfahren"-Button navigiert zu `EventList`
- **EventListScreen:** Card-Tap navigiert zu `Event` mit `eventId`
- **Deep-Link:** `happin:///events` öffnet die Liste direkt

### eventId als Route-Parameter

Der EventScreen empfängt `eventId` über Route-Params:
```typescript
const route = useRoute<any>();
const eventId = route.params?.eventId;
```

Wenn `eventId` vorhanden: API-Call → echte Daten. Wenn nicht: Fallback auf Mock-Daten (für Entwicklung).

## Daten-Mapping API → UI (EventScreen)

Der EventScreen hat ein internes `EventData`-Interface. Die `mapApiToEventData()`-Funktion übersetzt die API-Response:

| UI-Feld | API-Quelle | Transformation |
|---------|-----------|----------------|
| `heroImage` | `image_url` | Direkt, oder leer wenn `null` |
| `date` | `date` | `Intl.DateTimeFormat('de-DE', { weekday, day, month, year })` |
| `time` | `date` | `Intl.DateTimeFormat('de-DE', { hour, minute })` + " Uhr" |
| `location` | `location.city` | Direkt |
| `locationDetail` | `location.street, house_number, postal_code, city` | Komma-getrennt |
| `categories` | `category` | Split auf Komma |
| `price` | — | "Preis auf Anfrage" (kein Preisfeld auf Event-Ebene) |
| `capacity` | `max_capacity` | `"{n} Plätze"` oder "Unbegrenzt" |
| `attending` | `participant_count` | Direkt |
| `host.name` | `host_name` | Direkt, Fallback "Veranstalter" |
| `lineup` | — | Leeres Array (keine DB-Repräsentation) |

## Dateien

| Datei | Zweck |
|-------|-------|
| `src/screens/EventListScreen.tsx` | Event-Übersichtsseite |
| `src/screens/EventScreen.tsx` | Event-Detailseite (angepasst für API-Daten) |
| `src/services/api.ts` | API-Client |
| `src/types/events.ts` | TypeScript-Interfaces |
| `src/navigation/RootNavigator.tsx` | Route-Definition + Param-Typen |
| `src/components/App.tsx` | Deep-Link-Konfiguration |
