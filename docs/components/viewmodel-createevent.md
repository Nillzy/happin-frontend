# CreateEventViewModel

**Kategorie:** A-Software  
**Entwurfs-Entsprechung:** Präsentation – Event erstellen (M6)  
**Implementierung:** `src/screens/EventCreateStepOneNew.tsx`, `src/screens/EventCreateStepTwo.tsx`, `src/screens/EventEditScreen.tsx`

## Beschreibung

Das `CreateEventViewModel` führt den Host durch den mehrstufigen Event-Erstellungsprozess. Die Erstellung ist in zwei Schritte aufgeteilt, um die Komplexität zu reduzieren.

[→ Im Architekturentwurf ansehen](<https://gitlab.com/groups/dhbw-se/se-tinf24b2/happin/-/wikis/Entwurf/Komponentendiagramm#:~:text=CreateEventViewModel>)

## Workflow (M6 – Event erstellen)

```
Schritt 1: Basisdaten
├── Titel, Beschreibung
├── Datum und Uhrzeit (Start + Ende)
├── Ort (Adresse → Geocoding)
├── Kategorien auswählen
└── Titelbild (Unsplash oder eigenes Bild)

Schritt 2: Tickets & Details
├── Ticket-Optionen anlegen (kostenlos / kostenpflichtig)
├── Kapazität festlegen
├── Custom Fields für Anmeldeformular
└── Event veröffentlichen oder als Entwurf speichern
```

## Schritt 1 (`EventCreateStepOneNew.tsx`)

```tsx
function EventCreateStepOne() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState<Date>();
  const [endTime, setEndTime] = useState<Date>();
  const [location, setLocation] = useState<LocationInput>();
  const [categories, setCategories] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string>();

  const handleNext = () => {
    router.push("/events/create/step-2", { params: step1Data });
  };
}
```

## Schritt 2 (`EventCreateStepTwo.tsx`)

```tsx
function EventCreateStepTwo() {
  const [ticketOptions, setTicketOptions] = useState<TicketOptionInput[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldInput[]>([]);

  const handleSubmit = async () => {
    const event = await api.createEvent({ ...step1Data, ...step2Data });
    router.replace(`/event/${event.id}/manage`);
  };
}
```

## Event bearbeiten (`EventEditScreen.tsx`)

Der Edit-Screen lädt ein bestehendes Event und stellt dieselben Eingabefelder bereit. Änderungen werden per `PATCH /api/v1/events/{id}` übermittelt.

## UI-Komponenten

- `DatePicker.tsx` – Datum-/Zeitauswahl
- `CategorySelector.tsx` – Kategorieauswahl
- `ImageUploader.tsx` – Titelbild-Upload / Unsplash-Suche
- `ImageGalleryUploader.tsx` – Bildergalerie
- `CustomFieldForm.tsx` – Anmeldeformular-Designer

## Abhängigkeiten

- [`BackendAdapter`](backend-adapter.md) – `api.createEvent()`, `api.updateEvent()`
- `src/services/supabase.ts` – `uploadEventImage()` (Supabase Storage)
- [`Sitzungsverwaltung`](sitzungsverwaltung.md) – Authentifizierung + Stripe-Konto erforderlich
