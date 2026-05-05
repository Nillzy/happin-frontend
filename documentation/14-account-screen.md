# Konto-Screen (Account Tab)

## Übersicht

Der `AccountScreen` (`src/screens/AccountScreen.tsx`) zeigt dem eingeloggten Nutzer alle persönlichen Informationen und Aktionen auf einen Blick.

Route: `/account` → `app/account.tsx` → `src/screens/AccountScreen.tsx`

---

## Sektionen

### Profilkopf

- **Profilbild-Platzhalter** (`AvatarPlaceholder`): Kreis mit Initialen (aus Anzeigename) oder `PersonIcon`, wenn kein Name gesetzt. Hover-Overlay mit `EditIcon` (Web). Bild-Upload folgt wenn Backend `avatar_url` liefert.
- **Anzeigename** — editierbar in-place via `EditIcon` → `updateDisplayName()` → Supabase `user_metadata.display_name`
- **E-Mail** — read-only, aus Supabase Auth
- **Vor- & Nachname** — editierbar in-place; `updateName()` ruft zuerst `PATCH /api/v1/users/me/name` auf (schreibt in `person`-Tabelle), danach `auth.updateUser()` für `user_metadata`

### Übersicht (Statistiken)

Vier `StatTile`-Kacheln via `GET /api/v1/users/me/stats`:
- Events besucht, Events erstellt, Tickets, Teilnehmer

### Meine Events

- **Aktuelle & geplante Events** → `/events?period=upcoming&role=organizer`
- **Vergangene Events** → `/events?period=past&role=organizer`

### Meine Tickets

- **Alle Tickets anzeigen** → `GET /api/v1/users/me/tickets` → `Alert.alert` mit Liste

### Einstellungen

- **Mein Standort** — Stadtname editierbar in-place mit Autocomplete (`CityAutocomplete`). Zwei Speicherwege:
  - **Autocomplete-Auswahl**: Klick auf einen Vorschlag speichert sofort `name` (für Geocoding) und `displayLabel` (z. B. „Karlsruhe, BW, Deutschland") via `saveCity(name, label)`
  - **GPS-Button** (`GpsIcon`): Fragt `expo-location`-Berechtigung an, holt aktuelle Position, reverse-geocodet zu Stadt/Region/Land und speichert
  - Gespeicherte Werte werden als Kartenmittelpunkt verwendet (Tab „Karte")
  - Jede Standortänderung wird zusätzlich via `PATCH /api/v1/users/me/city` in die `person`-Tabelle geschrieben (fire-and-forget)
- **Design** — `DarkLightToggle` zum Wechseln zwischen Light/Dark Mode

### Konto

- **E-Mail-Adresse ändern** — deaktiviert (Label „Demnächst")
- **Abmelden** — `signOut()` → Redirect zu `/login`
- **Konto löschen** — `DELETE /api/v1/users/me` + `signOut()` → Redirect zu `/login`

---

## Supabase-Funktionen (`src/services/supabase.ts`)

| Funktion | Beschreibung |
|---|---|
| `getUserProfile()` | Liest `email`, `display_name`, `first_name`, `last_name`, `avatar_url` aus `auth.getUser()` |
| `updateDisplayName(name)` | Schreibt `display_name` via `auth.updateUser({ data: ... })` |
| `updateName(firstName, lastName)` | PATCH `/api/v1/users/me/name` → `person`-Tabelle, dann `auth.updateUser()` |
| `updateCity(city)` | PATCH `/api/v1/users/me/city` → `city`-Spalte in `person`-Tabelle (fire-and-forget) |
| `signOut()` | Supabase `auth.signOut()` |
| `deleteAccount()` | `DELETE /api/v1/users/me` via Backend, dann `signOut()` |

---

## Stadteinstellung (`hooks/use-user-city.ts`)

```typescript
const { city, cityLabel, saveCity, loaded } = useUserCity();
```

- Liest/schreibt zwei `AsyncStorage`-Keys:
  - `happin_user_city` — Rohname für Geocoding (z. B. `Karlsruhe`)
  - `happin_user_city_label` — Anzeigetext (z. B. `Karlsruhe, BW, Deutschland`)
- `loaded: boolean` — verhindert Render vor dem ersten AsyncStorage-Read
- `saveCity(name, label?)` — speichert beide Keys; ruft zusätzlich `updateCity()` auf um den Wert in der `person`-Tabelle zu persistieren; `saveCity('')` entfernt beide Einträge

---

## Icons (`src/components/atoms/icons.tsx`)

| Export | Verwendung |
|---|---|
| `EditIcon` | Name, Standort bearbeiten |
| `LogoutIcon` | Abmelden |
| `TrashIcon` | Konto löschen |
| `ChevronRightIcon` | Aktionszeilen-Pfeil |
| `CalendarIcon` | Meine Events |
| `TicketIcon` | Meine Tickets |
| `MailIcon` | E-Mail (deaktiviert) |
| `GpsIcon` | GPS-Standortermittlung (Happin-Pin mit Herz-Ausschnitt, `colors.primary`) |

---

## CityAutocomplete (`src/components/atoms/CityAutocomplete.tsx`)

Wiederverwendbare Eingabe-Komponente für die Stadtsuche:

- Debounced Suche (300 ms) via `searchCities()` aus `src/services/geocoding.ts`
- Zeigt Dropdown mit bis zu 6 Vorschlägen — Name links, `regionCode, country` rechts
- Klick auf Eintrag ruft sofort `onSelect(suggestion)` auf (kein OK nötig)
- Lade-Spinner während Suche läuft

Props:

```typescript
interface CityAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (suggestion: CitySuggestion) => void;
    onCancel: () => void;
    onSubmit: () => void;
    saving?: boolean;
}
```
