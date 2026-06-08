# EventListViewModel

**Kategorie:** A-Software  
**Entwurfs-Entsprechung:** Präsentation – öffentliche Eventliste (M11)  
**Implementierung:** `src/screens/EventListScreen.tsx`, `src/screens/HomeScreen.tsx`

## Beschreibung

Das `EventListViewModel` stellt die öffentliche, filterbare und paginierte Event-Liste bereit. Es implementiert den Workflow M11 (öffentliche Eventliste) und ist der zentrale Einstiegspunkt für die Event-Entdeckung.

[→ Im Architekturentwurf ansehen](<https://gitlab.com/groups/dhbw-se/se-tinf24b2/happin/-/wikis/Entwurf/Komponentendiagramm#:~:text=und%20Login%2DWorkflow)-,EventListViewModel,-M11%20(%C3%96ffentliche%20Eventliste>)

## Workflow (M11)

```
1. Screen öffnet sich → Events werden geladen
2. Nutzer kann Kategorien, Datum, Stadt, Freitext filtern
3. Neue Filter lösen erneutes Laden aus
4. Infinite Scroll lädt weitere Events nach
5. Tap auf Event → Navigation zu EventDetailViewModel (M3)
```

## Screens

### `HomeScreen.tsx`

Der Home-Screen zeigt eine kuratierte Auswahl aktueller Events mit Hervorgehobenen und Neuen Events.

### `EventListScreen.tsx`

Der vollständige Event-Browser mit allen Filtermöglichkeiten:

```tsx
function EventListScreen() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [filters, setFilters] = useState<EventFilters>({});
  const [page, setPage] = useState(0);

  const loadEvents = async (reset = false) => {
    const data = await api.getPublicEvents({
      ...filters,
      limit: 20,
      offset: reset ? 0 : page * 20
    });
    setEvents(reset ? data : [...events, ...data]);
  };

  // Infinite Scroll
  const onEndReached = () => setPage(p => p + 1);
}
```

## Filteroptionen

| Filter | Typ | Beschreibung |
|---|---|---|
| `search` | Text | Volltextsuche |
| `categories` | Multi-Select | Kategorien (Musik, Sport, …) |
| `city` | Text | Stadtname |
| `date_from` / `date_to` | Datum | Zeitraum |
| `is_free` | Boolean | Nur kostenfreie Events |

## UI-Komponenten

- `FilterModal.tsx` – Filterauswahl als Bottom Sheet
- `FilterChip.tsx` – Aktive Filter als entfernbare Chips
- `CategorySelector.tsx` – Kategorieauswahl
- `DatePicker.tsx` – Datumsauswahl

## Abhängigkeiten

- [`BackendAdapter`](backend-adapter.md) – `api.getPublicEvents()`
- [`SavedEventsContext`](sitzungsverwaltung.md) – Lesezeichen-Status je Event
