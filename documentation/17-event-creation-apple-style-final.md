# Event Creation - Apple-Style Redesign (Final Implementation)

**Status**: ✅ Implemented  
**Datum**: 2026-05-05  
**Typ**: Complete UI/UX Redesign  
**Betroffene Screens**: Event Creation Flow (Step 1 & 2)

---

## Übersicht

Komplette Überarbeitung des Event-Creation Flows mit modernem **Apple-Style Design**. Der alte 2-Step Flow wurde durch einen neuen, minimalistischen Flow ersetzt, der sich am Design der Event Detail Screens orientiert und **Material Design 3** Farben verwendet.

### Design-Prinzipien

- **Apple-Style**: Large Typography, minimal UI, viel Whitespace
- **Luma-inspired**: Clean cards, subtle backgrounds, fokussiert auf Content
- **Material Design 3**: Alle Farben via `useTheme()` hook
- **8px Spacing-System**: Konsistente Abstände (12px, 16px, 24px, 32px)
- **Smooth Corners**: 16px borderRadius für Cards, 9999px für Buttons
- **Minimale Borders**: backgroundColor für Trennung, keine harten Linien

---

## Flow-Struktur

### Alte Struktur (deprecated)
- **Step 1**: `EventCreateStepOne.tsx` → Alle Felder in einem Schritt
- **Step 2**: `EventCreatePreview.tsx` → Preview mit Edit-Modals

### Neue Struktur (current)
- **Step 1**: `EventCreateStepOneNew.tsx` → **Nur Essentials** (Titel, Datum/Zeit, Public/Private)
- **Step 2**: `EventCreateStepTwo.tsx` → **Alle Details** (Bild, Beschreibung, Kategorien, Location, etc.)

### Routing
- Step 1: `/events/create` → zeigt `EventCreateStepOneNew`
- Step 2: `/events/create/step-2` → zeigt `EventCreateStepTwo`
- Data Transfer: URL params (`title`, `date`, `time`, `isPublic`)

---

## Step 1: Essentials (EventCreateStepOneNew.tsx)

### Felder
1. **Event-Titel** (required)
   - Large input (fontSize 20px)
   - Placeholder: "z.B. Sommerparty im Park"
   - Max length: 255 Zeichen

2. **Datum & Uhrzeit** (required)
   - DatePicker + TimePicker side-by-side
   - Validation: Muss in der Zukunft liegen
   - Format: TT.MM.JJJJ + HH:MM

3. **Sichtbarkeit** (required)
   - iOS-Style Segmented Control
   - Optionen: "Öffentlich" / "Privat"
   - Default: "Öffentlich"

### UI-Komponenten
- **SegmentedControl** (`components/atoms/SegmentedControl.tsx`)
  - iOS-style toggle für Public/Private
  - Selected: `surface` background mit shadow
  - Unselected: transparent
  - borderRadius: 12px container, 8px segments

- **Navigation Button** (bottom)
  - Full-width "Weiter" Button
  - Pill-shaped (borderRadius: 9999px)
  - minHeight: 48px
  - Disabled: `surfaceContainer` background
  - Active: `primary` background

### Layout
```
┌─────────────────────────────────┐
│ Navbar (← Zurück)               │
├─────────────────────────────────┤
│                                 │
│  Event erstellen                │  ← 28px bold
│  Schritt 1 von 2                │  ← 13px uppercase
│                                 │
│  ╭───────────────────────────╮  │
│  │ Titel                     │  │
│  │ Event-Name ___________    │  │ ← 20px input
│  ╰───────────────────────────╯  │
│                                 │
│  ╭───────────────────────────╮  │
│  │ Datum & Uhrzeit           │  │
│  │ [Datum]    [Zeit]         │  │
│  ╰───────────────────────────╯  │
│                                 │
│  ╭───────────────────────────╮  │
│  │ Sichtbarkeit              │  │
│  │ [Öffentlich] [Privat]     │  │ ← Segmented Control
│  ╰───────────────────────────╯  │
│                                 │
│  ┌───────────────────────────┐  │
│  │        Weiter             │  │ ← Full-width button
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Validation
- **Title**: Nicht leer
- **Date**: Nicht leer, muss in Zukunft liegen
- **Time**: Nicht leer
- Button disabled bis alle Felder valid

---

## Step 2: Details (EventCreateStepTwo.tsx)

### Felder

#### Required Fields
1. **Titelbild** (ImageUploader)
   - Kamera oder Galerie
   - Aspect ratio: 4:3
   - Quality: 0.8
   - Validation: Error wenn leer

2. **Stadt** (TextInput)
   - Required für Location
   - Validation: Error wenn leer

#### Optional Fields
3. **Beschreibung** (Textarea)
   - Multi-line input
   - Placeholder: "Beschreibe dein Event..."
   - Min height: 100px

4. **Kategorien** (CategorySelector)
   - Eventbrite-style: ohne Emojis, untereinander
   - Multi-select (max 5)
   - 9 initial, rest expandable
   - Centered layout

5. **Location Details**
   - Straße + Hausnummer (row)
   - PLZ + Land (row)
   - Default Land: "Deutschland"

6. **Max. Teilnehmer** (Number Input)
   - Optional capacity limit
   - Number-pad keyboard

7. **Enddatum/-zeit** (DatePicker + TimePicker)
   - Optional end time
   - Side-by-side inputs

8. **Bildergalerie** (ImageGalleryUploader)
   - Bumble/Tinder-style horizontal scroll
   - Max 6 Bilder
   - 140x180px cards
   - Add/Remove buttons
   - Number badges

### UI-Komponenten

#### CategorySelector (überarbeitet)
- **Design**: Eventbrite-style (keine Emojis)
- **Layout**: Vertical wrap, zentriert
- **Chips**: borderRadius 24px, borderWidth 2px
- **Selected**: Black background, white text
- **Unselected**: White background, black text
- **Expand**: "11 weitere Kategorien anzeigen" button mit chevron
- **Initial**: 9 Kategorien (ca. 3 Reihen)
- **Total**: 20 Kategorien

#### ImageGalleryUploader (neu)
- **Design**: Bumble/Tinder-style
- **Layout**: Horizontal ScrollView
- **Cards**: 140x180px, borderRadius 16px
- **Add Button**: Dashed border, immer als erstes Element
- **Remove Button**: X icon, top-right corner
- **Number Badge**: 1,2,3... bottom-left corner
- **Counter**: "X/6" in header
- **Max Images**: 6

### Navigation Button
- Full-width "Erstellen" Button (bottom)
- Loading state: ActivityIndicator
- Disabled: wenn Pflichtfelder (Bild, Stadt) fehlen

### Layout
```
┌─────────────────────────────────┐
│ Navbar (← Zurück)               │
├─────────────────────────────────┤
│  Fast fertig!                   │
│  Schritt 2 von 2                │
│                                 │
│  ╭───────────────────────────╮  │
│  │ Titelbild * [Upload]      │  │
│  ╰───────────────────────────╯  │
│                                 │
│  ╭───────────────────────────╮  │
│  │ Beschreibung              │  │
│  │ [Textarea]                │  │
│  ╰───────────────────────────╯  │
│                                 │
│  ╭───────────────────────────╮  │
│  │ Wähle Kategorien          │  │
│  │ [Chip][Chip][Chip]        │  │
│  │ [weitere anzeigen ▼]      │  │
│  ╰───────────────────────────╯  │
│                                 │
│  ╭───────────────────────────╮  │
│  │ Ort *                     │  │
│  │ Stadt [_____________]     │  │
│  │ [Straße___] [Nr__]        │  │
│  │ [PLZ____] [Land____]      │  │
│  ╰───────────────────────────╯  │
│                                 │
│  ╭───────────────────────────╮  │
│  │ Details (optional)        │  │
│  │ Max. Teilnehmer [____]    │  │
│  │ [Datum] [Zeit]            │  │
│  ╰───────────────────────────╯  │
│                                 │
│  ╭───────────────────────────╮  │
│  │ Weitere Bilder            │  │
│  │ [+][1][2][3] →            │  │ ← Horizontal scroll
│  ╰───────────────────────────╯  │
│                                 │
│  ┌───────────────────────────┐  │
│  │       Erstellen           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Submit Logic
```typescript
const payload: EventCreateRequest = {
    title: params.title!.trim(),
    starts_at: localIso(params.date!.trim(), params.time!.trim()),
    ends_at: endDate && endTime ? localIso(endDate, endTime) : undefined,
    description: description.trim() || undefined,
    category: categories.length > 0 ? categories.join(',') : undefined,
    max_capacity: maxCapacity ? Number(maxCapacity) : undefined,
    is_public: params.isPublic === 'true',
    location: {
        city: city.trim(),
        street: street.trim() || undefined,
        house_number: houseNumber.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        country: country.trim() || undefined,
    },
};

const result = await api.createEvent(payload, token);

// TODO: Upload images (Backend-Endpoint fehlt noch)
// if (imageUri) await api.uploadEventImage(result.event_id, imageUri, token);
// if (galleryImages.length > 0) await api.uploadGalleryImages(result.event_id, galleryImages, token);

router.replace(`/event/${result.event_id}`);
```

---

## Neue Komponenten

### 1. SegmentedControl.tsx
**Location**: `src/components/atoms/SegmentedControl.tsx`

**Props**:
```typescript
interface SegmentedControlProps {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
}
```

**Design**:
- Container: `surfaceContainerHigh` background, padding 4px, borderRadius 12px
- Selected segment: `surface` background, shadow (iOS-style)
- Unselected segment: transparent
- Text: fontSize 15px, fontWeight 600
- Selected text: `onSurface`
- Unselected text: `onSurfaceVariant`

**Example**:
```tsx
<SegmentedControl
    options={[
        { value: 'public', label: 'Öffentlich' },
        { value: 'private', label: 'Privat' },
    ]}
    value={visibility}
    onChange={setVisibility}
/>
```

### 2. ImageGalleryUploader.tsx
**Location**: `src/components/atoms/ImageGalleryUploader.tsx`

**Props**:
```typescript
interface ImageGalleryUploaderProps {
    images: string[];
    onChange: (images: string[]) => void;
    maxImages?: number; // default: 6
}
```

**Features**:
- Horizontal ScrollView
- Add Button (dashed border) als erstes Element
- Image Cards: 140x180px, borderRadius 16px
- Remove Button (X) auf jedem Bild
- Number Badge (1,2,3...) auf jedem Bild
- Counter "X/6" im Header
- Max 6 Images (configurable)

**Example**:
```tsx
<ImageGalleryUploader
    images={galleryImages}
    onChange={setGalleryImages}
    maxImages={6}
/>
```

---

## Überarbeitete Komponenten

### CategorySelector.tsx (komplett überarbeitet)

**Vorher**:
- Horizontal Scroll
- Chips mit Emojis
- Compact design

**Nachher** (Eventbrite-style):
- Vertical wrap, zentriert
- Keine Emojis
- Large chips (borderRadius 24px, padding 20/12)
- Black selected, white unselected
- Expand/Collapse für 9 initial → 20 total
- Header: "Wähle Kategorien" (28px)
- Subtext: "Du kannst bis zu 5 Kategorien auswählen."

**Props** (unverändert):
```typescript
interface CategorySelectorProps {
    value: string[];
    onChange: (categories: string[]) => void;
    maxSelection?: number; // default: 5
}
```

**Kategorien** (20 total):
- Musik, Sport, Kunst, Essen & Trinken, Networking
- Bildung, Kultur, Party, Outdoor, Business & Professional
- Science & Technology, Health & Wellness, Charity & Causes
- Community & Culture, Family & Education, Fashion & Beauty
- Film Media & Entertainment, Hobbies & Special Interest
- Travel & Outdoor, Spirituality & Religion

---

## Styling Details

### Typography
- **Headers**: fontSize 28px, fontWeight 700, letterSpacing -0.5
- **Subtitles**: fontSize 13px, fontWeight 600, letterSpacing 1.2, uppercase
- **Labels**: fontSize 13px, fontWeight 600, letterSpacing 0.2
- **Inputs**: fontSize 20px (Step 1) / 16px (Step 2), fontWeight 500
- **Buttons**: fontSize 16px, fontWeight 600, letterSpacing 0.5

### Spacing
- **Header**: paddingHorizontal 24px, paddingTop 32px, paddingBottom 24px
- **Cards**: marginHorizontal 16px, padding 20px, marginBottom 24px
- **Sections**: marginBottom 24px (consistent)
- **Button**: marginHorizontal 16px, marginTop 32px

### Colors (Material Design 3)
- **Primary**: `colors.primary` (button backgrounds, selected states)
- **onPrimary**: `colors.onPrimary` (button text)
- **surfaceContainer**: `colors.surfaceContainer` (card backgrounds)
- **onSurface**: `colors.onSurface` (primary text)
- **onSurfaceVariant**: `colors.onSurfaceVariant` (labels, subtitles)
- **outlineVariant**: `colors.outlineVariant` (borders)
- **error**: `colors.error` (validation errors)

### Border Radius
- **Cards**: 16px
- **Buttons**: 9999px (pill-shaped)
- **Inputs**: 12px
- **Category Chips**: 24px
- **Image Cards**: 16px
- **Segmented Control**: 12px (container), 8px (segments)

---

## Validation & Error Handling

### Step 1 Validation
```typescript
const validate = (): boolean => {
    const e: typeof errors = {};
    
    if (!title.trim()) e.title = 'Titel ist erforderlich';
    if (!date) e.date = 'Datum ist erforderlich';
    if (!time) e.time = 'Uhrzeit ist erforderlich';
    
    if (date && time && !e.date && !e.time) {
        const dt = new Date(`${date}T${time}:00`);
        if (dt <= new Date()) {
            e.date = 'Muss in der Zukunft liegen';
        }
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
};
```

### Step 2 Validation
```typescript
const errors: string[] = [];

if (!imageUri) {
    errors.push('Titelbild ist erforderlich');
}

if (!city.trim()) {
    errors.push('Stadt ist ein Pflichtfeld');
}

if (errors.length > 0) {
    setSubmitError(errors.join('\n'));
    setSubmitting(false);
    return;
}
```

### Error Display
- **Step 1**: Error text unter jedem Feld (fontSize 12px, color `error`)
- **Step 2**: Error container mit zentriertem Text (fontSize 14px, lineHeight 20px)
- **Buttons**: Disabled state bis alle Pflichtfelder valid

---

## Date/Time Handling

### Local ISO with Timezone Offset
```typescript
const localIso = (date: string, time: string): string => {
    const d = new Date(`${date}T${time}:00`);
    const tzOffset = -d.getTimezoneOffset();
    const sign = tzOffset >= 0 ? '+' : '-';
    const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
    return `${date}T${time}:00${sign}${pad(Math.floor(Math.abs(tzOffset) / 60))}:${pad(
        Math.abs(tzOffset) % 60
    )}`;
};
```

**Example**:
- Input: `date = "2026-05-20"`, `time = "18:00"`
- Output: `"2026-05-20T18:00:00+02:00"` (CEST)

**Usage**:
```typescript
starts_at: localIso(params.date!.trim(), params.time!.trim())
ends_at: endDate && endTime ? localIso(endDate, endTime) : undefined
```

---

## File Structure

### Neue Dateien
```
frontend/
├── src/
│   ├── screens/
│   │   ├── EventCreateStepOneNew.tsx       ✨ NEW (Step 1)
│   │   ├── EventCreateStepTwo.tsx          ✨ NEW (Step 2)
│   │   ├── EventCreateStepOne.old.tsx      (backup, deprecated)
│   │   └── EventCreatePreview.old.tsx      (backup, deprecated)
│   ├── components/
│   │   ├── atoms/
│   │   │   ├── SegmentedControl.tsx        ✨ NEW
│   │   │   └── ImageGalleryUploader.tsx    ✨ NEW
│   │   └── atoms/
│   │       └── CategorySelector.tsx        🔄 ÜBERARBEITET
├── app/
│   └── events/
│       ├── create.tsx                       🔄 Updated import
│       └── create/
│           └── step-2.tsx                   ✨ NEW (routing)
```

### Gelöschte Dateien
```
frontend/app/events/create/preview.tsx       ❌ DELETED (route conflict)
```

---

## Testing Checklist

### Step 1 Testing
- [✅] Title input funktioniert
- [✅] DatePicker öffnet Kalender
- [✅] TimePicker öffnet Uhrzeit-Auswahl
- [✅] Segmented Control wechselt zwischen Public/Private
- [✅] Button disabled wenn Felder leer
- [✅] Validation: Error wenn Title/Date/Time fehlt
- [✅] Validation: Error wenn Datum in Vergangenheit
- [✅] Navigation zu Step 2 mit URL params

### Step 2 Testing
- [✅] ImageUploader öffnet Kamera/Galerie
- [✅] Beschreibung als Textarea funktioniert
- [✅] CategorySelector: max 5 Kategorien, expand/collapse
- [✅] Location Felder: Stadt required, rest optional
- [✅] Location Layout: Straße+Nr und PLZ+Land in rows
- [✅] ImageGalleryUploader: horizontal scroll, max 6 Bilder
- [✅] Button disabled wenn Pflichtfelder leer (Bild, Stadt)
- [✅] Validation zeigt Errors
- [✅] Submit erstellt Event via API
- [✅] Success: Navigiert zu `/event/{event_id}`

### Design Testing
- [✅] Light Mode: Farben korrekt
- [✅] Dark Mode: Farben korrekt
- [✅] Apple-Style: Large Typography, viel Whitespace
- [✅] Navigation Buttons: "Weiter" (Step 1), "Erstellen" (Step 2)
- [✅] Segmented Control iOS-Style
- [✅] Category Chips: Eventbrite-style, zentriert
- [✅] Image Gallery: Bumble/Tinder-style, horizontal scroll
- [✅] Spacing konsistent (8px system)

### Edge Cases
- [✅] Back Button funktioniert (Step 1 → Home, Step 2 → Step 1)
- [✅] Datum in Vergangenheit zeigt Error
- [✅] Max 5 Kategorien enforcement
- [✅] Max 6 Gallery Images enforcement
- [✅] Empty category string wird nicht gesendet
- [✅] Optional fields (description, max_capacity, ends_at) funktionieren

---

## Known Limitations

### 1. Image Upload API
**Status**: Backend-Endpoint fehlt

**Workaround**: Image URIs werden in State gespeichert, aber nicht hochgeladen. TODO comments in Code:
```typescript
// TODO: Upload image after event creation
// if (imageUri) {
//     await api.uploadEventImage(result.event_id, imageUri, token);
// }
// if (galleryImages.length > 0) {
//     await api.uploadGalleryImages(result.event_id, galleryImages, token);
// }
```

**Next Steps**: Backend muss Endpoints für Image Upload bereitstellen

### 2. Data Persistence zwischen Steps
**Current**: URL params (title, date, time, isPublic)

**Limitation**: User kann nicht zurück von Step 2 zu Step 1 gehen und Step 2 Daten behalten (State geht verloren)

**Workaround**: Back Button funktioniert, aber Step 2 State wird resettet

**Potential Solution**: Context/Zustand für Draft State, aber vorerst nicht nötig

### 3. Category Display Names
**Current**: Backend schickt IDs (z.B. "music", "sport"), Frontend zeigt IDs

**Improvement**: Map IDs zu German labels via `CATEGORIES` Array:
```typescript
const categoryLabels = categories.map(id => 
    CATEGORIES.find(cat => cat.id === id)?.label || id
);
```

**Status**: Optional improvement, vorerst: zeige IDs

---

## Migration Notes

### Alte Screens (deprecated)
- `EventCreateStepOne.tsx` → `EventCreateStepOne.old.tsx`
- `EventCreatePreview.tsx` → `EventCreatePreview.old.tsx`

### Route Update
- `app/events/create.tsx`: Import changed to `EventCreateStepOneNew`
- `app/events/create/step-2.tsx`: Neu erstellt für Step 2
- `app/events/create/preview.tsx`: Gelöscht (route conflict)

### Component Updates
- `CategorySelector.tsx`: Komplett überarbeitet (Eventbrite-style)
- Alte Version nicht gebackuped (breaking change)

---

## Weitere Verbesserungen (Optional)

### 1. Image Upload Implementation
Sobald Backend-Endpoints verfügbar:
```typescript
// api.ts
async uploadEventImage(eventId: string, imageUri: string, token: string) {
    const formData = new FormData();
    formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'event-image.jpg',
    } as any);
    
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    });
    
    return response.json();
}
```

### 2. Draft State Persistence
Context für Draft State zwischen Steps:
```typescript
// EventCreateContext.tsx
const EventCreateContext = createContext<EventCreateState | null>(null);

export function EventCreateProvider({ children }) {
    const [draft, setDraft] = useState<Partial<EventCreateRequest>>({});
    return (
        <EventCreateContext.Provider value={{ draft, setDraft }}>
            {children}
        </EventCreateContext.Provider>
    );
}
```

### 3. Category Label Mapping
Display German labels statt IDs:
```typescript
import { CATEGORIES } from '../components/atoms/CategorySelector';

const categoryLabels = event.category
    ?.split(',')
    .map(id => CATEGORIES.find(cat => cat.id === id.trim())?.label || id.trim())
    .filter(Boolean) || [];
```

### 4. Image Fullscreen View
Tap auf Gallery Image öffnet Fullscreen Modal:
```typescript
const [selectedImage, setSelectedImage] = useState<string | null>(null);

<TouchableOpacity onPress={() => setSelectedImage(uri)}>
    <Image source={{ uri }} />
</TouchableOpacity>

{selectedImage && (
    <Modal visible={!!selectedImage} onRequestClose={() => setSelectedImage(null)}>
        <Image source={{ uri: selectedImage }} style={{ flex: 1 }} resizeMode="contain" />
    </Modal>
)}
```

---

## Zusammenfassung

✅ **Complete Apple-Style Redesign** des Event-Creation Flows  
✅ **2-Step Flow** mit klarer Trennung: Essentials → Details  
✅ **Neue Komponenten**: SegmentedControl, ImageGalleryUploader  
✅ **Überarbeitete Komponenten**: CategorySelector (Eventbrite-style)  
✅ **Material Design 3** Farben und Spacing konsistent  
✅ **Full-width Navigation Buttons** statt FABs  
✅ **Validation** auf beiden Steps mit klaren Error Messages  
✅ **Responsive Layout** für alle Screen-Größen  
✅ **Dark/Light Mode** Support  

**User Feedback**: "Sehr gut bisher, ich mag das Design sehr" ✨
