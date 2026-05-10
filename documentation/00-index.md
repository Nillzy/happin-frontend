# Documentation Index

This is the central index for all project documentation in the `documentation/` folder.

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
| [CLAUDE_PROMPT_BACKEND_INTEGRATION.md](./CLAUDE_PROMPT_BACKEND_INTEGRATION.md) | **Claude-Prompt für Backend-Integration**: Priorisierte TODO-Liste aller offenen Backend-Aufgaben (Draft-Flow, Bild-Upload, Unsplash-Proxy, Permissions, MyEvents-Daten). |
| [CLAUDE_PROMPT_EVENT_CREATION_REDESIGN.md](./CLAUDE_PROMPT_EVENT_CREATION_REDESIGN.md) | Vollständiger Claude-Prompt für Event-Creation UI Redesign & Feature-Implementierung (Phasen 1-3). |
| [EVENT_CREATION_UX_ANALYSIS.md](./EVENT_CREATION_UX_ANALYSIS.md) | UX-Analyse des bestehenden Event-Creation Flows mit identifizierten Problemen und Verbesserungsvorschlägen. |
| [EVENT_CREATION_PHASE_1_IMPLEMENTATION.md](./EVENT_CREATION_PHASE_1_IMPLEMENTATION.md) | Phase 1 Implementation (P0): Titelbild-Upload, Location-Validation, Category-Chips mit Multi-Select. |
| [EVENT_CREATION_APPLE_REDESIGN.md](./EVENT_CREATION_APPLE_REDESIGN.md) | Apple-Style Redesign des Event-Creation Flows mit 2-Step (Essentials + Details), SegmentedControl, FAB Navigation, Large Typography, 16px Cards. |

## Wichtige Änderungen (Mai 2026)

### UI/UX Updates
- ✅ **Infinity Scroll** in EventListScreen (keine Pagination mehr)
- ✅ **Saved Events** System mit Like-Funktionalität (Heart-Icon)
- ✅ **Saved Events Grid**: Responsives Grid-Layout (1–5 Spalten) identisch zu Explore; Herz-Button (gefüllt) entfernt Event aus Liste
- ✅ **Gradient-Auswahl** für Event-Titelbilder (4 Vorlagen)
- ✅ **Stockbild-Vorschläge** im Titelbild-Modal: Unsplash-Suche basierend auf Eventtitel
- ✅ **Dark-Mode-Toggle** von Navbar zu Account-Screen verschoben
- ✅ **Explore Screen** ohne Überschriften, mit Suchleiste + Filter/Saved Buttons
- ✅ **Footer entfernt** in Explore & Saved Events
- ✅ **Kartenansicht** mit Event-Pins, stadtbasierter Zentrierung, Custom Map Styles, City Autocomplete + GPS-Button
- ✅ **Web Input Outline** entfernt (`outlineStyle: 'none'` auf allen TextInputs)
- ✅ **DatePicker kompakter**: Tageszellen feste Höhe 34px statt `aspectRatio: 1`
- ✅ **DatePicker/TimePicker z-index**: Inline-Popover liegt korrekt über nachfolgenden Cards (`zIndex: 100` auf Datum&Uhrzeit-Card, `overflow: visible` auf ScrollView + Card)
- ✅ **Account-Screen**: Sektionen „Meine Events" und „Meine Tickets" entfernt; GPS-Button als Happin-Pin-SVG (statt Emoji)
- ✅ **ICS-Download-Button**: "Register"-Button im EventScreen → ICS-Datei herunterladen (Web: Browser-Download, Native: Share-Sheet)

### Event-Management
- ✅ **MyEventsScreen Redesign**: Collapsible Sections, QR-Code Ticket-Cards, Split-Navigation
- ✅ **TicketDetailScreen**: Luma-style Bottom Sheet Modal mit QR-Code
- ✅ **EventHostScreen Redesign**: Keine Tabs mehr, Gästelisten als separate Seiten
- ✅ **EventGuestsScreen**: Dedizierte Seite pro Status (Zusagen/Absagen/Unsicher)

### Navigation
- ✅ **"Dein Event" Badge**: Jetzt links oben (statt rechts), ohne Emoji
- ✅ **"Zur Gast-Ansicht" Button**: Im EventHostScreen, navigiert zu normaler Event-Ansicht
- ✅ **Gästelisten**: Öffnen als separate Seiten (`/event/[id]/guests?status=...`)
- ✅ **Navbar bereinigt**: Account-Button entfernt (Konto-Tab in Bottom Nav); DarkLightToggle entfernt (im Account-Screen)
- ✅ **Responsive Navigation**: Mobile → Bottom Nav, Desktop/Tablet (≥768px Web) → Top-Navbar mit Tab-Links + „Event erstellen"-Button
- ✅ **Navbar auf Mobile unsichtbar**: Rendert `null` bei `width < 768` oder Native — kein Logo-Balken oben
- ✅ **HappinLogo in Bottom Nav**: Klein (scale 0.7, opacity 0.8) unter dem Erstellen-Button
- ✅ **Mobiler Zurück-Header**: EventCreate Step 1 & 2 zeigen auf Mobile `arrow-back` Icon + „Zurück" statt Navbar

### Backend-Integration
- ✅ **Infinity Scroll Backend-Fix**: Backend gibt jetzt Total-Count zurück (nicht nur Page-Count)
- ✅ **Gradient-ID Support**: Backend speichert `gradient_id` (0-3) für Events ohne Bilder
- ✅ **`person.city` Spalte**: Standortänderungen werden via `PATCH /api/v1/users/me/city` in die `person`-Tabelle geschrieben
