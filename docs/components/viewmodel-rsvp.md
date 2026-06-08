# RSVPViewModel

**Kategorie:** A-Software  
**Entwurfs-Entsprechung:** Präsentation – RSVP (M5)  
**Implementierung:** `src/screens/EventScreen.tsx` (RSVP-Bereich), `src/screens/EventRsvpResponsesScreen.tsx`

## Beschreibung

Das `RSVPViewModel` verwaltet die Zu- und Absage eines Nutzers zu einem Event. Es implementiert den Workflow M5 (RSVP) und ist direkt in den `EventScreen` eingebettet.

[→ Im Architekturentwurf ansehen](<https://gitlab.com/groups/dhbw-se/se-tinf24b2/happin/-/wikis/Entwurf/Komponentendiagramm#:~:text=S11%20(Meldefunktion)-,RSVPViewModel,-M5%20(RSVP%2DFormular>)

## Workflow (M5)

```
1. Nutzer öffnet Event-Detailseite
2. RSVPViewModel lädt aktuellen RSVP-Status des Nutzers
3. Nutzer klickt "Zusagen" oder "Absagen"
4. API-Aufruf → RSVP-Status aktualisieren
5. UI aktualisiert sich (Bestätigung oder Fehler)
6. Falls Event voll: Wartelisten-Button wird angezeigt
```

## RSVP-Zustände

| Zustand | Beschreibung |
|---|---|
| `none` | Nutzer hat noch nicht reagiert |
| `attending` | Nutzer hat zugesagt |
| `not_attending` | Nutzer hat abgesagt |
| `waitlisted` | Nutzer steht auf der Warteliste |

## Implementierung

```tsx
// In EventScreen.tsx
const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>("none");

const handleRsvp = async (status: "attending" | "not_attending") => {
  await api.rsvpEvent(event.id, status);
  setRsvpStatus(status);
};

const handleJoinWaitlist = async () => {
  await api.joinWaitlist(event.id);
  setRsvpStatus("waitlisted");
};
```

## Host-Ansicht: RSVP-Antworten

`EventRsvpResponsesScreen.tsx` zeigt dem Event-Host eine Übersicht aller RSVP-Zusagen und -Absagen:

- Anzahl Zusagen / Absagen
- Liste aller Teilnehmer mit RSVP-Status
- Filtermöglichkeit nach Status

## Abhängigkeiten

- [`BackendAdapter`](backend-adapter.md) – `api.rsvpEvent()`, `api.joinWaitlist()`
- [`Sitzungsverwaltung`](sitzungsverwaltung.md) – `useAuth()` (nur für angemeldete Nutzer)
