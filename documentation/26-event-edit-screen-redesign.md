# 26 - Event Edit Screen Redesign (Draft-basierter Erstellungsflow)

## Überblick

Der Event-Erstellungsflow wurde grundlegend umstrukturiert:

1. **Step 1** (`/events/create`) erstellt das Event sofort als **Entwurf** (`status: 'draft'`) in der DB
2. **Step 2** wurde durch die generische **EventEditScreen** (`/event/{id}/edit`) ersetzt
3. Die Edit-Seite funktioniert sowohl für neue Entwürfe als auch für das Bearbeiten bestehender Events

## Neuer Flow

```
Step 1 (Titel, Datum, Sichtbarkeit)
  → POST /api/v1/events/ (status='draft')
  → router.replace(/event/{id}/edit)

EventEditScreen (Live-Vorschau + Edit-Drawers)
  → PATCH /api/v1/events/{id} pro Sektion (Autosave)
  → PUT /api/v1/events/{id}/ticket-options (Tickets)
  → PATCH status='published' (Veröffentlichen)
```

## Neue Dateien

| Datei | Beschreibung |
|-------|--------------|
| `src/screens/EventEditScreen.tsx` | Generische Event-Edit-Seite mit Live-Vorschau und Edit-Drawers |
| `src/components/atoms/EditDrawer.tsx` | Wiederverwendbare Bottom-Sheet-Komponente (Modal + Animated + PanResponder) |
| `app/event/[eventId]/edit.tsx` | Route-Datei für `/event/{id}/edit` |

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/screens/EventCreateStepOneNew.tsx` | `handleNext` erstellt jetzt einen Entwurf via API und navigiert zu `/event/{id}/edit` |
| `app/events/create/step-2.tsx` | Redirect zu `/events/create` (alte Route deprecated) |

## EventEditScreen - Layout

Die Seite zeigt das Event als Live-Vorschau (wie EventScreen), mit Edit-Buttons pro Sektion:

### Sektionen mit Edit-Drawers

| Sektion | Drawer-Inhalt | API-Call |
|---------|--------------|----------|
| **Titelbild** (Hero) | ImageSelectionModal (Gradient-Auswahl) | TODO: Bild-Upload Endpoint |
| **Beschreibung** | TextInput (multiline) | PATCH `description` |
| **Kategorien** | CategorySelector | PATCH `category` |
| **Ort** | Stadt, Straße, Nr., PLZ, Land | PATCH `location` |
| **Ticketoptionen** | Tickets hinzufügen/bearbeiten/löschen | PUT `/ticket-options` |
| **Details** | Max. Teilnehmer, Enddatum | PATCH `max_capacity`, `ends_at` |
| **Bildergalerie** | ImageGalleryUploader | TODO: Media-Upload Endpoint |

### Autosave-Pattern

Jede Sektion speichert automatisch beim Schließen des Drawers via `api.updateEvent()`. Das Event wird danach neu geladen.

### Sticky Bottom-Bar

- **Entwürfe**: Zeigt Validierungsstatus + "Veröffentlichen"-Button
- **Veröffentlichte Events**: "Zum Event"-Button

### Placeholders

Sektionen ohne Inhalt zeigen einen Placeholder mit gestricheltem Rahmen und "Tippen zum Bearbeiten"-Hinweis.

## EditDrawer-Komponente

Generischer Bottom-Sheet-Drawer basierend auf dem `ImageSelectionModal`-Pattern:

- `Modal` + `Animated.Value` für slide-up Animation
- `PanResponder` für Swipe-to-dismiss
- Props: `visible`, `onClose`, `title`, `children`, `noScroll`
- Keyboard-Avoiding auf iOS

## Ticket-Konfiguration

Im Ticket-Drawer können Veranstalter:
- Neue Tickets hinzufügen (+ Button)
- Bestehende bearbeiten: Name, Preis (€), Beschreibung, Limit
- Tickets löschen (Trash-Icon)
- Gespeichert via `api.syncTicketOptions()` (PUT-Endpoint)

---

## Backend- und DB-Anforderungen

Die folgenden Punkte müssen im Backend implementiert werden. Im Frontend-Code sind sie als `// TODO Backend:` kommentiert.

### 1. Event-Status "draft" (HOCH - blockiert neuen Flow)

**DB:** `status`-Feld muss `'draft'` akzeptieren.

**POST `/api/v1/events/`:**
- `status: 'draft'` im Body akzeptieren
- Entwürfe mit minimalen Pflichtfeldern (nur `title`, `starts_at`, `is_public`)
- Entwürfe NICHT in öffentlichen Listen zeigen
- Entwürfe in `GET /api/v1/users/me/events` für den Ersteller sichtbar

**PATCH `/api/v1/events/{id}`:**
- Status-Wechsel `draft → published` unterstützen
- Pflichtfeld-Validierung erst beim Veröffentlichen

### 2. Location optional für Entwürfe (HOCH)

**POST `/api/v1/events/`:**
- `location` optional oder `location: { city: '' }` akzeptieren für Entwürfe

### 3. Ticket-Optionen (MITTEL)

**PUT `/api/v1/events/{id}/ticket-options`:**
- Muss auch für Entwürfe funktionieren
- `description`-Feld pro Ticket speichern

### 4. Titelbild-Upload (MITTEL)

**Benötigt:** `POST /api/v1/events/{id}/image` oder `PATCH` mit `image_url`/`gradient_id`

### 5. Galerie-Upload (NIEDRIG)

**Benötigt:**
- `POST /api/v1/events/{id}/media` (Upload)
- `DELETE /api/v1/events/{id}/media/{url}` (Entfernen)

### 6. Berechtigungsprüfung (HOCH)

Nur der Host darf PATCH/PUT/DELETE auf sein Event. Frontend prüft `is_host`, Backend muss serverseitig absichern.
