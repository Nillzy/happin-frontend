# Dialogkern

**Kategorie:** A-Software (realisiert durch React-Framework)  
**Entwurfs-Entsprechung:** `<<component>> Dialogkern`  
**Implementierung:** React Hooks (`useState`, `useEffect`, `useReducer`) direkt in den Screen-Komponenten

## Beschreibung

Der `Dialogkern` ist die Komponente, die bestimmt was dargestellt wird und wie auf Benutzeraktionen reagiert wird. Er stellt der Präsentation die Schnittstellen `DialogEvents` (Informieren über Dialogaktionen) und `CurrentData` (Abfrage aktueller Dialogdaten) bereit.

!!! note "Abweichung vom Entwurf"
    Im klassischen Komponentenarchitektur-Entwurf ist der Dialogkern eine eigenständige Komponente. In der React-Native-Implementierung ist diese Verantwortlichkeit **direkt in den Screen-Komponenten integriert** – React's reaktives Programmiermodell (Hooks, State-Management) übernimmt die Rolle des Dialogkerns. Es gibt kein separates `Dialogkern`-Modul.

## Schnittstellen

| Schnittstelle | Beschreibung | Realisierung |
|---|---|---|
| `DialogEvents` | Informiert Präsentation über Aktionen | React-Callbacks (`onPress`, `onChange`, etc.) |
| `CurrentData` | Liefert aktuelle Dialogdaten | React `useState` / `useSelector` |

## React-Äquivalente

### DialogEvents → React-Event-Callbacks

```tsx
// "DialogEvents" in React: Callback-Props und Handler
const handleRsvpPress = () => {         // DialogEvent: RSVP-Aktion
  setRsvpStatus("attending");
  api.rsvpEvent(eventId, "attending");
};

<Button onPress={handleRsvpPress} />    // Bindung an GUI-Frontend
```

### CurrentData → React State

```tsx
// "CurrentData" in React: useState als Datenhaltung
const [event, setEvent] = useState<EventDetail | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

### Sync → useEffect

```tsx
// "Sync" mit Dialogkern: useEffect für Datensynchronisation
useEffect(() => {
  api.getEventById(eventId).then(setEvent).catch(setError);
}, [eventId]);
```

## Zustandsautomaten

Komplexere Dialoge (z. B. Ticketkauf-Flow) verwenden `useReducer` für explizite Zustandsautomaten:

```tsx
type CheckoutState = "idle" | "loading" | "stripe" | "success" | "error";

const [checkoutState, dispatch] = useReducer(checkoutReducer, "idle");
```

## Abhängigkeiten

- React 19 (T-Software) – Hooks, State-Management
- [`Präsentation`](praesentation.md) – Screen-Komponenten als Träger
