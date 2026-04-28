# Event-Übersichtsseite (EventListScreen)

Dieses Dokument beschreibt den EventListScreen, den API-Client und die zugehörigen Architektur-Entscheidungen.

## Übersicht

Der EventListScreen zeigt eine scrollbare Liste aller öffentlichen Events. Nutzer können von dort auf einzelne Events tippen, um zum EventScreen (Detail) zu navigieren.

**Requirement:** M5 (Event-View-Grundlage), M11 (Öffentliche Event-Liste < 2s Ladezeit)

## API-Client (`src/services/api.ts`)

Ein dünner `fetch`-Wrapper ohne externe Dependencies (kein Axios).

```typescript
import { api } from '@/src/services/api';

const events = await api.getPublicEvents(50, 0);
const detail = await api.getEventById(42);
```

### Konfiguration

- Base-URL kommt aus `EXPO_PUBLIC_BACKEND_URL` (`.env.local`)
- Fallback: `http://localhost:8001`
- Auth-Header können später über den `options`-Parameter ergänzt werden

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

### Warum FlatList statt ScrollView

`FlatList` rendert nur sichtbare Items (Virtualisierung). Bei einer wachsenden Event-Liste ist das entscheidend für die Performance (M11: < 2s Ladezeit). `ScrollView` rendert alles auf einmal.

### Komponenten-Struktur

```
EventListScreen
├── Navbar (showBack, showCta=false)
├── FlatList
│   ├── Header: "Entdecke Events" Titel-Block
│   ├── EventCard × N
│   │   ├── Image / Gradient-Placeholder
│   │   ├── Titel, Datum (de-DE), Stadt
│   │   └── Kategorie-Chip, Teilnehmer-Count
│   └── Footer
├── Loading: ActivityIndicator
├── Error: Fehlermeldung + Retry-Button
└── Empty: "Keine Events gefunden"
```

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
