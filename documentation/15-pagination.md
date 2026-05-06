# Pagination – Event-Liste

## Überblick

Die Event-Liste (`EventListScreen`) lädt Events seitenweise vom Backend statt alle auf einmal. Dadurch bleibt die Ladezeit konstant, egal wie viele Events existieren.

## Konfiguration

```typescript
// src/screens/EventListScreen.tsx
const EVENTS_PER_PAGE = 12;
```

## Datenfluss

1. `loadPage(page)` berechnet den Offset: `offset = page * EVENTS_PER_PAGE`
2. API-Aufruf mit `limit` und `offset`:
   - Öffentliche Events: `GET /api/v1/events/?limit=12&offset=<n>`
   - Eigene Events: `GET /api/v1/events/me?period=upcoming&limit=12&offset=<n>`
3. Die Antwort (`EventListResponse`) liefert `{ events, count }` – `count` ist die Gesamtanzahl aller passenden Events.
4. `totalPages = Math.ceil(count / EVENTS_PER_PAGE)`

## State

| Variable | Typ | Bedeutung |
|---|---|---|
| `currentPage` | `number` | Aktuell angezeigte Seite (0-basiert) |
| `totalCount` | `number` | Gesamtanzahl Events vom Backend |
| `events` | `EventListItem[]` | Events der aktuellen Seite |

## Pagination-UI (`renderPagination`)

- Zeigt max. **5 Seitenzahlen** gleichzeitig (zentriert um die aktuelle Seite)
- Erste/letzte Seite werden immer angezeigt, dazwischen `…` wenn nötig
- `‹` / `›` Buttons für Vor/Zurück, bei erstem/letztem Stand deaktiviert
- Aktive Seite ist mit `colors.primary` hervorgehoben
- Wird unter der Karten-Liste eingeblendet (Web: ScrollView, Mobile: FlatList Footer)

## API-Typen

```typescript
// src/types/events.ts
export interface EventListResponse {
    events: EventListItem[];
    count: number;
}
```
