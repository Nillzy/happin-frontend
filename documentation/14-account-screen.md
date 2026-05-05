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

- **Mein Standort** — Stadtname editierbar in-place; wird in `AsyncStorage` unter `happin_user_city` gespeichert. Der gespeicherte Wert wird beim Öffnen des Karten-Tabs als Kartenmittelpunkt verwendet.

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
| `signOut()` | Supabase `auth.signOut()` |
| `deleteAccount()` | `DELETE /api/v1/users/me` via Backend, dann `signOut()` |

---

## Stadteinstellung (`hooks/use-user-city.ts`)

```typescript
const { city, saveCity, loaded } = useUserCity();
```

- Liest/schreibt `AsyncStorage`-Key `happin_user_city`
- `loaded: boolean` — verhindert Render vor dem ersten AsyncStorage-Read
- `saveCity('')` entfernt den Eintrag (kein leerer String gespeichert)

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
