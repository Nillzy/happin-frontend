# 22. Saved Events & Like-Funktionalität

## Übersicht

Globales State Management für gespeicherte/gelikte Events mit AsyncStorage-Persistierung und Context API.

## Features

- **Like/Unlike Events**: Heart-Icon auf Event-Cards (Explore, Saved Events)
- **Persistente Speicherung**: AsyncStorage für App-Restart-sichere Daten
- **Saved Events Screen**: Dedizierte Seite für alle gespeicherten Events — **Responsives Grid-Layout** identisch zu Explore (1–5 Spalten je nach Viewport)
- **Herz-Button auf Saved-Cards**: Immer gefüllt (aktiv); Klick entfernt Event aus der gespeicherten Liste
- **Navigation**: Button in Explore-Screen Suchleiste

## Architektur

### SavedEventsContext

**Datei**: `src/contexts/SavedEventsContext.tsx`

```typescript
interface SavedEventsContextType {
    savedEvents: EventListItem[];
    savedEventIds: Set<string>;
    isSaved: (eventId: string) => boolean;
    toggleSaveEvent: (event: EventListItem) => Promise<void>;
}
```

**Persistierung**:
- Key: `@happin:saved_events`
- Format: JSON Array von EventListItem
- Automatisches Laden beim App-Start
- Automatisches Speichern bei Änderungen

### Integration

**App Layout** (`app/_layout.tsx`):
```typescript
<ThemeProvider>
    <AuthProvider>
        <SavedEventsProvider>
            <Stack screenOptions={{ headerShown: false }} />
        </SavedEventsProvider>
    </AuthProvider>
</ThemeProvider>
```

## Komponenten

### Like-Button auf Event-Cards

**EventListScreen** (`src/screens/EventListScreen.tsx`):
```typescript
import { useSavedEvents } from '@/src/contexts/SavedEventsContext';

const { toggleSaveEvent, isSaved } = useSavedEvents();

<TouchableOpacity onPress={(e) => handleToggleSave(item, e)}>
    <Ionicons
        name={isSaved(item.event_id) ? 'heart' : 'heart-outline'}
        size={24}
        color={isSaved(item.event_id) ? colors.primary : '#ffffff'}
    />
</TouchableOpacity>
```

**Position**: Top-right auf Event-Card (über Bild)

### Saved Events Button

**EventListScreen** - Suchleiste:
```typescript
<TouchableOpacity
    style={[styles.savedButton, { backgroundColor: colors.surfaceContainerHigh }]}
    onPress={() => router.push('/saved-events')}
>
    <Ionicons name="bookmarks-outline" size={22} color={colors.onSurface} />
</TouchableOpacity>
```

### SavedEventsScreen

**Datei**: `src/screens/SavedEventsScreen.tsx`
**Route**: `/saved-events`

**Features**:
- **Responsives Grid-Layout** (identisch zu EventListScreen): Web → flexbox grid 1–5 Spalten; Mobile → FlatList
- Breakpoints: <768px→1, 768–1199px→2, 1200–1919px→3, 1920–2559px→4, ≥2560px→5
- **Herz-Button** (gefüllt, `colors.primary`) oben rechts auf jeder Card — Klick ruft `toggleSaveEvent(item)` auf und entfernt das Event sofort aus der Liste
- Empty State: "Keine Events gespeichert" mit Button "Events entdecken"

## Design

### Heart-Icon
- **Nicht gespeichert**: `heart-outline`, weiße Farbe (#ffffff)
- **Gespeichert**: `heart` (gefüllt), Primary-Farbe
- **Größe**: 24px
- **Position**: Absolut, top: 12px, right: 12px

### Saved Button (Suchleiste)
- **Icon**: `bookmarks-outline`, 22px
- **Background**: `surfaceContainerHigh`
- **Padding**: 16px horizontal, 12px vertical
- **Border-Radius**: 24px (Pill)

## State Management

### Datenfluss

1. User klickt Heart-Icon → `toggleSaveEvent(event)`
2. Context prüft: `isSaved(event.event_id)`
3. **Falls nicht gespeichert**: 
   - Event zu `savedEvents` hinzufügen
   - `savedEventIds` Set aktualisieren
   - AsyncStorage updaten
4. **Falls gespeichert**:
   - Event aus `savedEvents` entfernen
   - `savedEventIds` Set aktualisieren
   - AsyncStorage updaten
5. UI re-rendert automatisch (Context Consumer)

### Performance

- **Set für O(1) Lookup**: `savedEventIds` Set für schnelles `isSaved()` Check
- **Lazy Loading**: Keine initial Events geladen (nur IDs)
- **Memoization**: Context-Provider memoized mit useMemo

## Navigation

- **Von Explore → Saved Events**: Bookmarks-Button in Suchleiste
- **Von Saved Events → Event Detail**: Click auf Event-Card
- **Zurück zu Explore**: Navbar Back-Button oder "Events entdecken" (Empty State)

## Betroffene Dateien

### Neu erstellt
- `src/contexts/SavedEventsContext.tsx` - Context & Provider
- `src/screens/SavedEventsScreen.tsx` - Saved Events Übersicht
- `app/saved-events.tsx` - Route-Export

### Modifiziert
- `app/_layout.tsx` - SavedEventsProvider hinzugefügt
- `src/screens/EventListScreen.tsx` - Heart-Icon & Bookmarks-Button

## Migration Notes

### Breaking Changes
Keine - Neue Funktion ohne Breaking Changes.

### AsyncStorage Key
- **Key**: `@happin:saved_events`
- **Format**: `JSON.stringify(EventListItem[])`
- Bei App-Update: Altes Format wird automatisch verworfen (kein Migration-Script nötig)

## Zukünftige Erweiterungen

1. **Sync mit Backend**: Optional Backend-Sync für Cross-Device
2. **Collections**: Events in Kategorien organisieren ("Wochenende", "Konzerte", etc.)
3. **Share-Funktion**: Gespeicherte Events teilen
4. **Notifications**: Reminder vor gespeicherten Events
5. **Export**: iCal-Export für gespeicherte Events
