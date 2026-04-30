# Konto-Screen (Account Tab)

## Übersicht

Der `AccountScreen` (`src/screens/AccountScreen.tsx`) ist über den `AccountButton` in der Navbar erreichbar und zeigt dem eingeloggten Nutzer alle persönlichen Informationen und Aktionen auf einen Blick.

Route: `/account` → `app/account.tsx` → `src/screens/AccountScreen.tsx`

---

## Sektionen

### Profilkopf

Zeigt:
- **Profilbild-Platzhalter** (`AvatarPlaceholder`): Kreis mit Initialen (aus Anzeigename) oder `PersonIcon`, wenn kein Name gesetzt. Wird durch ein echtes Bild ersetzt, sobald das Backend einen `avatar_url` liefert.
- **Anzeigename** (editierbar in-place via `EditIcon`-Button)
- **E-Mail** (read-only, aus Supabase Auth)
- **Registrierter Name** (`user_metadata.full_name`, read-only, nur sichtbar wenn vorhanden)

### Übersicht (Statistiken)

Drei `StatTile`-Kacheln: **Events**, **Tickets**, **Teilnehmer**.  
Alle Werte zeigen derzeit `—` — Platzhalter für spätere Backend-Endpoints.

### Meine Events

Zwei `ActionRow`-Einträge:
- **Aktuelle & geplante Events** → `/events`
- **Vergangene Events** → `/events` (Platzhalter; eigener Filter-Screen folgt)

### Meine Tickets

- **Alle Tickets anzeigen** → Platzhalter (Ticket-Screen noch nicht implementiert)

### Konto

- **Abmelden** — `signOut()` aus Supabase, dann Redirect zu `/login`
- **Konto löschen** — `deleteAccount()` (Platzhalter, s. u.), dann Redirect zu `/login`

Beide Aktionen zeigen einen `Alert.alert`-Dialog zur Bestätigung.

---

## Profilbild-Platzhalter

`AvatarPlaceholder` ist eine reine Frontend-Komponente (kein Bild-Upload). Sie rendert:
1. Initialen aus `displayName` (max. 2 Buchstaben) auf `primaryContainer`-Hintergrund
2. Fallback: `PersonIcon`, wenn kein Name gesetzt

Sobald das Backend einen `avatar_url` im `user_metadata` liefert, kann die Komponente durch ein `<Image>` ersetzt werden — der Typ `UserProfile.avatarUrl` ist bereits vorbereitet.

---

## Account löschen — Platzhalter

`deleteAccount()` in `src/services/supabase.ts` ruft aktuell nur `signOut()` auf. Die eigentliche Löschung erfordert einen Backend-Endpoint (`DELETE /api/v1/users/me`). Sobald dieser existiert, muss `deleteAccount()` zuerst diesen Endpoint mit dem aktuellen Token aufrufen und danach abmelden.

---

## Neue Supabase-Funktionen

| Funktion | Beschreibung |
|---|---|
| `getUserProfile()` | Liest `email`, `display_name`, `full_name`, `avatar_url` aus `auth.getUser()` |
| `updateDisplayName(name)` | Schreibt `display_name` via `auth.updateUser({ data: ... })` |
| `signOut()` | Supabase `auth.signOut()` |
| `deleteAccount()` | Platzhalter — ruft `signOut()` auf |

---

## Neue Icons (`src/components/atoms/icons.tsx`)

| Export | Verwendung |
|---|---|
| `EditIcon` | Anzeigename bearbeiten |
| `LogoutIcon` | Abmelden |
| `TrashIcon` | Konto löschen |
| `ChevronRightIcon` | Aktionszeilen-Pfeil |
