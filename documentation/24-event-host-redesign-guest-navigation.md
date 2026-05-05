# 24. Event Host Screen - Redesign & Gästelisten-Navigation

## Übersicht

Event-Verwaltungsoberfläche für Hosts wurde vereinfacht: Tab-Navigation entfernt, Gästelisten öffnen als separate Seiten.

## Architektur-Änderung

### Vorher (Alt)
```
EventHostScreen
├── Tab Bar (Bottom)
│   ├── Übersicht
│   └── Gäste (mit Filter-Chips)
├── OverviewTab
│   ├── Statistik-Cards
│   ├── Kapazitätsanzeige
│   └── Einladungslink
└── GuestsTab
    ├── Filter-Chips (Alle/Zusagen/Absagen/Unsicher)
    └── Gästeliste
```

### Nachher (Neu)
```
EventHostScreen (nur Overview)
├── Header
│   ├── Event-Info
│   └── "Zur Gast-Ansicht" Button
├── Statistik-Cards (anklickbar)
│   ├── Zusagen → /event/[id]/guests?status=accepted
│   ├── Absagen → /event/[id]/guests?status=declined
│   └── Unsicher → /event/[id]/guests?status=pending
├── Kapazitätsanzeige
└── Einladungslink

EventGuestsScreen (neu)
├── Header (Status-farbencodiert)
├── Bulk-Action-Bar (bei Auswahl)
└── Gästeliste (gefiltert nach Status)
```

## Komponenten

### EventHostScreen

**Datei**: `src/screens/EventHostScreen.tsx`

**Änderungen**:
- ❌ Tab-Navigation entfernt (`TabType`, `activeTab`, `setActiveTab`)
- ❌ `GuestsTab` Komponente entfernt
- ✅ Nur noch `OverviewTab` (ohne Tab-Wrapper)
- ✅ "Zur Gast-Ansicht" Button → `/event/[id]` (normale Event-Ansicht)
- ✅ Statistik-Cards mit Click-Handler → Navigation zu Gästeliste

**Statistik-Cards Navigation**:
```typescript
const handleStatusClick = (status: 'accepted' | 'declined' | 'pending') => {
    router.push(`/event/${eventId}/guests?status=${status}`);
};

<TouchableOpacity onPress={() => handleStatusClick('accepted')}>
    <Text>{counts.accepted}</Text>
    <Text>Zusagen</Text>
</TouchableOpacity>
```

**"Zur Gast-Ansicht" Button**:
```typescript
<TouchableOpacity onPress={() => router.push(`/event/${eventId}`)}>
    <Text>Zur Gast-Ansicht</Text>
</TouchableOpacity>
```
- **Position**: Unter Event-Datum im Header-Card
- **Style**: `surfaceContainerHigh` Background, `outlineVariant` Border
- **Zweck**: Host kann Event aus Gast-Perspektive sehen

### EventGuestsScreen (Neu)

**Datei**: `src/screens/EventGuestsScreen.tsx`
**Route**: `app/event/[eventId]/guests.tsx`

**Props via Query-Params**:
```typescript
const { eventId, status } = useLocalSearchParams<{
    eventId: string;
    status: 'accepted' | 'declined' | 'pending';
}>();
```

**Features**:
- **Header**: Status-Name (Zusagen/Absagen/Unsicher) in Status-Farbe
- **Subtitle**: Anzahl der Gäste
- **Bulk-Action-Bar**: Erscheint bei Auswahl, "Entfernen"-Button
- **Gästeliste**: Checkbox, Avatar (Status-farbe), Name, Telefon (maskiert)
- **Empty State**: "Keine Gäste in dieser Kategorie"

**Status-Farben**:
```typescript
const getStatusColor = () => {
    switch (status) {
        case 'accepted': return colors.tertiary;  // Grün
        case 'declined': return colors.error;     // Rot
        case 'pending': return colors.secondary;  // Orange/Gelb
    }
};
```

**Avatar-Styling**:
- Background-Color = Status-Farbe
- Initiale in Weiß
- Border-Radius: 9999px (Circle)
- Size: 40x40px

**Bulk-Actions**:
```typescript
const handleRemove = async () => {
    await api.removeParticipants(eventId, Array.from(selectedIds), token);
    await loadData(); // Reload nach Löschung
};
```

## Navigation-Flow

### Host → Gästeliste
1. Host öffnet Event-Host-Screen (`/event/[id]/host`)
2. Host klickt auf Statistik-Card (z.B. "Zusagen")
3. Navigation zu `/event/[id]/guests?status=accepted`
4. EventGuestsScreen lädt gefilterte Gästeliste

### Host → Gast-Ansicht
1. Host öffnet Event-Host-Screen (`/event/[id]/host`)
2. Host klickt "Zur Gast-Ansicht"
3. Navigation zu `/event/[id]` (EventScreen)
4. Host sieht Event wie normale Teilnehmer

### Gästeliste → Event-Host-Screen (Zurück)
1. User ist auf `/event/[id]/guests?status=accepted`
2. User klickt Navbar Back-Button
3. Navigation zurück zu `/event/[id]/host`

## Design

### EventHostScreen Header

```
┌──────────────────────────────────────┐
│ Dein Event                           │
│ Event-Titel                          │
│ 10. Mai 2026, 19:00 Uhr             │
│                                      │
│ [Zur Gast-Ansicht] (Button)         │
└──────────────────────────────────────┘
```

### Statistik-Cards

```
┌─────────┬─────────┬─────────┐
│   42    │   5     │   12    │
│ Zusagen │ Absagen │ Unsicher│
└─────────┴─────────┴─────────┘
```

- **Hover/Active**: Keine Border-Änderung (kein Toggle mehr)
- **Cursor**: Pointer (anklickbar)
- **Tap-Feedback**: `activeOpacity: 0.7`

### EventGuestsScreen Header

```
┌──────────────────────────────────────┐
│ GÄSTELISTE                           │
│ Zusagen (Grüne Farbe)               │
│ 42 Gäste                            │
└──────────────────────────────────────┘
```

### Gästeliste

```
┌──────────────────────────────────────┐
│ ☐ [AV] Anna Vogel                   │
│        +49 ••• ••• 1234             │
├──────────────────────────────────────┤
│ ☑ [MK] Max Keller                   │
│        +49 ••• ••• 5678             │
└──────────────────────────────────────┘
```

**Elemente**:
- **Checkbox**: 22x22px, Border-Radius 6px
- **Avatar**: 40x40px Circle, Status-Farbe als Background
- **Name**: 15px, Font-Weight 600
- **Telefon**: 12px, maskiert (`+49 ••• ••• 1234`)

## API-Integration

### getEventParticipants

```typescript
const participantData = await api.getEventParticipants(eventId, token);
const filtered = participantData.participants.filter(
    p => p.status.toLowerCase() === status
);
```

### removeParticipants

```typescript
await api.removeParticipants(
    eventId,
    Array.from(selectedIds), // participation_ids
    token
);
```

## State Management

### EventGuestsScreen State

```typescript
const [participants, setParticipants] = useState<Participant[]>([]);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [removing, setRemoving] = useState(false);
```

**Keine globale State**: Jeder Screen lädt seine Daten selbst (kein Context).

## Betroffene Dateien

### Modifiziert
- `src/screens/EventHostScreen.tsx`
  - Tab-Navigation entfernt
  - GuestsTab Komponente entfernt
  - Statistik-Cards mit Navigation
  - "Zur Gast-Ansicht" Button hinzugefügt

### Neu erstellt
- `src/screens/EventGuestsScreen.tsx` - Gästelisten-Seite
- `app/event/[eventId]/guests.tsx` - Route-Export

## Migration Notes

### Breaking Changes

- **Gäste-Tab entfernt**: User können Gästeliste nicht mehr direkt im Host-Screen sehen
- **Neue Navigation**: Gästeliste öffnet als separate Seite (Back-Button nötig)

### UX-Verbesserungen

✅ Dedizierte Seite pro Status (fokussierter)
✅ Keine Tab-Switching nötig
✅ Klarere Hierarchie (Overview → Detail)
✅ Mehr Platz für Gästeliste

## Zukünftige Erweiterungen

1. **Filter-Optionen**: Name, Datum, etc.
2. **Export-Funktion**: CSV-Export der Gästeliste
3. **Bulk-Actions**: Mehr Actions (Status ändern, Message senden)
4. **Search**: Gast-Suche
5. **QR-Code-Scanner**: Check-In vor Ort
