# DatePicker & TimePicker Komponenten

## Überblick

Wiederverwendbare Datum- und Uhrzeit-Auswahl-Komponenten im shadcn/ui-Stil. Beide Komponenten bieten ein Hybrid-Eingabemodell: Direkteingabe über die Tastatur und visuelle Auswahl über Popover/Dropdown.

## Komponenten

### DatePicker

**Pfad:** `src/components/atoms/DatePicker.tsx`

**Beschreibung:** Kalender-Popover mit Monatsansicht, Monats-/Jahresnavigation und klickbaren Tagen.

**Props:**

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|-------------|
| `value` | `string` | — | Aktueller Wert im Format `YYYY-MM-DD` |
| `onChange` | `(date: string) => void` | — | Callback bei Wertänderung |
| `placeholder` | `string` | `'Datum wählen'` | Platzhaltertext |
| `error` | `boolean` | `false` | Fehlerindikator (roter Rahmen) |
| `minDate` | `Date` | — | Frühestes wählbares Datum |

**Funktionsweise:**
- Trigger-Feld zeigt formatiertes Datum (z.B. "15. Juli 2026") oder Placeholder
- Klick auf Trigger öffnet Kalender-Popover
- Kalender zeigt Monatsansicht mit Mo-So Wochentagsheader
- Navigation: Pfeile für Monat vor/zurück
- Heutiger Tag dezent hervorgehoben (primaryContainer)
- Ausgewählter Tag mit Primary-Farbe
- Vergangene Tage (vor `minDate`) ausgegraut/disabled
- Direkteingabe: Fokussieren des Feldes ermöglicht Tastatureingabe im `YYYY-MM-DD` Format

**Web vs. Native:**
- Web (Viewport ≥ 600px): Absolut positionierter Inline-Popover unterhalb des Triggers. Der umgebende `ScrollView` und die Card brauchen `overflow: visible` damit der Popover nicht geclippt wird. Der Datum&Uhrzeit-Card bekommt `zIndex: 100`, der Sichtbarkeits-Card `zIndex: 1`.
- Alle anderen Fälle: Modal-Overlay mit zentriertem Kalender.

**Kompaktheit:**
- Tageszellen: feste Höhe 34px (statt `aspectRatio: 1`), Tagesbutton 30×30px — passt einen vollen Monat (6 Wochen) auf den Bildschirm.

---

### TimePicker

**Pfad:** `src/components/atoms/TimePicker.tsx`

**Beschreibung:** Zwei-Spalten-Dropdown mit scrollbaren Stunden- und Minutenlisten.

**Props:**

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|-------------|
| `value` | `string` | — | Aktueller Wert im Format `HH:MM` |
| `onChange` | `(time: string) => void` | — | Callback bei Wertänderung |
| `placeholder` | `string` | `'Uhrzeit'` | Platzhaltertext |
| `error` | `boolean` | `false` | Fehlerindikator (roter Rahmen) |
| `minuteStep` | `number` | `5` | Schrittweite der Minuten (5 = 00, 05, 10, ..., 55) |

**Funktionsweise:**
- Trigger-Feld zeigt aktuelle Uhrzeit oder Placeholder
- Klick öffnet Dropdown mit zwei Spalten: Stunden (00-23) und Minuten
- Stunde auswählen → Wert aktualisieren, Dropdown bleibt offen
- Minute auswählen → Wert aktualisieren, Dropdown schließt
- Direkteingabe: `HH:MM` über Tastatur möglich

---

## Verwendung

```tsx
import DatePicker from '../components/atoms/DatePicker';
import TimePicker from '../components/atoms/TimePicker';

// Basis-Verwendung
<DatePicker
    value={date}
    onChange={setDate}
    placeholder="Datum wählen"
    minDate={new Date()}
/>

<TimePicker
    value={time}
    onChange={setTime}
    placeholder="Uhrzeit"
    minuteStep={15}
/>

// Mit Fehler-Anzeige
<DatePicker
    value={date}
    onChange={setDate}
    error={!!dateError}
/>
```

## Styling

- Folgt dem bestehenden Input-Stil: `borderRadius: 12`, `borderWidth: 1`, `paddingHorizontal: 16`
- Alle Farben kommen aus `useTheme()` — keine Hardcoded-Werte
- Popover: `surfaceContainerLow` Hintergrund, `outlineVariant` Rahmen, Schatten
- Ausgewählt: `primary` Hintergrund, `onPrimary` Text
- Heute (DatePicker): `primaryContainer` Hintergrund

## Integration im EventCreateScreen

Die Felder "Beginn Datum", "Beginn Uhrzeit", "Ende Datum" und "Ende Uhrzeit" nutzen diese Komponenten anstelle von reinen TextInputs. Die Validierungslogik bleibt unverändert (`YYYY-MM-DD` und `HH:MM` Format-Check).
