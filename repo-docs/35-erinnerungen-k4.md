# K4 — Erinnerungen vor Eventbeginn

Implementiert die Anforderung **K4** aus dem Pflichtenheft: Gäste können in den
App-Einstellungen Erinnerungen aktivieren, die sie vor Eventbeginn benachrichtigen.
Vorlaufzeit individuell einstellbar (Default 1 h).

## Architektur (Hybrid)

| Plattform | Mechanismus | Quelle der Notification | Funktioniert ohne offene App? |
|-----------|-------------|--------------------------|--------------------------------|
| iOS / Android | `expo-notifications` lokal | Gerät selbst | Ja |
| Web (Browser) | Web Push (VAPID) + Backend-Scheduler | Backend → pywebpush → OS-Notification-Service | Ja, auch bei geschlossenem Tab |

Die Native-Variante schedult Notifications direkt auf dem Gerät. Das Web nutzt
einen Service Worker (`public/sw.js`) und eine `PushSubscription`, die im
Backend gespeichert wird; dort sendet ein APScheduler-Job (60-Sekunden-Tick)
fällige Pushes via `pywebpush`.

## Daten-Fluss

```
AccountScreen → ReminderSettingsContext → AsyncStorage
                                       → Backend (reminder_preference)
                                       → Native: syncReminders() schedult lokal
                                       → Web: registerWebPush() speichert Subscription

Backend-Scheduler (alle 60s):
  reminder_preference (enabled=true)
    × event_participation (status=Accepted)
    × event (starts_at - lead_time ∈ [now, now+60s])
    × NICHT in reminder_sent
  → web_push_subscription pro Person → pywebpush → Browser → Service Worker → Notification
```

## Frontend-Bausteine

| Datei | Rolle |
|-------|-------|
| `src/types/reminders.ts` | `ReminderSettings`, Presets (15 m / 30 m / 1 h / 2 h / 1 d) |
| `src/contexts/ReminderSettingsContext.tsx` | State + AsyncStorage (`@happin:reminder_settings`) + Backend-Sync |
| `src/services/reminders.ts` | Permission, Native-Scheduling, Web-Subscription |
| `src/components/atoms/ReminderSettingsSection.tsx` | UI-Sektion im AccountScreen |
| `src/screens/AccountScreen.tsx` | Einbindung der Sektion |
| `src/screens/EventScreen.tsx` | Sync nach RSVP-Wechsel |
| `src/screens/MyEventsScreen.tsx` | Sync nach Liste-Reload |
| `app/_layout.tsx` | `ReminderSettingsProvider` |
| `public/sw.js` | Service Worker (push + notificationclick) |
| `app.json` | `expo-notifications`-Plugin |

### Sync-Trigger
- App-Start → automatisch beim Mount des Providers
- Toggle / Vorlaufzeit ändern → `persist()` im Context
- RSVP-Wechsel im EventScreen → `refreshReminders()`
- MyEventsScreen-Reload → `refreshReminders()`

### UI
Sektion "Erinnerungen" im AccountScreen zwischen "Mein Standort" und "Design":
Switch-Toggle, fünf Preset-Chips + "Benutzerdefiniert"-Chip (zeigt Number-Input).
Bei verweigerter Permission wird ein roter Hinweistext eingeblendet.

## Backend-Bausteine

| Datei | Rolle |
|-------|-------|
| `supabase/migrations/20260521150000_add_reminder_feature.sql` | Tabellen + RLS |
| `app/schemas/reminder.py` | Pydantic-Schemas |
| `app/services/reminder_service.py` | DB-Logik (Prefs + Subscriptions) |
| `app/services/reminder_scheduler.py` | APScheduler-Job + pywebpush |
| `app/api/v1/reminders.py` | 5 REST-Endpoints |
| `app/main.py` | Lifespan-Hooks für Scheduler |
| `app/core/config.py` | VAPID-Keys + Scheduler-Settings |

### Tabellen
- `reminder_preference (person_id PK, enabled, lead_time_minutes 1..10080, updated_at)`
- `web_push_subscription (UUID PK, person_id FK, endpoint, p256dh_key, auth_key, user_agent, UNIQUE(person_id, endpoint))`
- `reminder_sent (event_id, person_id PK, sent_at)` — Idempotenz

### REST-Endpoints
- `GET  /api/v1/users/me/reminder-preferences`
- `PATCH /api/v1/users/me/reminder-preferences`
- `POST /api/v1/users/me/web-push-subscriptions`
- `DELETE /api/v1/users/me/web-push-subscriptions`
- `GET  /api/v1/users/vapid-public-key` (öffentlich)

### Scheduler
`AsyncIOScheduler` mit `IntervalTrigger(seconds=60)`. Sucht je Pref alle Events
mit `Accepted`-Participation, deren Start in `[now+lead, now+60s+lead]` liegt
und die noch keinen `reminder_sent`-Eintrag haben. Sendet pro Subscription via
`pywebpush.webpush(...)`. Bei `404`/`410` wird die Subscription gelöscht.

## VAPID-Keys
Einmalig generieren:
```bash
python -c "from py_vapid import Vapid01; v=Vapid01(); v.generate_keys(); \
  print('priv:', v.private_pem().decode()); print('pub:', v.public_key)"
```
In `.env` setzen: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

## Bekannte Edge-Cases
- **Doppelte Notifications** für User mit App + Browser parallel — toleriert.
- **Soft-deletete Events**: Web filtert via `deleted_at IS NULL`; Native Best-Effort
  (geplante Notification kann noch feuern, falls Gerät offline war).
- **Permission denied**: UI zeigt Hinweis, Toggle bleibt off.
- **Lead-Time länger als Zeit-bis-Event**: Native skippt; Web sendet nicht
  (Filter im Scheduler).
