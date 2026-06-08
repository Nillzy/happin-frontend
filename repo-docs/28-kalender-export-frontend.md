---
title: Kalender-Export (ICS) — Frontend
created: 2026-05-07
updated: 2026-05-08
status: implemented
---

# Kalender-Export — Frontend-Integration

## Übersicht

Der Kalender-Button in der Action-Buttons-Row des EventScreens ermöglicht es
Nutzern, ein Event direkt in den nativen Gerätekalender (iOS / Android) einzutragen
bzw. als ICS-Datei herunterzuladen (Web).

**Backend-Dokumentation:** `backend/documentation/17-calendar-export.md`
**Endpoint (Web only):** `GET /api/v1/events/{event_id}/calendar.ics`

---

## Button

**Datei:** `src/screens/EventScreen.tsx`

**Position:** Action-Buttons-Row (direkt unter dem Host-Card)

| Eigenschaft | Wert |
|-------------|------|
| Icon | `Ionicons name="calendar"` |
| Handler | `handleCalendarDownload` |

---

## Logik

### Web

1. `fetch(url, { Authorization: Bearer <token> })` — token optional
2. Response als Blob lesen
3. `URL.createObjectURL(blob)` → temporäre URL
4. Unsichtbares `<a download="event-<id>.ics">` Element in DOM einfügen, klicken, entfernen
5. Object-URL widerrufen (`revokeObjectURL`)

### Native (iOS / Android)

1. `Calendar.requestCalendarPermissionsAsync()` — Berechtigung anfordern
2. Bei Ablehnung: `Alert` mit Hinweis auf Einstellungen
3. Bei Erfolg: Bestätigungs-Bottom-Sheet öffnen (`calendarModalVisible = true`)
4. Nutzer tippt "Hinzufügen":
   - iOS: `Calendar.getDefaultCalendarAsync()` → Calendar-ID
   - Android: `Calendar.getCalendarsAsync(EntityTypes.EVENT)` → erster beschreibbarer Kalender
5. `Calendar.createEventAsync(calendarId, { title, startDate, endDate, location, notes })`
6. Erfolg: `Alert` "Das Event wurde zu deinem Kalender hinzugefügt."
7. Fehler: `Alert` mit Fehlermeldung

---

## Bestätigungs-Bottom-Sheet

Inline-Modal in `EventScreen.tsx`, identisch zum RSVP-Sheet-Muster:

- Handle-Bar
- Icon + Titel "Zum Kalender hinzufügen"
- Event-Titel, Datum (formatiert), Adresse
- Button "Hinzufügen" (Primary)
- Button "Abbrechen" (Text)

---

## Abhängigkeiten

| Paket | Version | Zweck |
|-------|---------|-------|
| `expo-calendar` | ~13.0.0 | Native Kalender-API (Permissions, createEventAsync) |
| `expo-file-system/legacy` | ~19.0.22 | Weiterhin im Projekt vorhanden (andere Features) |
| `expo-sharing` | ~14.0.8 | Weiterhin im Projekt vorhanden (andere Features) |

---

## Permissions (`app.json`)

```json
["expo-calendar", {
  "calendarPermission": "Happin möchte Events in deinen Kalender eintragen.",
  "remindersPermission": "Happin möchte Erinnerungen für Events erstellen."
}]
```

Android: `READ_CALENDAR` + `WRITE_CALENDAR` werden automatisch vom Plugin gesetzt.

---

## Auth-Verhalten

Native: Kein Auth-Token erforderlich — Event-Daten kommen aus dem bereits geladenen
`event`-State, kein zusätzlicher API-Call.

Web: Auth-Token wird optional mitgesendet (wenn eingeloggt).

---

## Fehlerbehandlung

| Fall | Reaktion |
|------|----------|
| Permission verweigert | Alert "Bitte erlaube den Kalender-Zugriff in den Einstellungen" |
| Kein beschreibbarer Kalender (Android) | Alert "Kein beschreibbarer Kalender auf dem Gerät gefunden" |
| `createEventAsync` schlägt fehl | Alert "Das Event konnte nicht zum Kalender hinzugefügt werden" |
| Web: HTTP-Fehler | Alert "Kalender-Export konnte nicht heruntergeladen werden" |

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/screens/EventScreen.tsx` | `handleCalendarDownload` überarbeitet, `handleCalendarConfirm` hinzugefügt, Bestätigungs-Modal hinzugefügt |
| `app.json` | `expo-calendar` Plugin-Eintrag mit Permission-Strings |
| `package.json` | `expo-calendar` ~13.0.0 hinzugefügt |
