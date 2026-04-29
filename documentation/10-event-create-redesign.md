# Event-Erstellungsflow: Draft-basiert mit Live-Editing

## Übersicht

Die Event-Erstellung folgt einem zweistufigen Prozess:

1. **Schritt 1 (Kerndaten):** Titel, Datum und Uhrzeit eingeben → Event wird sofort als **Entwurf** in der Datenbank gespeichert
2. **Schritt 2 (Bearbeitung):** Weiterleitung auf die echte Event-Route `/event/{uuid}` — dort bearbeitet der Host alle weiteren Details direkt im UI über dezente Edit-Buttons. Jede Änderung wird sofort per PATCH persistiert.

**Ziel:** Schnell das fertige Ergebnis sehen, minimale Eingaben vor dem ersten visuellen Feedback, keine Datenverluste durch sofortige Persistierung.

---

## Architektur

```
/events/create (Route)
  └── EventCreateStepOne.tsx
        ↓ POST /api/v1/events/ (status: "draft")
        ↓ router.replace(`/event/${event_id}`)

/event/[eventId] (Route)
  └── EventScreen.tsx
        ├── status === "draft"  → Edit-Mode (Edit-Buttons, Modals, PATCH, Publish-Button)
        └── status === "published" → Read-Only-Ansicht (RSVP, etc.)
```

Der gesamte State lebt in der Datenbank. Es gibt keinen lokalen Form-State, der zwischen Schritten synchronisiert werden muss.

---

## Schritt 1: Kerndaten (`EventCreateStepOne.tsx`)

**Route:** `/events/create`

**Felder:**
- Titel (required, max 255 Zeichen)
- Beginn Datum (DatePicker, required, muss in der Zukunft liegen)
- Beginn Uhrzeit (TimePicker, required)

**Validierung vor "Weiter":**
- Alle drei Felder müssen befüllt sein
- Datum + Uhrzeit kombiniert muss in der Zukunft liegen

**Verhalten bei "Weiter":**
1. Holt den Auth-Token via `getSession()`
2. Sendet `POST /api/v1/events/` mit:
   ```json
   {
     "title": "...",
     "starts_at": "2026-05-01T20:00:00",
     "is_public": true,
     "status": "draft",
     "location": { "city": "Nicht angegeben" }
   }
   ```
3. Bei Erfolg: `router.replace(/event/${result.event_id})`
4. Bei Fehler: Fehlermeldung im Formular

**UI:**
- Minimales Layout mit Header "Schritt 1 von 2 — Kerndaten"
- "Weiter"-Button (Pill-Shape, Primary-Farbe) mit Loading-Spinner während der API-Anfrage

---

## Schritt 2: Event-Detail-Seite im Edit-Mode (`EventScreen.tsx`)

**Route:** `/event/[eventId]`

`EventScreen` erkennt `status === 'draft'` in der API-Response und schaltet automatisch in den Edit-Mode. Der Screen dient sowohl als Read-Only-Ansicht (published) als auch als Editor (draft).

### Draft-Erkennung

```typescript
const isDraft = rawEvent?.status === 'draft';
```

### API-Zugriff auf Drafts

Drafts sind nur für den Host sichtbar. Deshalb übergibt der Frontend-Client den Auth-Token an `getEventById`:

```typescript
const token = await getSession();
const data = await api.getEventById(eventId, token ?? undefined);
```

### Edit-Mode Layout

Wenn `isDraft === true`:
1. **"Entwurf"-Badge** oben im Card-Body
2. **EventHero** mit Edit-Button (Titel bearbeiten)
3. **EventInfoBlock** (Datum/Uhrzeit) mit Edit-Button
4. **EventInfoBlock** (Ort) mit Edit-Button
5. **EventCategories** mit Edit-Button
6. **EventDescription** mit Edit-Button
7. **Einstellungen-Sektion** (Sichtbarkeit + Kapazität) mit Edit-Button
8. **"Event veröffentlichen"-Button** — PATCH mit `{ status: "published" }`

### Edit-Buttons

- **Aussehen:** 28×28px runder Container mit Stift-Icon (SVG)
- **Farblogik:**
  - Noch nicht bearbeitet: `colors.primary` (Akzentfarbe) — fällt dezent auf
  - Nach erster Bearbeitung: `colors.onSurfaceVariant` (Grauton) — unauffällig
- **Position:** Oben-rechts der jeweiligen Sektion
- **Verhalten:** Tap öffnet Bottom-Sheet-Modal für die Sektion

### Edit-Modals

Jeder Abschnitt hat ein eigenes Modal (Bottom-Sheet, slide-up):

| Sektion | Modal-Inhalt |
|---------|-------------|
| Titel | TextInput |
| Beschreibung | Multiline TextInput |
| Datum & Uhrzeit | DatePicker + TimePicker (Start + Ende) |
| Ort | Stadt, Straße, Nr., PLZ, Land |
| Kategorien | TextInput (Komma-separiert) |
| Kapazität & Sichtbarkeit | Numerisches Input + Switch-Toggle |

**Verhalten bei "Speichern":**
1. Erstellt ein `EventUpdateRequest`-Objekt nur mit den geänderten Feldern
2. Sendet `PATCH /api/v1/events/{eventId}` mit dem Token
3. Aktualisiert `rawEvent` und `event` State mit der Response
4. Markiert die Sektion als "edited" (Edit-Button wechselt zu Grauton)
5. Schließen ohne Speichern verwirft Änderungen (temporärer `tempData`-State)

### Veröffentlichung

Der "Event veröffentlichen"-Button:
1. Sendet `PATCH /api/v1/events/{eventId}` mit `{ status: "published" }`
2. Aktualisiert den lokalen State → `isDraft` wird `false`
3. Edit-Buttons verschwinden, RSVP-Button erscheint
4. Event ist nun in der öffentlichen Liste sichtbar

### Published-Mode (Read-Only)

Wenn `status === 'published'`:
- Keine Edit-Buttons
- RSVP-Button mit Bottom-Sheet (Zusagen/Unsicher/Absagen)
- Standardmäßige Event-Ansicht mit allen Sektionen

---

## Gradient-Platzhalter (Hero)

Wenn kein Titelbild gesetzt ist:
- `LinearGradient` von Primary (#b32053) nach Secondary (#6645c7), diagonal
- Volle Hero-Höhe (380px)
- Titel + Subtitle in Weiß über dem Gradient
- Gleiche Overlay-Struktur wie bei echtem Bild

---

## Shared Components (`src/components/event/`)

Wiederverwendbare Sektionen, die sowohl in der normalen Event-Ansicht als auch im Edit-Mode funktionieren:

| Komponente | Props | Beschreibung |
|-----------|-------|--------------|
| `EventHero` | title, subtitle, categories, imageUrl, editMode, edited, onEdit | Hero mit Bild oder Gradient |
| `EventInfoBlock` | rows[], editMode, edited, onEdit | Icon + Text Infozeilen |
| `EventCategories` | categories[], editMode, edited, onEdit | Kategorie-Chips |
| `EventDescription` | description, editMode, edited, onEdit | Beschreibungstext (expandierbar) |

Alle akzeptieren `editMode` und `onEdit` — bei `editMode=true` erscheint der EditButton.

---

## Atom-Komponenten

| Datei | Beschreibung |
|-------|-------------|
| `src/components/atoms/PencilIcon.tsx` | SVG-Stift-Icon, konfigurierbar (size, color) |
| `src/components/atoms/EditButton.tsx` | Runder Button mit PencilIcon, `edited`-Prop für Farbwechsel |
| `src/components/atoms/EditModal.tsx` | Bottom-Sheet-Modal mit Handle, Titel, Content-Slot, "Speichern" |
| `src/components/atoms/GradientHero.tsx` | LinearGradient-Platzhalter für fehlende Hero-Bilder |

---

## Types & API-Service

### Types (`src/types/events.ts`)

```typescript
interface EventListItem {
    // ...
    status: string;  // "draft" | "published"
}

interface EventCreateRequest {
    // ...
    status?: string;  // Optional, default "published" im Backend
}

interface EventUpdateRequest {
    // ...
    status?: string;  // Für Publish: { status: "published" }
}
```

### API-Service (`src/services/api.ts`)

```typescript
api.getEventById(eventId, token?)   // Token nötig für Drafts
api.createEvent(data, token)        // Erstellt Draft oder Published
api.updateEvent(eventId, data, token) // Partial-Update, auch Status
```

---

## Datenfluss

```
[Schritt 1] Titel + Datum + Zeit
    ↓ POST /api/v1/events/ (status: "draft")
    ↓ Erfolg → event_id
    ↓ router.replace(`/event/${event_id}`)

[Event-Route] GET /api/v1/events/{event_id} (mit Token)
    ↓ status === "draft" → Edit-Mode
    ↓ Edit-Button Tap → Modal → Speichern
    ↓ PATCH /api/v1/events/{event_id}
    ↓ UI-Update mit Response-Daten

[Veröffentlichen]
    ↓ PATCH /api/v1/events/{event_id} { status: "published" }
    ↓ Edit-Mode → Read-Only
    ↓ Event erscheint in öffentlicher Liste
```

---

## Betroffene Dateien

| Aktion | Datei |
|--------|-------|
| REWRITE | `src/screens/EventCreateScreen.tsx` (re-exportiert StepOne) |
| REWRITE | `src/screens/EventCreateStepOne.tsx` (POST + Redirect) |
| REWRITE | `src/screens/EventScreen.tsx` (Draft-Edit-Mode + Published-Read-Only) |
| NEU | `src/components/event/EventHero.tsx` |
| NEU | `src/components/event/EventInfoBlock.tsx` |
| NEU | `src/components/event/EventCategories.tsx` |
| NEU | `src/components/event/EventDescription.tsx` |
| NEU | `src/components/atoms/PencilIcon.tsx` |
| NEU | `src/components/atoms/EditButton.tsx` |
| NEU | `src/components/atoms/EditModal.tsx` |
| NEU | `src/components/atoms/GradientHero.tsx` |
| ÄNDERN | `src/services/api.ts` (token-Param, status in Types) |
| ÄNDERN | `src/types/events.ts` (status-Feld überall) |
| VERALTET | `src/screens/EventCreatePreview.tsx` (nicht mehr in Nutzung, kann entfernt werden) |
