# Event-Erstellungs-Screen

## Überblick

Der `EventCreateScreen` ermöglicht Nutzern, neue Events über ein Formular zu erstellen. Er deckt die Wiki-Anforderungen M2 (Event erstellen) und S5 (Formularvalidierung) ab.

## Screen-Aufbau

**Datei:** `src/screens/EventCreateScreen.tsx`

**Konventionen:** Folgt den gleichen Patterns wie alle anderen Screens:
- `useTheme()` für Farben — keine hardcoded Hex-Werte
- `StyleSheet.create` für Styles
- Deutsche UI-Texte
- Navbar oben, Footer im ScrollView

### Formularfelder

| Feld | Typ | Required | Validierung |
|------|-----|----------|-------------|
| Titel | TextInput | Ja | Nicht leer, max 255 Zeichen |
| Beschreibung | TextInput multiline | Nein | — |
| Beginn Datum | TextInput (YYYY-MM-DD) | Ja | Format, muss in der Zukunft liegen |
| Beginn Uhrzeit | TextInput (HH:MM) | Ja | Format |
| Ende Datum | TextInput (YYYY-MM-DD) | Nein | Format |
| Ende Uhrzeit | TextInput (HH:MM) | Nein | Format |
| Kategorie | TextInput | Nein | — |
| Max. Teilnehmer | TextInput numeric | Nein | — |
| Sichtbarkeit | Switch | Ja | — |
| Stadt | TextInput | Ja | Nicht leer |
| Straße, Nr., PLZ, Land | TextInput | Nein | — |

### Öffentlich/Privat-Toggle

- **Öffentlich** (default): "Jeder kann dein Event sehen und teilnehmen"
- **Privat**: "Nur Personen mit Einladungslink können teilnehmen"

Der `is_public`-Boolean wird direkt an die API gesendet. Die invitation_link-Generierung passiert im Backend.

### State-Management

Rein lokaler State (kein globaler Store):
- `form: FormData` — alle Formularwerte
- `errors: FormErrors` — Validierungsfehler pro Feld
- `submitting: boolean` — Loading-State während API-Call
- `submitError: string | null` — Fehlermeldung vom Server

### Client-seitige Validierung (S5)

Fehler werden unter dem jeweiligen Feld in `colors.error` angezeigt. Die Validierung läuft vor dem API-Call — nur wenn alles gültig ist, wird der Request gesendet.

## API-Integration

### Auth-Token-Handling

Der `createEvent`-Aufruf in `src/services/api.ts` erwartet einen Bearer Token als Parameter:

```typescript
api.createEvent(data: EventCreateRequest, token: string)
```

Der Token wird über `getSession()` aus `src/services/supabase.ts` abgerufen. Diese Funktion liest die aktive Supabase-Session — auf Web über Cookies, auf Native über SecureStore. Falls keine Session existiert (Token ist `null`), wird der Nutzer zum `LoginScreen` weitergeleitet.

```typescript
const token = await getSession();
if (!token) {
    navigation.navigate('Login');
    return;
}
const result = await api.createEvent(payload, token);
```

### Request-Mapping

Das Frontend-Formular wird auf `EventCreateRequest` gemappt:
- Beginn Datum + Uhrzeit → `starts_at` als ISO-String (`${date}T${time}:00`)
- Ende Datum + Uhrzeit → `ends_at` als ISO-String (optional, nur wenn beide ausgefüllt)
- Leere optionale Felder → `undefined` (werden im JSON-Body weggelassen)
- Location → verschachteltes `LocationCreate`-Objekt

## Navigation

- **Route:** `EventCreate` in `RootNavigator.tsx`
- **Deep-Link:** `/events/create` in `App.tsx`
- **Einstieg:** FAB (+) Button auf dem `EventListScreen`
- **Nach Erfolg:** Navigation zu `Event` Screen mit der neuen `eventId`

## FAB auf EventListScreen

Ein Floating Action Button (FAB) wurde zu `EventListScreen.tsx` hinzugefügt:
- Position: unten rechts (absolute), 56x56px
- Border-Radius: 16px (Material Design 3 FAB-Shape)
- Navigiert zu `EventCreate`
- Immer sichtbar (Auth-Guard kommt mit M1-Integration)
