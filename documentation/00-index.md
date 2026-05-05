# Documentation Index

This is the central index for all project documentation in the `documentation/` folder.

| File | Description |
|------|-------------|
| [00-index.md](./00-index.md) | This file. Central index of all documentation. |
| [01-project-overview.md](./01-project-overview.md) | High-level overview of the Happin frontend: goals, tech stack, project structure, and how it connects to the backend. |
| [DESIGN.md](./DESIGN.md) | Complete design system: color palettes, typography, spacing, elevation, shapes, and component specs for both light and dark themes. |
| [02-dark-light-mode.md](./02-dark-light-mode.md) | Dark/Light Mode Toggle: Architektur (ThemeContext), DarkLightToggle-Komponente, Integration und betroffene Dateien. |
| [03-navbar-footer.md](./03-navbar-footer.md) | Navbar, Footer und HappinLogo-Komponenten: Aufbau, Props, Integration in alle Screens. |
| [04-time-based-slogan.md](./04-time-based-slogan.md) | Zeitabhängiger Slogan auf der Startseite: Logik, Zeitbereiche und Integration. |
| [05-event-list-screen.md](./05-event-list-screen.md) | Event-Übersichtsseite: API-Client, Responsive Grid-Layout (Web: 1-5 Spalten für Mobile bis Ultrawide 21:9/4K, Mobile: FlatList), Infinite Scroll Pagination (30 Events/Page), Breakpoints, Screen-Aufbau, Navigation, Daten-Mapping. |
| [06-authentication.md](./06-authentication.md) | Passwordless Authentication via E-Mail OTP: Supabase-Setup, Auth-Flow, Token-Speicherung (Web/iOS/Android), betroffene Dateien und Sicherheitshinweise. |
| [07-event-create-screen.md](./07-event-create-screen.md) | Event-Erstellungs-Screen: Formular, Validierung, Auth-Token-Handling, Navigation. |
| [08-routing.md](./08-routing.md) | Routing: Expo Router file-based Routing, Dateistruktur, Navigation-Patterns, Web-Reload. |
| [09-date-time-picker.md](./09-date-time-picker.md) | DatePicker & TimePicker: Wiederverwendbare Kalender- und Uhrzeit-Auswahl-Komponenten (shadcn-Style). |
| [10-event-create-redesign.md](./10-event-create-redesign.md) | Event-Erstellungsflow: Draft-basierter 2-Step mit Live-Editing auf der Event-Route, Edit-Buttons, Modals, PATCH-Persistierung, Publish-Flow. |
| [11-ticket-options.md](./11-ticket-options.md) | Ticket-Optionen: Preiskategorien, TicketOption-Type, Preisanzeige-Logik, Edit-Modal, API-Integration, Draft-Flow-Integration. |
| [12-local-development-physical-devices.md](./12-local-development-physical-devices.md) | Lokale Entwicklung auf physischen Geräten (iPhone/Android): ngrok-Setup für Backend-Zugriff, Firewall-Probleme, Commands, Troubleshooting. |
| [13-event-host-screen.md](./13-event-host-screen.md) | Event Host Screen: Verwaltungsoberfläche für Hosts mit Statistiken und Gästeliste. |
| [14-account-screen.md](./14-account-screen.md) | Konto-Screen: Profilbild-Platzhalter, Anzeigename bearbeiten, E-Mail, Statistiken, Events, Tickets, Logout, Account löschen. |
| [15-bottom-navigation.md](./15-bottom-navigation.md) | Bottom Navigation Bar: 5 Haupt-Tabs (Explore, Karte, Erstellen, Events, Konto) mit Ionicons, ScreenWithNav Wrapper, Mobile-First Design. |
| [16-event-screen-redesign.md](./16-event-screen-redesign.md) | Event Detail Screen: Luma-inspiriertes Layout mit Hero Image, Action Buttons, Location Card, Host Section, Material Design 3 Farben. |
| [17-map-screen.md](./17-map-screen.md) | Kartenansicht (Tab „Karte"): MapTiler/MapLibre-Integration, plattformübergreifende MapView-Komponente, Geocoding beim Event-Erstellen, stadtbasierte Zentrierung. |
