# Komponenten – Überblick

Das Happin-Frontend ist nach dem **Model-View-ViewModel (MVVM)**-Muster strukturiert und in der GUI-Engine zusammengefasst.

## Schichtenübersicht

```
┌──────────────────────────────────────────────────┐
│           GUI-Frontends (Plattformen)            │
│      Web          iOS          Android           │
│  (DisplayData / DefinePresentation)              │
└────────────────────┬─────────────────────────────┘
                     │ PresentationEvents
┌────────────────────▼─────────────────────────────┐
│                 Präsentation                     │
│          ViewModels (Screens)                    │
│  Login  EventList  EventDetail  RSVP  ...        │
└──────────┬──────────────────────┬────────────────┘
           │ Sync                 │ DialogEvents / CurrentData
┌──────────▼──────────┐  ┌───────▼──────────────────┐
│   Dialogkern        │  │    DialogManager          │
│ (React State/Hooks) │  │  (Expo Router _layout)    │
└─────────────────────┘  └───────┬──────────────────┘
                                 │ ManageDlg
                         ┌───────▼──────────────────┐
                         │   Sitzungssteuerung      │
                         │  (React Navigation Stack) │
                         └───────┬──────────────────┘
                                 │ ManageSsn
                         ┌───────▼──────────────────┐
                         │   Sitzungsverwaltung     │
                         │     (AuthContext)         │
                         └───────┬──────────────────┘
                                 │
                         ┌───────▼──────────────────┐
                         │    BackendAdapter        │
                         │  AuthBackend / AppBackend │
                         └──────────────────────────┘
```

## Komponentenliste

| Komponente | Kategorie | Seite |
|---|---|---|
| GUI-Frontend Web | GUI-Frontend | [→](gui-web.md) |
| GUI-Frontend iOS | GUI-Frontend | [→](gui-ios.md) |
| GUI-Frontend Android | GUI-Frontend | [→](gui-android.md) |
| Präsentation (ViewModels) | MVVM | [→](praesentation.md) |
| LoginViewModel | ViewModel | [→](viewmodel-login.md) |
| EventListViewModel | ViewModel | [→](viewmodel-eventlist.md) |
| EventDetailViewModel | ViewModel | [→](viewmodel-eventdetail.md) |
| RSVPViewModel | ViewModel | [→](viewmodel-rsvp.md) |
| TicketPurchaseViewModel | ViewModel | [→](viewmodel-ticketpurchase.md) |
| NotificationViewModel | ViewModel | [→](viewmodel-notification.md) |
| HostDashboardViewModel | ViewModel | [→](viewmodel-hostdashboard.md) |
| CreateEventViewModel | ViewModel | [→](viewmodel-createevent.md) |
| ScanTicketViewModel | ViewModel | [→](viewmodel-scanticket.md) |
| Dialogkern | Dialogkomponente | [→](dialogkern.md) |
| DialogManager | Dialogkomponente | [→](dialogmanager.md) |
| Sitzungssteuerung | Dialogkomponente | [→](sitzungssteuerung.md) |
| Sitzungsverwaltung | Dialogkomponente | [→](sitzungsverwaltung.md) |
| BackendAdapter | Adapter | [→](backend-adapter.md) |

## Software-Kategorien

- **A-Software** (grün): Eigenentwicklung – alle Screens, Contexts, Services
- **T-Software** (blau): Technisch generische Software – Expo, React Native, React Navigation
- **AT-Software** (gelb/rot): Potenziell austauschbare Fremdsoftware – Supabase Auth, MapLibre
