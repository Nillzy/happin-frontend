# Event-Branding: Individuelle Farbanpassung

## Übersicht

Veranstalter können das visuelle Design ihrer Events individuell anpassen:
- **Primärfarbe** — Schaltflächen, Avatar-Hintergrund, Highlights
- **Sekundärfarbe** — Sekundäre Aktionen, Akzente
- **Erweiterter Farbverlauf** — 8 Vorlagen statt 4

Eine Live-Vorschau ist direkt beim Bearbeiten sichtbar (Gradient-Änderungen sofort, Farben nach Schließen des Drawers).

---

## Neue Datenbankfelder

```sql
ALTER TABLE public.event
  ADD COLUMN accent_color_primary VARCHAR(7) DEFAULT NULL;
ALTER TABLE public.event
  ADD COLUMN accent_color_secondary VARCHAR(7) DEFAULT NULL;
```

Beide Felder sind nullable und speichern Hex-Farben im Format `#RRGGBB`.

Migration: `backend/supabase/migrations/20260521094743_add_event_branding.sql`

---

## API

Neue PATCH-Felder für `PATCH /api/v1/events/{id}`:
- `accent_color_primary: string | null` — muss `#RRGGBB`-Format haben (validiert via Regex im Backend)
- `accent_color_secondary: string | null`

Ungültige Hex-Werte → HTTP 422.  
`null` → löscht das Branding, App-Standardfarben werden verwendet.

---

## Frontend-Typen

In `src/types/events.ts`:
- `EventListItem.accent_color_primary?: string | null`
- `EventListItem.accent_color_secondary?: string | null`
- `EventUpdateRequest.accent_color_primary?: string | null`
- `EventUpdateRequest.accent_color_secondary?: string | null`

---

## Gradient-Erweiterung

`src/constants/gradients.ts` erweitert von 4 auf 8 Einträge:

| ID | Farben | Beschreibung |
|----|--------|-------------|
| 0 | `#D4006B → #8B3DC8` | Pink → Lila (bestehend) |
| 1 | `#8B3DC8 → #42dae2` | Lila → Cyan (bestehend) |
| 2 | `#00677f → #8B3DC8` | Teal → Lila (bestehend) |
| 3 | `#FF6FA8 → #D4006B` | Hell-Pink → Pink (bestehend) |
| 4 | `#FF6B35 → #F7C59F` | Orange → Peach (neu) |
| 5 | `#1A1A2E → #16213E` | Nacht-Blau → Dunkel (neu) |
| 6 | `#2ECC71 → #1ABC9C` | Grün → Türkis (neu) |
| 7 | `#F64F59 → #C0392B` | Rot → Dunkelrot (neu) |

Bestehende Events mit `gradient_id` 0–3 sind rückwärtskompatibel.

---

## EventEditScreen: Design-Drawer

Neuer `'branding'`-Drawer in `EventEditScreen.tsx`:

**Übersichtskarte** zeigt aktuelle Farben mit Farbvorschau-Circles.

**Drawer-Inhalt:**
1. Horizontaler Scroll mit 8 Gradient-Thumbnails (80×56px) — Tap = sofortige Live-Vorschau
2. Primärfarbe: 12 Farbswatches + HEX-Eingabe (maxLength 7)
3. Sekundärfarbe: gleiche Struktur

Farben werden bei Schließen des Drawers validiert (Regex `#[0-9A-Fa-f]{6}`) — ungültige Eingaben werden als `null` gespeichert.

---

## EventScreen: Branding anwenden

`src/screens/EventScreen.tsx` leitet event-bezogene Farben ab:

```typescript
const effectivePrimary   = event.accent_color_primary   ?? colors.primary;
const effectiveOnPrimary = event.accent_color_primary   ? '#ffffff' : colors.onPrimary;
```

Stellen wo `effectivePrimary` / `effectiveOnPrimary` verwendet wird:
- Host-Avatar (Hintergrund + Text) — mobil + Desktop
- RSVP-Buttons (Sticky Bar mobil + Desktop)
- Ticket-Option-Radio-Buttons
- Checkout-Button
- RSVP-Menü-Highlights
- Kalender-Button + Bestätigungs-Button
- "Teilnehmer hinzufügen" + "Zusagen" Button

`colors.primary` in Lade-/Fehlerzuständen bleibt unverändert (Event noch nicht geladen).

**Fallback:** Kein Branding → App-Standardfarbe (`colors.primary`). Keine Regression.

---

## Betroffene Dateien

| Datei | Typ |
|-------|-----|
| `backend/supabase/migrations/20260521094743_add_event_branding.sql` | Neu (CLI-generiert) |
| `backend/app/schemas/events.py` | Erweitert |
| `backend/app/api/v1/events.py` | Erweitert (`_to_list_item`, `_to_detail`) |
| `frontend/src/types/events.ts` | Erweitert |
| `frontend/src/constants/gradients.ts` | Erweitert (4→8 Gradients) |
| `frontend/src/screens/EventEditScreen.tsx` | Hauptänderung (Branding-Drawer) |
| `frontend/src/screens/EventScreen.tsx` | Farbsubstitution |
| `frontend/src/screens/TicketDetailScreen.tsx` | Adressformat (Komma + PLZ) |
