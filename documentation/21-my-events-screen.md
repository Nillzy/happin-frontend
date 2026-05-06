# 21. MyEventsScreen - Event-Verwaltung & Ticket-Detail

## Übersicht

Dedizierter Screen für Event-Verwaltung mit Unterscheidung zwischen Tickets (Teilnahme) und eigenen Events (Host).

## Architektur

### Collapsible Sections

Drei aufklappbare Bereiche, die nur angezeigt werden wenn Events vorhanden sind:

1. **Von dir organisiert** (Standard: offen) — Events, bei denen der User Host ist
2. **Deine Events** (Standard: offen) — Events, an denen der User teilnimmt
3. **Vergangene Events** (Standard: geschlossen) — Alle vergangenen Events (Host + Teilnehmer)

Wenn eine Kategorie leer ist, wird der gesamte Abschnitt ausgeblendet.

### State Management

```typescript
const [organizedCollapsed, setOrganizedCollapsed] = useState(false);
const [attendingCollapsed, setAttendingCollapsed] = useState(false);
const [pastCollapsed, setPastCollapsed] = useState(true);
```

## Card-Design

### Ticket-Cards (Teilnehmer)

**Layout**: QR-Code (links) + Event-Info (rechts)

```
┌───────────────────────────────────┐
│ ┌───┐  Event-Titel          >    │
│ │QR │  10. Mai 2026 • 19:00      │
│ └───┘  Stuttgart                 │
└───────────────────────────────────┘
```

**Split-Navigation**:
- **QR-Code (linke Hälfte)**: → `/ticket/[eventId]` (TicketDetailScreen)
- **Event-Info (rechte Hälfte)**: → `/event/[eventId]` (EventScreen)

**Elemente**:
- QR-Code Platzhalter: 8x8 Grid (80x80px), schwarze Quadrate
- Titel: 16px, Font-Weight 700, 1 Zeile
- Datum: 13px, Font-Weight 400
- Location: 12px, Color: outline
- Card-Höhe: 100px

### Host-Cards (Kompakt, "Von dir organisiert")

Kompakte Karten mit kleinem Thumbnail und Fokus auf Kennzahlen.
Unterscheidung zwischen öffentlichen und privaten Events durch farbiges Label und unterschiedliche Stats.

**Gemeinsames Layout**:
```
┌───────────────────────────────────────┐
│ ┌────┐  Event-Titel     [ÖFFENTLICH] │
│ │IMG │  12. Mai • 19:00 · Stuttgart  │
│ └────┘                               │
├───────────────────────────────────────┤
│  (Stats je nach Event-Typ, s.u.)     │
└───────────────────────────────────────┘
```

**Navigation**: → `/event/[eventId]/manage` (EventHostScreen)
**Thumbnail**: 56x56px, border-radius 12px, Event-Bild oder Gradient-Fallback
**Label**: Kleiner Chip neben dem Titel
- Öffentlich: tertiary-Farbe mit 18% Opacity-Background
- Privat: secondary-Farbe mit 18% Opacity-Background
- Text: 10px, uppercase, bold

#### Öffentliche Events (is_public: true)

Fokus auf **Verkauf und Reichweite**.

**Stats-Row**: 4 Spalten
| Zusagen (grün) | Absagen (error) | Offen (outline) | Umsatz (primary, EUR) |

#### Private Events (is_public: false)

Fokus auf **Gästemanagement und Planung**. Kein Umsatz.

**Stats-Row**: 4 Spalten
| Eingeladen (onSurface) | Zusagen (grün) | Absagen (error) | Ausstehend (outline) |

**Datenquellen (TODO)**:
Die RSVP-Daten und Ticketumsatz werden aktuell noch nicht vom Backend geliefert.
Benötigte Felder pro Event in `EventListItem`:
- `rsvp_accepted: number`
- `rsvp_declined: number`
- `rsvp_pending: number`
- `ticket_revenue_cents: number` (nur öffentliche Events)
- `invited_count: number` (nur private Events)

## TicketDetailScreen

**Datei**: `src/screens/TicketDetailScreen.tsx`
**Route**: `/ticket/[eventId]`

### Design (Luma-inspiriert)

**Layout**:
```
┌─────────────────────────────────┐
│ [Transparent Overlay]           │
│                                 │
│   ┌─────────────────────┐      │
│   │ [Weiße Modal-Box]   │      │
│   │                     │      │
│   │  ┌──────────────┐  │      │
│   │  │  QR-Code     │  │      │
│   │  │  (Large)     │  │      │
│   │  └──────────────┘  │      │
│   │                     │      │
│   │  Event-Info         │      │
│   │  • Titel            │      │
│   │  • Datum            │      │
│   │  • Location         │      │
│   │  • Host             │      │
│   │                     │      │
│   └─────────────────────┘      │
│                                 │
└─────────────────────────────────┘
```

### Features

**Swipe-to-Dismiss**:
```typescript
const panResponder = PanResponder.create({
    onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
            handleClose(); // Slide down & close
        } else {
            Animated.spring(translateY, { toValue: 0 }).start();
        }
    },
});
```

**QR-Code**:
- Größe: `SCREEN_WIDTH - 128` (64px Padding pro Seite)
- Grid: 8x8 schwarze Quadrate
- Border-Radius: 12px
- Background: Weiß

**Overlay**:
- Background: `rgba(0, 0, 0, 0.5)` (Semi-transparent)
- Tap outside → Close

**Animation**:
- Slide-in from bottom: `translateY: SCREEN_HEIGHT → 0`
- Duration: 300ms
- Spring-Animation beim Release

## Section-Header

**Design**:
```
┌───────────────────────────────────┐
│ Aktuelle Tickets            (5)   │  ← Chevron
└───────────────────────────────────┘
```

**Elemente**:
- Titel: 18px, Font-Weight 700
- Badge: 18px, Font-Weight 400, Primary Color (kein Kreis)
- Chevron: `chevron-down` (offen) / `chevron-right` (geschlossen)
- Background: `surfaceContainer`
- Padding: 16px
- Keine Icons vor der Überschrift

## Data-Loading

### API-Calls

```typescript
// Aktuelle Events
const upcoming = await api.getUserEvents(token, 'upcoming', 100, 0);

// Vergangene Events
const past = await api.getUserEvents(token, 'past', 100, 0);

// Client-Side Filtering (3 Kategorien)
const organizedEvents = upcoming.events.filter(e => e.is_host);
const attendingEvents = upcoming.events.filter(e => !e.is_host);
// pastEvents enthält alle vergangenen Events (Host + Teilnehmer)
```

### Pull-to-Refresh

```typescript
<ScrollView
    refreshControl={
        <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
        />
    }
>
```

## Empty States

```typescript
function getEmptyMessage(type: string) {
    switch (type) {
        case 'upcoming-tickets':
            return { icon: '🎟️', text: 'Keine aktuellen Tickets' };
        case 'past-tickets':
            return { icon: '📅', text: 'Keine vergangenen Tickets' };
        case 'upcoming-hosting':
            return { icon: '✨', text: 'Du hast noch keine Events erstellt' };
        case 'past-hosting':
            return { icon: '🏁', text: 'Keine vergangenen Events' };
    }
}
```

## Navigation-Flow

### Ticket → Ticket-Detail
1. User öffnet MyEventsScreen
2. User klickt QR-Code-Bereich auf Ticket-Card
3. Navigation zu `/ticket/[eventId]`
4. TicketDetailScreen öffnet als Modal (Slide-in)
5. User swiped down → Modal schließt, zurück zu MyEventsScreen

### Ticket → Event-Detail
1. User klickt Event-Info-Bereich (rechts)
2. Navigation zu `/event/[eventId]`
3. EventScreen öffnet (normale Navigation)

### Host-Event → Event-Host-Screen
1. User klickt Host-Card
2. Navigation zu `/event/[eventId]/host`
3. EventHostScreen öffnet (Verwaltungs-Interface)

## Betroffene Dateien

### Modifiziert
- `src/screens/MyEventsScreen.tsx`
  - Collapsible Sections statt Filter-Chips
  - Ticket-Cards mit QR-Code
  - Split-Navigation
  - Badge-Counts auf Section-Header

### Neu erstellt
- `src/screens/TicketDetailScreen.tsx` - Ticket-Detail Modal
- `app/ticket/[eventId].tsx` - Route-Export

## Design-Entscheidungen

**Warum QR-Code?**
- Eindeutige Identifikation als "Ticket" (nicht Event-Card)
- Vorbereitung für Check-In-Funktion
- Visuell unterscheidbar von Host-Cards

**Warum Split-Navigation?**
- User wollen oft nur QR-Code sehen (schnell)
- Oder Event-Details sehen (Kontext)
- Zwei separate Use-Cases, zwei Bereiche

**Warum Collapsible statt Tabs?**
- Mehr Übersicht (alle Kategorien auf einen Blick)
- Weniger Navigation nötig
- Häufig genutzte offen, seltene geschlossen

## Zukünftige Erweiterungen

1. **QR-Code scannen**: Echte QR-Codes generieren
2. **Apple Wallet**: "Add to Apple Wallet" Button
3. **Ticket-Sharing**: Ticket an Freunde weitergeben
4. **Check-In**: QR-Scanner für Event-Einlass
5. **Erinnerungen**: Push-Notifications vor Event
