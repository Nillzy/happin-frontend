# Documentation Index

This is the central index for all project documentation in the `repo-docs/` folder.

> **Note:** This repository has two documentation folders. **`repo-docs/`** (this folder) contains implementation-level documentation and serves as a working aid during development. **`docs/`** is a separate MkDocs site that describes the **architecture** of the frontend for stakeholders — it does not explain the repo itself. See [`34-documentation-concept.md`](./34-documentation-concept.md) for details.

| File | Description |
|------|-------------|
| [00-index.md](./00-index.md) | This file. Central index of all documentation. |
| [01-project-overview.md](./01-project-overview.md) | High-level overview of the Happin frontend: goals, tech stack, project structure, and how it connects to the backend. |
| [DESIGN.md](./DESIGN.md) | Complete design system: color palettes, typography, spacing, elevation, shapes, and component specs for both light and dark themes. |
| [02-dark-light-mode.md](./02-dark-light-mode.md) | Dark/Light Mode Toggle: Architektur (ThemeContext), DarkLightToggle-Komponente, Integration (jetzt im Account-Screen statt Navbar). |
| [03-navbar-footer.md](./03-navbar-footer.md) | Navbar, Footer und HappinLogo-Komponenten: Aufbau, Props, Integration in alle Screens. Navbar zeigt jetzt nur Logo (links) und Account-Button (rechts), kein Dark-Mode-Toggle mehr. |
| [04-time-based-slogan.md](./04-time-based-slogan.md) | Zeitabhängiger Slogan auf der Startseite: Logik, Zeitbereiche und Integration. |
| [05-event-list-screen.md](./05-event-list-screen.md) | Event-Übersichtsseite (Explore): API-Client, Responsive Grid-Layout (Web: 1-5 Spalten), **Infinity Scroll** (statt Pagination), Suchleiste mit Filter & Saved Events Buttons, Heart-Icon für Like-Funktionalität, **Footer entfernt**. |
| [06-authentication.md](./06-authentication.md) | Passwordless Authentication via E-Mail OTP: Supabase-Setup, Auth-Flow, Token-Speicherung (Web/iOS/Android), betroffene Dateien und Sicherheitshinweise. |
| [07-event-create-screen.md](./07-event-create-screen.md) | Event-Erstellungs-Screen: Formular, Validierung, Auth-Token-Handling, Navigation. |
| [08-routing.md](./08-routing.md) | Routing: Expo Router file-based Routing, Dateistruktur, Navigation-Patterns, Web-Reload. |
| [09-date-time-picker.md](./09-date-time-picker.md) | DatePicker & TimePicker: Wiederverwendbare Kalender- und Uhrzeit-Auswahl-Komponenten (shadcn-Style). |
| [10-event-create-redesign.md](./10-event-create-redesign.md) | Event-Erstellungsflow: Draft-basierter 2-Step mit Live-Editing auf der Event-Route, Edit-Buttons, Modals, PATCH-Persistierung, Publish-Flow. |
| [11-ticket-options.md](./11-ticket-options.md) | Ticket-Optionen: Preiskategorien, TicketOption-Type, Preisanzeige-Logik, Edit-Modal, API-Integration, Draft-Flow-Integration. |
| [12-local-development-physical-devices.md](./12-local-development-physical-devices.md) | Lokale Entwicklung auf physischen Geräten (iPhone/Android): ngrok-Setup für Backend-Zugriff, Firewall-Probleme, Commands, Troubleshooting. |
| [13-event-host-screen.md](./13-event-host-screen.md) | Event Host Screen: Verwaltungsoberfläche für Hosts mit Statistiken und Gästeliste. **VERALTET** - siehe 24-event-host-redesign-guest-navigation.md. |
| [14-account-screen.md](./14-account-screen.md) | Konto-Screen: Profilbild-Platzhalter, Anzeigename bearbeiten, E-Mail, Statistiken, Events, Tickets, Standort (AsyncStorage + `person.city` im Backend), Dark-Mode-Toggle, Logout, Account löschen. |
| [15-bottom-navigation.md](./15-bottom-navigation.md) | Bottom Navigation Bar: 5 Haupt-Tabs (Explore, Karte, Erstellen, Events, Konto) mit Ionicons, ScreenWithNav Wrapper, Mobile-First Design. |
| [16-event-screen-redesign.md](./16-event-screen-redesign.md) | Event Detail Screen: Luma-inspiriertes Layout mit Hero Image, Action Buttons (inkl. ICS-Download), Location Card, Host Section, Material Design 3 Farben. |
| [17-map-screen.md](./17-map-screen.md) | Kartenansicht (Tab „Karte"): MapTiler/MapLibre-Integration, plattformübergreifende MapView-Komponente, Geocoding beim Event-Erstellen, stadtbasierte Zentrierung, Custom Map Styles, City Autocomplete. |
| [17-event-creation-apple-style-final.md](./17-event-creation-apple-style-final.md) | **Event Creation - Apple-Style Redesign (Final)**: Komplette Dokumentation des 2-Step Flows (Essentials + Details), SegmentedControl, ImageGalleryUploader, CategorySelector (Eventbrite-style), Full-width Buttons, Validation, Components, Migration Notes. **Aktualisiert mit Gradient-Auswahl** (siehe 23-gradient-selection.md). |
| [18-event-detail-categories-gallery.md](./18-event-detail-categories-gallery.md) | **Event Detail - Kategorien & Galerie**: Integration von Kategorien-Chips und Bildergalerie in Event Detail Screen, EventImageGallery Component, Design-Entscheidungen, Material Design 3 Consistency. |
| [20-map-screen-simple.md](./20-map-screen-simple.md) | **MapScreen - Einfache Kartenansicht**: Basis-Implementation mit MapTiler SDK, nur Zoom/Pan, keine Event-Marker, keine Interaktionen, Light/Dark Mode Support. |
| [21-my-events-screen.md](./21-my-events-screen.md) | **MyEventsScreen - Event-Verwaltung**: Collapsible Sections (statt Filter-Chips), Ticket-Cards mit QR-Code & Split-Navigation, TicketDetailScreen Modal, Host-Cards, Badge-Counts, Empty States. |
| [22-saved-events-like-functionality.md](./22-saved-events-like-functionality.md) | **Saved Events & Like-Funktionalität**: SavedEventsContext (AsyncStorage), Heart-Icon auf Event-Cards, SavedEventsScreen, Navigation von Explore, Persistierung, Performance-Optimierungen. |
| [23-gradient-selection.md](./23-gradient-selection.md) | **Gradient-Auswahl für Event-Titelbilder**: 4 vordefinierte Gradients, ImageSelectionModal (Bottom Sheet), Integration in EventCreateStepTwo, Backend-Integration (gradient_id), Display-Logik. |
| [24-event-host-redesign-guest-navigation.md](./24-event-host-redesign-guest-navigation.md) | **Event Host Screen Redesign**: Tab-Navigation entfernt, Gästelisten als separate Seiten (/event/[id]/guests?status=...), EventGuestsScreen, "Zur Gast-Ansicht" Button, Statistik-Cards anklickbar. |
| [25-web-input-styling.md](./25-web-input-styling.md) | **Web Input Styling**: `outlineStyle: 'none'` auf allen TextInputs — entfernt den blauen Browser-Fokusrahmen, eigener Fokus-State via `borderColor`. |
| [26-event-edit-screen-redesign.md](./26-event-edit-screen-redesign.md) | **Event Edit Screen Redesign**: Draft-basierter Erstellungsflow (Step 1 → Entwurf → EventEditScreen), generische Edit-Seite mit Live-Vorschau + Edit-Drawers, Ticket-Konfiguration, Backend-Anforderungen. |
| [27-stock-image-suggestions.md](./27-stock-image-suggestions.md) | **Stockbild-Vorschläge**: Thematische Unsplash-Bilder im Titelbild-Modal basierend auf Eventtitel, Keyword-Extraktion, Fallback-Modus, Backend-Proxy-TODOs. |
| [28-android-bottom-sheet-gestures.md](./28-android-bottom-sheet-gestures.md) | **Android Bottom Sheet & Gesture Patterns**: Korrekte Implementierung von Swipe-to-Dismiss Sheets (Animated.View + PanResponder statt Modal), ScrollView-Dismiss, ConfirmModal statt Alert.alert, Ref-Pattern für Closures. |
| [29-kalender-export-frontend.md](./28-kalender-export-frontend.md) | **Kalender-Export (ICS) Frontend**: ICS-Download-Button im EventScreen, Platform-Split Web/Native (expo-file-system + expo-sharing), Auth-Token-Handling, Fehlerbehandlung. |
| [30-google-wallet-frontend.md](./29-google-wallet-frontend.md) | **Google Wallet Integration Frontend**: `getWalletUrl` in api.ts, Handler im TicketDetailScreen, Platform-Split (nur Android + Web), Fehlerbehandlung. |
| [30-explore-filter.md](./30-explore-filter.md) | **Explore Page: Filter UI** — FilterModal component, filter categories (Zeitraum, Kategorie, Standort, Kostenlos), state management, badge indicator. |
| [31-event-soft-delete.md](31-event-soft-delete.md) | Event Soft-Delete Frontend: Delete-Button im EventHostScreen, Bestätigungsmodal, "Abgesagt"-Badge, roter Banner. |
| [32-event-branding.md](./32-event-branding.md) | **Event-Branding**: Individuelle Primär-/Sekundärfarbe + 8 Gradient-Vorlagen, Design-Drawer im EventEditScreen, Live-Vorschau, Backend-Felder `accent_color_primary`/`accent_color_secondary`. |
| [33-erinnerungen-k4.md](./33-erinnerungen-k4.md) | **Erinnerungen (K4)**: Hybrid-Push (Native lokal via expo-notifications + Web Push via Service Worker / Backend-Scheduler), Settings-Sektion im AccountScreen, Presets + Custom Lead-Time. |
| [34-documentation-concept.md](./34-documentation-concept.md) | **Dokumentationskonzept**: Drei Dokus (`repo-docs/`, `docs/` via MkDocs unter `/docs`, Backend-Swagger unter `/api/docs`), Zielgruppen, Konventionen, `EXPO_PUBLIC_DEBUG=true` als Voraussetzung. |
| [35-traceability.md](./35-traceability.md) | **Traceability-Konzept**: Rückreferenzen Code → Architekturentwurf → Pflichtenheft → Lastenheft, Mx/Sx/Kx-IDs, URL-Fragment-Anchor-Pattern für GitLab-Wiki-Links. |
