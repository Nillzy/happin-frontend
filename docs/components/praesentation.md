# Präsentation

**Kategorie:** A-Software  
**Entwurfs-Entsprechung:** `<<component>> Präsentation`  
**Implementierung:** `src/screens/`

## Beschreibung

Die `Präsentation`-Schicht enthält alle **ViewModels** nach dem MVVM-Designmuster. Jedes ViewModel entspricht einem Screen der App und ist für die Darstellung und Verarbeitung von Nutzerinteraktionen zuständig. Die Schicht liegt zwischen den GUI-Frontends (Darstellung) und dem Dialogkern (Steuerungslogik).

Die `Präsentation` bietet den GUI-Frontends die Schnittstelle `PresentationEvents` (über React-Callbacks) und kommuniziert mit dem Dialogkern über `Sync` (State-Updates via React Hooks).

## Schnittstellen

| Schnittstelle | Richtung | Beschreibung |
|---|---|---|
| `PresentationEvents` | → GUI-Frontend | React-Events, Navigation-Callbacks |
| `Sync` | → Dialogkern | State-Synchronisation via `useState` / `useEffect` |

## ViewModels (Screens)

Jedes ViewModel entspricht einer eigenen Dokumentationsseite:

| ViewModel | Screen-Datei | Workflow |
|---|---|---|
| [LoginViewModel](viewmodel-login.md) | `LoginScreen.tsx` | M1 |
| [EventListViewModel](viewmodel-eventlist.md) | `EventListScreen.tsx`, `HomeScreen.tsx` | M11 |
| [EventDetailViewModel](viewmodel-eventdetail.md) | `EventScreen.tsx` | M3, M4 |
| [RSVPViewModel](viewmodel-rsvp.md) | `EventScreen.tsx` (RSVP-Bereich) | M5 |
| [TicketPurchaseViewModel](viewmodel-ticketpurchase.md) | `TicketDetailScreen.tsx` | S2 |
| [NotificationViewModel](viewmodel-notification.md) | `NotificationsScreen.tsx` | K4 |
| [HostDashboardViewModel](viewmodel-hostdashboard.md) | `EventHostScreen.tsx` | M7 |
| [CreateEventViewModel](viewmodel-createevent.md) | `EventCreateStepOneNew.tsx`, `EventCreateStepTwo.tsx` | M6 |
| [ScanTicketViewModel](viewmodel-scanticket.md) | `ScanTicketScreen.tsx` | M8 |

## MVVM-Umsetzung in React Native

In React Native gibt es kein klassisches ViewModel-Objekt. Stattdessen übernehmen die Screen-Komponenten die ViewModel-Rolle:

```tsx
// Beispiel: ViewModel-Logik direkt im Screen
function EventListScreen() {
  // Model: API-Daten
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ViewModel-Logik: Laden, Transformieren, Filtern
  useEffect(() => {
    api.getPublicEvents(filters).then(setEvents).finally(...);
  }, [filters]);

  // View: JSX-Rendering
  return <FlatList data={events} renderItem={...} />;
}
```

## Abhängigkeiten

- [`Dialogkern`](dialogkern.md) – React State und Hooks
- [`BackendAdapter`](backend-adapter.md) – Datenladen via `api.ts`
- [`Sitzungsverwaltung`](sitzungsverwaltung.md) – `useAuth()` für Auth-Status
