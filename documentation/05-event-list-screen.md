# Event-Übersichtsseite (EventListScreen) - Explore

Dieses Dokument beschreibt den EventListScreen (Explore), den API-Client und die zugehörigen Architektur-Entscheidungen, einschließlich des responsiven Grid-Layouts für Web und Infinity Scroll.

## Übersicht

Der EventListScreen zeigt alle öffentlichen Events in einem responsiven Layout mit **Infinity Scroll**. Auf Mobile und Tablet wird eine scrollbare Liste verwendet, auf Web ein mehrspaliges Grid-Layout. 

**Neue Features (Mai 2026):**
- ✅ **Infinity Scroll** (keine Pagination-Buttons mehr)
- ✅ **Suchleiste** mit Filter & Saved Events Buttons
- ✅ **Like-Funktionalität** (Heart-Icon auf Cards)
- ✅ **Footer entfernt** (kein Impressum mehr)
- ✅ **Keine Überschriften** (nur Suchleiste + Events)

## UI-Design

### Header-Bereich

```
┌────────────────────────────────────────┐
│ Navbar (Logo links, Account rechts)   │
├────────────────────────────────────────┤
│ 🔍 [Suchleiste]  [Filter] [Bookmarks]│
└────────────────────────────────────────┘
```

**Suchleiste-Elemente:**
- **Search Icon**: `search` (20px)
- **Input**: "Events durchsuchen" Placeholder
- **Filter Button**: `options-outline` (22px)
- **Saved Button**: `bookmarks-outline` (22px) → `/saved-events`

**Styling:**
- Background: `surfaceContainerHigh`
- Border-Radius: 24px (Pill)
- Padding: 16px horizontal, 12px vertical
- Gap zwischen Buttons: 12px

### Event-Cards

```
┌───────────────────────────────┐
│ [Gradient/Bild]          ♥   │ ← Heart-Icon (Like)
│ DEIN EVENT (Badge)           │ ← Nur bei is_host
│                              │
│ Event-Titel                  │
│ 10. Mai 2026 • 19:00        │
│ Stuttgart                    │
│                              │
│ [Musik] [Party]   42 Teiln. │
└───────────────────────────────┘
```

**Like-Icon**:
- Position: `top: 12px, right: 12px` (absolut)
- Nicht gespeichert: `heart-outline`, weiß (#ffffff)
- Gespeichert: `heart` (gefüllt), Primary-Farbe
- Größe: 24px
- Stop-Propagation beim Click (öffnet nicht Event-Detail)

**"Dein Event" Badge** (nur für Hosts):
- Position: `top: 12px, left: 12px` (absolut)
- Background: Primary (E6 opacity)
- Text: "DEIN EVENT" (11px, uppercase, bold)
- **Kein Emoji!**

**Kategorien**:
- Maximal 2 angezeigt
- Chips: 10px padding, 8px border-radius
- Font: 12px, Font-Weight 600

**Teilnehmerzahl**:
- Position: Rechts unten in Card
- Font: 12px, Color: `onSurfaceVariant`

## Infinity Scroll

### Strategie

**Page Size:** 12 Events pro Request (EVENTS_PER_PAGE)

**Behavior:**
1. Initial Load: 12 Events beim Mount
2. User scrollt nach unten
3. Bei Erreichen von ~Scroll-Ende: Nächste 12 Events laden
4. Events werden an Liste angehängt
5. Repeat bis alle Events geladen

### Implementation

```typescript
const EVENTS_PER_PAGE = 12;

const [events, setEvents] = useState<EventListItem[]>([]);
const [loadingMore, setLoadingMore] = useState(false);
const [hasMore, setHasMore] = useState(true);

const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    const offset = events.length;
    const data = await api.getPublicEvents(EVENTS_PER_PAGE, offset, token);
    
    setEvents(prev => [...prev, ...data.events]);
    setHasMore(events.length + data.events.length < data.count);
    setLoadingMore(false);
}, [events.length, hasMore, loadingMore]);
```

**Backend-Integration:**
```typescript
// Backend gibt jetzt Total-Count zurück
interface EventListResponse {
    events: EventListItem[];
    count: number; // Gesamtzahl ALLER Events, nicht nur auf Seite
}
```

### Scroll-Detection

**Web:**
```typescript
const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = 
        layoutMeasurement.height + contentOffset.y >= 
        contentSize.height - paddingToBottom;

    if (isCloseToBottom && hasMore && !loadingMore) {
        void loadMore();
    }
};

<ScrollView onScroll={handleScroll} scrollEventThrottle={400}>
```

**Mobile:**
```typescript
<FlatList
    onEndReached={() => {
        if (hasMore && !loadingMore) {
            void loadMore();
        }
    }}
    onEndReachedThreshold={0.5}
    ListFooterComponent={renderFooter()}
/>
```

### Loading-Footer

```typescript
const renderFooter = () => {
    if (!loadingMore) return null;
    return (
        <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={colors.primary} />
        </View>
    );
};
```

## Pull-to-Refresh

```typescript
const [refreshing, setRefreshing] = useState(false);

const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const data = await api.getPublicEvents(EVENTS_PER_PAGE, 0, token);
    setEvents(data.events);
    setHasMore(data.events.length < data.count);
    setRefreshing(false);
}, []);

<RefreshControl
    refreshing={refreshing}
    onRefresh={handleRefresh}
    tintColor={colors.primary}
/>
```

## Responsive Layout

### Mobile & Tablet
- **FlatList** mit Virtualisierung
- **Card-Width**: `SCREEN_WIDTH - 48px` (24px Margin pro Seite)
- **Spacing**: 16px zwischen Cards

### Web (Responsive Grid)

**Breakpoints:**
```typescript
function getNumColumns(width: number): number {
    if (width >= 2560) return 5; // 4K / Ultrawide 21:9
    if (width >= 1920) return 4; // 2K / QHD
    if (width >= 1200) return 3; // Desktop
    if (width >= 768) return 2;  // Tablet Landscape
    return 1;                     // Mobile / Tablet Portrait
}
```

**Grid-Konfiguration:**
- Max-Width: 2560px (Container)
- Padding: 24px (GRID_PADDING)
- Gap Horizontal: 20px (GRID_GAP_H)
- Gap Vertical: 16px (GRID_GAP_V)

**Card-Width-Berechnung:**
```typescript
const containerWidth = Math.min(dimensions.width, CONTAINER_MAX_WIDTH);
const availableWidth = containerWidth - GRID_PADDING * 2;
const cardWidth = (availableWidth - GRID_GAP_H * (numColumns - 1)) / numColumns;
```

## Like-Funktionalität

### SavedEventsContext Integration

```typescript
import { useSavedEvents } from '@/src/contexts/SavedEventsContext';

const { toggleSaveEvent, isSaved } = useSavedEvents();

const handleToggleSave = (event: EventListItem, e?: any) => {
    if (e) {
        e.stopPropagation(); // Verhindert Navigation zu Event-Detail
    }
    toggleSaveEvent(event);
};
```

### Heart-Icon Position

```typescript
<TouchableOpacity
    style={styles.likeButton} // Absolut, top: 12, right: 12
    onPress={(e) => handleToggleSave(item, e)}
>
    <Ionicons
        name={isSaved(item.event_id) ? 'heart' : 'heart-outline'}
        size={24}
        color={isSaved(item.event_id) ? colors.primary : '#ffffff'}
    />
</TouchableOpacity>
```

## Navigation

### Event-Card Click
- **Als Teilnehmer**: → `/event/[id]` (EventScreen)
- **Als Host**: → `/event/[id]/manage` (EventHostScreen)

### Suchleiste-Buttons
- **Filter-Button**: TODO: Filter-Modal öffnen
- **Bookmarks-Button**: → `/saved-events` (SavedEventsScreen)

## Backend-Integration

### API-Call

```typescript
// GET /api/v1/events/?limit=12&offset=0
const data = await api.getPublicEvents(limit, offset, token);
```

**Response:**
```typescript
{
    events: EventListItem[];
    count: number; // Gesamtzahl (z.B. 19), nicht nur auf Seite (12)
}
```

**EventListItem:**
```typescript
interface EventListItem {
    event_id: string;
    title: string;
    starts_at: string;
    image_url?: string;
    gradient_id?: number; // 0-3
    location?: { city?: string };
    category?: string; // Komma-separiert
    participant_count: number;
    is_host: boolean;
}
```

## Performance

### Optimizations

1. **Small Page Size (12)**: Schneller Initial Load
2. **Lazy Loading**: Events werden nur bei Bedarf geladen
3. **FlatList Virtualisierung** (Mobile): Item-Recycling
4. **ScrollView + Flexbox** (Web): Kein Virtualisierung-Overhead
5. **Memoization**: Render-Callbacks memoized

### Expected Performance

- **Initial Load**: < 500ms (12 Events)
- **Load More**: < 300ms (12 Events)
- **Smooth Scroll**: 60 FPS
- **Memory**: ~1-2MB für 100 Events

## Betroffene Dateien

### Modifiziert
- `src/screens/EventListScreen.tsx`
  - Infinity Scroll statt Pagination
  - Suchleiste hinzugefügt
  - Like-Button hinzugefügt
  - Footer entfernt
  - Überschriften entfernt

### Abhängigkeiten
- `src/contexts/SavedEventsContext.tsx` - Like-Funktionalität
- `src/constants/gradients.ts` - Gradient-Display
- `app/saved-events.tsx` - Saved Events Route

## Migration Notes

### Breaking Changes
- ❌ **Pagination entfernt**: Keine Seitenzahlen mehr
- ❌ **Footer entfernt**: Kein Impressum mehr im EventListScreen

### Design-Änderungen
- ✅ Suchleiste mit Filter & Bookmarks
- ✅ Heart-Icon für Like
- ✅ "Dein Event" Badge links oben (ohne Emoji)
- ✅ Max 2 Kategorien angezeigt
- ✅ Teilnehmerzahl rechts unten

## Zukünftige Erweiterungen

1. **Filter-Modal**: Filter nach Kategorie, Datum, Location
2. **Search-Implementierung**: Events durchsuchen
3. **Virtualisierung für Web**: Bei 1000+ Events
4. **Skeleton-Loading**: Placeholder während Initial Load
5. **Optimistic Updates**: Like ohne Backend-Wait

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
└── [States] Empty: "Keine Events gefunden"
```

**Navigation zu Event-Erstellung:**
- Event-Erstellung erfolgt über den **"Erstellen" Tab** in der Bottom Navigation
- Der ehemalige FAB ("+"-Button) wurde entfernt (siehe 15-bottom-navigation.md)

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
