# Ticket-Optionen (Preiskategorien)

## Überblick

Das Ticket-System erlaubt Hosts, Preiskategorien für Events zu definieren. Jedes Event hat eine explizite Entscheidung: **kostenlos** (`is_free: true`) oder **kostenpflichtig** mit einer oder mehreren Ticket-Optionen.

Es gibt kein "Preis auf Anfrage" — der Eintritt ist immer eindeutig.

---

## Datenfluss

```
EventScreen (Draft-Mode)
  ↓ "Eintritt" Edit-Button
Ticket-Modal öffnet sich
  ├─ "Kostenlos" → PATCH /events/{id} { is_free: true }
  └─ Ticket-Optionen bearbeiten → PUT /events/{id}/ticket-options
                                  + PATCH { is_free: false }
  ↓
Event neu laden → Preisanzeige aktualisiert
```

---

## Types

### `TicketOption` (`src/types/events.ts`)

```typescript
export interface TicketOption {
    ticket_option_id?: string;  // undefined = neues Item
    name: string;
    description?: string | null;
    price: number;              // 0 = kostenlose Option
    quantity_limit?: number | null;  // null = unbegrenzt
    sort_order: number;
}
```

### Erweiterungen auf Event-Types

- `EventDetailResponse.ticket_options: TicketOption[]` — Liste der Optionen
- `EventDetailResponse.is_free: boolean` — Kostenlos-Flag
- `EventListItem.is_free: boolean` — auch in der Listenansicht
- `EventUpdateRequest.is_free?: boolean` — zum Setzen des Flags

---

## API-Methode

### `api.syncTicketOptions(eventId, options, token)` (`src/services/api.ts`)

- **Methode:** PUT
- **Endpoint:** `/api/v1/events/{eventId}/ticket-options`
- **Body:** `{ ticket_options: TicketOption[] }`
- **UPSERT-Semantik:** Items mit ID → Update, ohne ID → Insert, fehlende IDs → Delete

---

## Preisanzeige-Logik

Die Funktion `formatPriceDisplay(isFree, options)` in `EventScreen.tsx` berechnet:

| Zustand | Anzeige |
|---------|---------|
| `is_free === true` | "Kostenlos" |
| `ticket_options.length === 0` (Draft) | "Eintritt festlegen" |
| `ticket_options.length === 1` | "12,00 €" |
| `ticket_options.length > 1` | "Ab 5,00 €" (niedrigster Preis) |

Verwendet `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`.

---

## Ticket-Edit-Modal

Das Modal öffnet sich über den Edit-Button neben der Ticket-Info-Row im Draft-Mode.

### Aufbau

1. **"Kostenlos"-Button** — Setzt `is_free: true` per PATCH, löscht alle Optionen serverseitig
2. **"oder"-Divider** — Visuelle Trennung
3. **Ticket-Karten** — Pro Option eine Karte mit:
   - Name (Pflichtfeld)
   - Beschreibung (optional)
   - Preis in EUR (Decimal-Pad)
   - Limit (optional, Number-Pad)
   - Löschen-Button (✕)
4. **"+ Ticket-Option hinzufügen"** — Fügt leere Karte hinzu

### State-Management

- `ticketOptions: TicketOption[]` — lokaler State, initialisiert aus `rawEvent.ticket_options`
- Beim Öffnen: State wird aus `rawEvent` synchronisiert
- Beim Schließen ohne Speichern: State wird auf `rawEvent.ticket_options` zurückgesetzt
- Beim Speichern: PUT an API, dann `rawEvent` aktualisieren

### Speicher-Flow

```
"Speichern" gedrückt
  → api.syncTicketOptions(eventId, ticketOptions, token)
  → Falls is_free noch true: api.updateEvent(eventId, { is_free: false }, token)
  → rawEvent + event State aktualisieren
  → Modal schließen
```

---

## Published-Ansicht

In der Published-Ansicht (read-only) wird der Preis im Info-Block angezeigt:
- `InfoRow` mit `TicketIcon` zeigt den formatierten Preis
- Secondary-Text zeigt Kapazität

Keine interaktive Bearbeitung möglich.

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/types/events.ts` | `TicketOption` Interface, `is_free` + `ticket_options` Felder |
| `src/services/api.ts` | `syncTicketOptions` Methode |
| `src/screens/EventScreen.tsx` | `formatPriceDisplay`, Ticket-Edit-Modal, Edit-Section `'tickets'` |

---

## Zusammenspiel mit Draft-Flow

Das Ticket-System integriert sich nahtlos in den bestehenden Draft-Edit-Flow:

1. Event wird als Draft erstellt (default: `is_free: true`)
2. Host sieht "Eintritt festlegen" in der Ticket-Row
3. Klick auf Edit → Ticket-Modal öffnet sich
4. Host wählt "Kostenlos" oder erstellt Ticket-Optionen
5. Änderungen werden sofort persistiert (kein "Alles speichern" am Ende)
6. Bei "Event veröffentlichen" ist der Eintritt bereits definiert
