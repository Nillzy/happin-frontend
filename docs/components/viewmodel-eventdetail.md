# EventDetailViewModel

**Kategorie:** A-Software  
**Entwurfs-Entsprechung:** Präsentation – Event-Detail-Ansicht (M3, M4)  
**Implementierung:** `src/screens/EventScreen.tsx`

## Beschreibung

Das `EventDetailViewModel` zeigt alle Details eines Events: Beschreibung, Ort, Datum, Bilder, Wettervorhersage, Ticket-Optionen und den RSVP-Status des Nutzers. Es ist der umfangreichste Screen der App.

[→ Im Architekturentwurf ansehen](<https://gitlab.com/groups/dhbw-se/se-tinf24b2/happin/-/wikis/Entwurf/Komponentendiagramm#:~:text=EventDetailViewModel>)

## Workflow (M3 – Event anzeigen, M4 – Event-Details)

```
1. Navigation zu /event/[eventId]
2. Event-Details laden (inkl. Wetter, Ticket-Optionen, RSVP-Status)
3. Anzeige aller Event-Informationen
4. Host-spezifische Aktionen (Bearbeiten, Absagen) falls Nutzer = Host
5. Ticket-/RSVP-Bereich (→ RSVPViewModel, → TicketPurchaseViewModel)
```

## Wichtige UI-Komponenten

| Komponente | Datei | Beschreibung |
|---|---|---|
| `EventHero` | `components/event/EventHero.tsx` | Titelbild mit Blur-Hintergrund |
| `EventDescription` | `components/event/EventDescription.tsx` | Beschreibungstext |
| `EventInfoBlock` | `components/event/EventInfoBlock.tsx` | Datum, Ort, Kategorie |
| `WeatherBlock` | `components/event/WeatherBlock.tsx` | Wettervorhersage |
| `EventImageGallery` | `components/event/EventImageGallery.tsx` | Bildergalerie |

## State

```tsx
const [event, setEvent] = useState<EventDetail | null>(null);
const [loading, setLoading] = useState(true);
const [isHost, setIsHost] = useState(false);
```

## Host-Aktionen (nur sichtbar für Event-Host)

- Event bearbeiten → `EventEditScreen`
- Event absagen (mit Bestätigungsdialog)
- Teilnehmerliste → `EventGuestsScreen`
- RSVP-Antworten → `EventRsvpResponsesScreen`
- Tickets scannen → `ScanTicketScreen`

## Privatsphäre-Logik

Nicht angemeldete Nutzer sehen nur den Stadtteil, keine genaue Adresse. Die genaue Adresse wird erst nach dem Login angezeigt.

## Abhängigkeiten

- [`BackendAdapter`](backend-adapter.md) – `api.getEventById()`
- [`RSVPViewModel`](viewmodel-rsvp.md) – eingebetteter RSVP-Bereich
- [`TicketPurchaseViewModel`](viewmodel-ticketpurchase.md) – Ticket-Optionen
- [`Sitzungsverwaltung`](sitzungsverwaltung.md) – `useAuth()` für Host-Erkennung
