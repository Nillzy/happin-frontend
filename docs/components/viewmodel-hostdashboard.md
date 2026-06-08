# HostDashboardViewModel

**Kategorie:** A-Software  
**Entwurfs-Entsprechung:** Präsentation – Host Dashboard (M7)  
**Implementierung:** `src/screens/EventHostScreen.tsx`, `src/screens/EventGuestsScreen.tsx`, `src/screens/MyEventsScreen.tsx`, `src/screens/HostEventsScreen.tsx`

## Beschreibung

Das `HostDashboardViewModel` stellt alle Host-spezifischen Verwaltungsfunktionen bereit. Ein Host kann seine Events verwalten, die Teilnehmerliste einsehen, Tickets scannen und Gästelisten exportieren.

[→ Im Architekturentwurf ansehen](<https://gitlab.com/groups/dhbw-se/se-tinf24b2/happin/-/wikis/Entwurf/Komponentendiagramm#:~:text=HostDashboardViewModel>)

## Workflow (M7 – Host Dashboard)

```
1. Host navigiert zu "Meine Events"
2. Liste aller erstellten Events wird angezeigt
3. Host öffnet ein Event → EventHostScreen
4. Verfügbare Aktionen:
   - Teilnehmerliste anzeigen (→ EventGuestsScreen)
   - RSVP-Antworten anzeigen (→ EventRsvpResponsesScreen)
   - Tickets scannen (→ ScanTicketScreen)
   - Event bearbeiten (→ EventEditScreen)
   - Event absagen (mit Bestätigung)
   - Gästeliste exportieren (CSV/PDF)
```

## EventHostScreen

Der zentrale Host-Verwaltungsscreen:

```tsx
// src/screens/EventHostScreen.tsx
function EventHostScreen({ eventId }) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [stats, setStats] = useState<HostStats | null>(null);

  // Zeigt: Buchungsstand, Check-in-Rate, Einnahmen
  // Aktionsbuttons für alle Host-Funktionen
}
```

## MyEventsScreen

Listet alle vom Nutzer erstellten Events auf, sortiert nach Datum. Unterscheidet zwischen vergangenen und zukünftigen Events.

## EventGuestsScreen

Zeigt die vollständige Teilnehmerliste mit:
- Name und E-Mail
- Ticket-Typ und Preis
- Check-in-Status
- Custom-Field-Antworten
- CSV/PDF-Export-Button (S8)

## Stripe Connect Integration

Hosts müssen ihr Stripe-Konto verbinden, um kostenpflichtige Tickets anbieten zu können:

```tsx
// Stripe-Onboarding-Flow
const handleConnectStripe = async () => {
  const { url } = await api.getStripeConnectUrl();
  openCheckoutUrl(url); // Weiterleitung zum Stripe-Onboarding
};
```

## Abhängigkeiten

- [`BackendAdapter`](backend-adapter.md) – `api.getHostEvents()`, `api.getParticipants()`, `api.cancelEvent()`
- [`ScanTicketViewModel`](viewmodel-scanticket.md) – Ticket-Scan
- [`Sitzungsverwaltung`](sitzungsverwaltung.md) – Authentifizierung erforderlich
