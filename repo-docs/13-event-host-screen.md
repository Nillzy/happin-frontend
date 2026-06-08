# Event Host Screen (M7)

## Übersicht

Der `EventHostScreen` ist die Verwaltungsoberfläche für Event-Hosts. Er zeigt Teilnehmer-Statistiken und ermöglicht das Verwalten der Gästeliste.

**Anforderung:** M7 (Host-Übersicht) aus dem Pflichtenheft

## Route

| Route | Screen | Params |
|-------|--------|--------|
| `/event/[eventId]/manage` | EventHostScreen | `eventId: string` |

## Features

### Tab "Übersicht"

- **Statistik-Karten:** Anzahl Zusagen (Cyan), Absagen (Error), Unsicher (Secondary)
- **Kapazitäts-Balken:** Visueller Fortschritt der Auslastung (nur wenn `max_capacity` gesetzt)
- **Einladungslink:** Anzeige mit Kopieren-Button

### Tab "Gäste"

- **Filter-Chips:** Alle / Zusagen / Absagen / Unsicher
- **Gästeliste:** Checkbox, Avatar, Name, maskierte Telefonnummer, Status-Badge
- **Bulk-Entfernen:** Mehrere Gäste auswählen und mit Bestätigung entfernen

## API-Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/api/v1/events/{id}/participants` | Teilnehmerliste mit Counts |
| DELETE | `/api/v1/events/{id}/participants` | Teilnehmer entfernen |

## Host-Erkennung in EventListScreen

Events, bei denen der eingeloggte User Host ist, zeigen:
- Badge "👑 Dein Event" oben rechts
- Primary-farbiger Border
- Navigation zu `/event/{id}/manage` statt `/event/{id}`

Das Backend liefert `is_host: boolean` in der Event-Liste, wenn ein User eingeloggt ist.

## Dateien

| Datei | Zweck |
|-------|-------|
| `src/screens/EventHostScreen.tsx` | Host-Verwaltungs-Screen |
| `app/event/[eventId]/manage.tsx` | Expo Router Route |
| `src/types/host.ts` | TypeScript-Interfaces |
