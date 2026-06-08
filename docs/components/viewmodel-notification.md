# NotificationViewModel

**Kategorie:** A-Software  
**Entwurfs-Entsprechung:** Präsentation – Benachrichtigungen (K4)  
**Implementierung:** `src/screens/NotificationsScreen.tsx`, `src/screens/DevicesScreen.tsx`, `src/contexts/NotificationsContext.tsx`, `src/contexts/ReminderSettingsContext.tsx`

## Beschreibung

Das `NotificationViewModel` verwaltet In-App-Benachrichtigungen und Push-Erinnerungen. Es implementiert den Workflow K4 (Erinnerungen) und zeigt alle Benachrichtigungen des Nutzers an.

[→ Im Architekturentwurf ansehen](<https://gitlab.com/groups/dhbw-se/se-tinf24b2/happin/-/wikis/Entwurf/Komponentendiagramm#:~:text=NotificationViewModel>)

## Workflow (K4 – Erinnerungen)

```
1. Nutzer öffnet Event-Detailseite
2. "Erinnerung setzen"-Button → ReminderSettingsContext
3. Nutzer wählt Erinnerungszeitpunkt (1h, 1d, 1w vorher)
4. Push-Subscription wird registriert (api.subscribeReminder)
5. Zum gewählten Zeitpunkt: Backend schickt Push-Benachrichtigung
6. Nutzer öffnet Benachrichtigung → App öffnet Event
```

## NotificationsScreen

Zeigt alle In-App-Benachrichtigungen chronologisch:

```tsx
function NotificationsScreen() {
  const { notifications, unreadCount } = useNotifications();

  // Benachrichtigungen laden und als gelesen markieren
  useEffect(() => {
    api.getNotifications().then(setNotifications);
    api.markAllNotificationsRead();
  }, []);
}
```

## NotificationsContext

Verwaltet den Ungelesen-Zähler mit 60-Sekunden-Polling:

```tsx
// src/contexts/NotificationsContext.tsx
const NotificationsProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, []);
};
```

## DevicesScreen

Zeigt alle registrierten Push-Geräte des Nutzers und ermöglicht deren Verwaltung (Löschen alter Geräte).

## Push-Benachrichtigungstypen

| Typ | Auslöser |
|---|---|
| Event-Erinnerung | Zeitgesteuert (APScheduler im Backend) |
| Wartelisten-Benachrichtigung | Platz frei geworden |
| Event-Absage | Host hat Event abgesagt |

## Abhängigkeiten

- [`BackendAdapter`](backend-adapter.md) – `api.getNotifications()`, `api.subscribeReminder()`
- `src/services/reminders.ts` – Web Push API (Browser)
- `src/services/expoPush.ts` – Expo Push Token (native Apps)
- `src/contexts/NotificationsContext.tsx` – Ungelesen-Zähler
