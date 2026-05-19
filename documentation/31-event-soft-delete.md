# Event Soft-Delete (Frontend)

## Überblick

Hosts können Events aus dem EventHostScreen löschen. Gelöschte Events bleiben für 48h als "Abgesagt" sichtbar.

## Geänderte Dateien

- `src/types/events.ts` — `EventListItem` und `EventDetailResponse` haben `is_deleted?: boolean` und `deleted_at?: string | null`
- `src/services/api.ts` — `api.deleteEvent(eventId, token)` sendet DELETE an Backend; `request<T>` behandelt 204 No Content
- `src/screens/EventHostScreen.tsx` — Delete-Button + Bestätigungs-Modal mit Pflicht-Checkbox
- `src/screens/MyEventsScreen.tsx` — "Abgesagt"-Badge bei gelöschten Events (Host- und Ticket-Karten)
- `src/screens/EventScreen.tsx` — Roter Banner oben bei `is_deleted === true`

## UX

- Delete-Button ist gesperrt (ausgegraut) wenn `starts_at - now() < 48h`
- Bestätigungsdialog erfordert Checkbox-Bestätigung
- Nach Löschung: Navigation zu `/my-events`
- Gelöschte Events: `opacity: 0.55` + rotes "Abgesagt"-Badge in Kartenlisten
- Gelöschte Events im EventScreen: roter Banner "Dieses Event wurde abgesagt"
