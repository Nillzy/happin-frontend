# Event Creation Apple-Style Redesign

**Datum:** 2026-05-05  
**Status:** ✅ Implementiert  
**Design-Stil:** Apple-Style (Large Typography, Minimal UI, Viel Whitespace)

---

## Überblick

Komplettes Redesign des Event-Creation Flows mit modernem Apple-Style Design:

### Neuer 2-Step Flow

**Step 1 (Essentials):**
- Titel
- Datum & Uhrzeit
- Sichtbarkeit (Public/Private mit Segmented Control)

**Step 2 (Details):**
- Titelbild (Required)
- Beschreibung
- Kategorien (bis zu 3)
- Location (Stadt Required)
- Optional: Max Teilnehmer, Enddatum/-zeit

---

## Neue Komponenten

### 1. SegmentedControl.tsx
**Location:** `frontend/src/components/atoms/SegmentedControl.tsx`

**Features:**
- iOS-Style Segmented Control
- Selected State: `surface` background mit shadow
- Unselected: Transparent
- Smooth transitions

**Props:**
```typescript
interface SegmentedControlProps {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
}
```

**Usage:**
```typescript
<SegmentedControl
    options={[
        { value: 'public', label: 'Öffentlich' },
        { value: 'private', label: 'Privat' },
    ]}
    value={visibility}
    onChange={setVisibility}
/>
```

### 2. FloatingActionButton.tsx (FAB)
**Location:** `frontend/src/components/atoms/FloatingActionButton.tsx`

**Features:**
- 56x56px Perfect Circle
- Position: Fixed bottom-right (24px margin)
- Primary color background
- Icon support (Ionicons)
- Loading state mit ActivityIndicator
- Disabled state (opacity 0.5)
- iOS-style shadow

**Props:**
```typescript
interface FloatingActionButtonProps {
    onPress: () => void;
    icon: keyof typeof Ionicons.glyphMap;
    disabled?: boolean;
    loading?: boolean;
}
```

**Usage:**
```typescript
<FloatingActionButton
    icon="arrow-forward"
    onPress={handleNext}
    disabled={!isFormValid}
/>
```

---

## Neue Screens

### 1. EventCreateStepOneNew.tsx
**Location:** `frontend/src/screens/EventCreateStepOneNew.tsx`  
**Route:** `/events/create`

#### Features
- **Apple-Style Layout**: Viel Whitespace, Large Typography
- **Minimal Fields**: Nur Essentials (Titel, Datum/Zeit, Sichtbarkeit)
- **Card-Based**: Jedes Feld in eigener Card (16px borderRadius)
- **FAB Navigation**: Floating Action Button (rechts unten)
- **Validation**: Real-time Error-Anzeige unter Feldern

#### UI Structure
```
┌────────────────────────────────┐
│ Navbar (← Zurück)              │
├────────────────────────────────┤
│                                │
│  Event erstellen      ← 28px   │
│  Schritt 1 von 2      ← 13px   │
│                                │
│  ╭──────────────────────────╮ │
│  │ Titel                    │ │
│  │ Event-Name (20px input)  │ │
│  ╰──────────────────────────╯ │
│                                │
│  ╭──────────────────────────╮ │
│  │ Datum & Uhrzeit          │ │
│  │ [DatePicker] [TimePicker]│ │
│  ╰──────────────────────────╯ │
│                                │
│  ╭──────────────────────────╮ │
│  │ Sichtbarkeit             │ │
│  │ [Segmented Control]      │ │
│  │ Hint-Text                │ │
│  ╰──────────────────────────╯ │
│                                │
│                           [→]  │
└────────────────────────────────┘
```

#### Validation Rules
- **Titel**: Required, max 255 chars
- **Datum**: Required, must be in future
- **Uhrzeit**: Required, must be in future
- **FAB**: Disabled bis alle Pflichtfelder ausgefüllt

#### Navigation
```typescript
router.push({
    pathname: '/events/create/step-2',
    params: {
        title: title.trim(),
        date: date.trim(),
        time: time.trim(),
        isPublic: visibility === 'public' ? 'true' : 'false',
    },
});
```

---

### 2. EventCreateStepTwo.tsx
**Location:** `frontend/src/screens/EventCreateStepTwo.tsx`  
**Route:** `/events/create/step-2`

#### Features
- **Receives URL Params**: title, date, time, isPublic from Step 1
- **Detail Fields**: Bild, Beschreibung, Kategorien, Location, Details
- **Card-Based Layout**: Grouped by section
- **FAB Submit**: Checkmark icon, loading state
- **API Integration**: `POST /api/v1/events`

#### UI Structure
```
┌────────────────────────────────┐
│ Navbar (← Zurück)              │
├────────────────────────────────┤
│                                │
│  Fast fertig!         ← 28px   │
│  Schritt 2 von 2      ← 13px   │
│                                │
│  ╭──────────────────────────╮ │
│  │ Titelbild *              │ │
│  │ [ImageUploader]          │ │
│  ╰──────────────────────────╯ │
│                                │
│  ╭──────────────────────────╮ │
│  │ Beschreibung             │ │
│  │ [Textarea]               │ │
│  ╰──────────────────────────╯ │
│                                │
│  ╭──────────────────────────╮ │
│  │ Kategorien               │ │
│  │ [CategorySelector]       │ │
│  ╰──────────────────────────╯ │
│                                │
│  ╭──────────────────────────╮ │
│  │ Ort *                    │ │
│  │ Stadt [________]         │ │
│  │ Straße [_____] Nr [__]   │ │
│  │ PLZ [___] Land [_____]   │ │
│  ╰──────────────────────────╯ │
│                                │
│  ╭──────────────────────────╮ │
│  │ Details (optional)       │ │
│  │ Max. Teilnehmer [____]   │ │
│  │ Endet am [Date] [Time]   │ │
│  ╰──────────────────────────╯ │
│                                │
│                          [✓]   │
└────────────────────────────────┘
```

#### Validation Rules
- **Titelbild**: Required (Error wenn leer)
- **Stadt**: Required (Error wenn leer)
- **Alle anderen**: Optional

#### Submit Logic
```typescript
const payload: EventCreateRequest = {
    title: params.title!.trim(),
    starts_at: localIso(params.date!, params.time!),
    ends_at: endDate && endTime ? localIso(endDate, endTime) : undefined,
    description: description.trim() || undefined,
    category: categories.join(','),
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
router.replace(`/event/${result.event_id}`); // Navigiert zu Event Detail
```

---

## Routing Changes

### Files Modified

1. **`app/events/create.tsx`**
   - **Old:** `export { default } from '@/src/screens/EventCreateScreen';`
   - **New:** `export { default } from '@/src/screens/EventCreateStepOneNew';`

2. **`app/events/create/step-2.tsx`** (NEW)
   - `export { default } from '@/src/screens/EventCreateStepTwo';`

### Old Files (Backup)
- `EventCreateStepOne.tsx` → `EventCreateStepOne.old.tsx`
- `EventCreatePreview.tsx` → `EventCreatePreview.old.tsx`

---

## Apple-Style Design Principles

### Typography
- **Headers**: 28px, fontWeight 700, letterSpacing -0.5
- **Subtitles**: 13px, fontWeight 600, uppercase, letterSpacing 1.2
- **Inputs**: 20px (increased from 15px), fontWeight 500
- **Labels**: 13px, fontWeight 600, letterSpacing 0.2
- **Body**: 16px, fontWeight 500

### Spacing
- **Card Padding**: 20px (increased from 16px)
- **Card Margin**: 16px horizontal, 24px bottom
- **Card Border Radius**: 16px (increased from 12px)
- **Header Padding**: 32px top, 24px horizontal
- **Section Gaps**: 24px (increased from 16px)
- **FAB Margin**: 24px from bottom/right

### Colors
- Uses `useTheme()` for all colors
- **Background**: `colors.background`
- **Cards**: `colors.surfaceContainer`
- **Text**: `colors.onSurface` (primary), `colors.onSurfaceVariant` (secondary)
- **FAB**: `colors.primary` background, `colors.onPrimary` icon
- **Errors**: `colors.error`

### Borders & Shadows
- **Minimal Borders**: Only when necessary (inputs)
- **Subtle Shadows**: iOS-style (shadowOffset {0, 2-4}, opacity 0.1-0.3)
- **Card Borders**: None (background color separation)
- **Input Borders**: 1px `outlineVariant`

### Whitespace
- **Minimum 24px** zwischen Sections
- **80px bottom spacer** für FAB clearance
- **Large padding** in cards (20px)
- **Generous header padding** (32px top)

---

## User Flow

```
1. User taps "Erstellen" in Bottom Nav
   ↓
2. EventCreateStepOneNew (/events/create)
   - Füllt Titel aus
   - Wählt Datum & Uhrzeit
   - Wählt Public/Private
   - FAB wird enabled
   ↓
3. User taps FAB (arrow icon)
   ↓
4. Navigate to Step 2 (/events/create/step-2)
   - URL params: title, date, time, isPublic
   ↓
5. EventCreateStepTwo
   - Wählt Titelbild (Required)
   - Füllt Beschreibung aus (Optional)
   - Wählt Kategorien (Optional, max 3)
   - Füllt Stadt aus (Required)
   - Füllt weitere Location-Daten aus (Optional)
   - Füllt Details aus (Optional)
   - FAB wird enabled (wenn Bild + Stadt vorhanden)
   ↓
6. User taps FAB (checkmark icon)
   ↓
7. Validation
   - Prüft Titelbild vorhanden
   - Prüft Stadt ausgefüllt
   - Falls Fehler: Error-Message anzeigen
   ↓
8. API Call: POST /api/v1/events
   - Payload mit allen Daten
   - Returns: { event_id, ... }
   ↓
9. Success: router.replace(`/event/${event_id}`)
   - Navigiert zu Event Detail Screen
   - User sieht erstelltes Event
```

---

## Testing Checklist

### Step 1 - EventCreateStepOneNew
- [ ] Titel Input funktioniert
- [ ] DatePicker öffnet Kalender
- [ ] TimePicker öffnet Uhrzeit-Auswahl
- [ ] SegmentedControl wechselt zwischen Public/Private
- [ ] Hint-Text ändert sich bei Auswahl
- [ ] FAB disabled wenn Felder leer
- [ ] Validation: Error bei leerem Titel
- [ ] Validation: Error bei fehlendem Datum
- [ ] Validation: Error bei Datum in Vergangenheit
- [ ] FAB navigiert zu Step 2

### Step 2 - EventCreateStepTwo
- [ ] URL Params korrekt empfangen
- [ ] ImageUploader öffnet Kamera/Galerie
- [ ] Beschreibung als Textarea
- [ ] CategorySelector: max 3 Kategorien
- [ ] Stadt-Input funktioniert
- [ ] Location-Felder (Straße, Nr, PLZ, Land)
- [ ] Optional: Max Teilnehmer (number)
- [ ] Optional: Enddatum/-zeit
- [ ] FAB disabled wenn Bild/Stadt fehlen
- [ ] Validation: Error bei fehlendem Bild
- [ ] Validation: Error bei fehlender Stadt
- [ ] Submit erstellt Event via API
- [ ] Loading State während Submit
- [ ] Success: Navigiert zu `/event/{event_id}`

### Design Consistency
- [ ] Light Mode: Farben korrekt
- [ ] Dark Mode: Farben korrekt
- [ ] Apple-Style: Large Typography überall
- [ ] Whitespace: 24px zwischen Sections
- [ ] Card Border Radius: 16px
- [ ] Card Padding: 20px
- [ ] FAB visible und functional
- [ ] FAB shadow korrekt (iOS/Android/Web)
- [ ] SegmentedControl iOS-Style
- [ ] Input fontSize: 20px (nicht 15px)

### Edge Cases
- [ ] Back Button auf Step 2 geht zurück zu Step 1
- [ ] Datum in Vergangenheit zeigt Error
- [ ] Max 3 Kategorien enforcement
- [ ] Auth-Token fehlt → Navigate to /login
- [ ] API Error → Error-Message anzeigen
- [ ] Keyboard erscheint nicht über FAB

---

## Known Limitations

### Image Upload API
**Status:** Backend-Endpoint fehlt

**Workaround:** Image URI wird im State gespeichert, aber nicht hochgeladen
```typescript
// TODO: Upload image
if (imageUri) {
    await api.uploadEventImage(result.event_id, imageUri, token);
}
```

### Data Persistence
**Current:** URL params für Step 1 → Step 2

**Limitation:** Zurück von Step 2 zu Step 1 geht, aber Step 2 State geht verloren

**Solution (optional):** Context/Zustand für Draft State

### Redirect nach Submit
**Current:** Navigiert zu `/event/{event_id}` (Event Detail Screen)

**Note:** Event Detail Screen muss Draft-Events unterstützen (status: 'draft')

---

## Files Created

### New Components
1. `frontend/src/components/atoms/SegmentedControl.tsx`
2. `frontend/src/components/atoms/FloatingActionButton.tsx`

### New Screens
1. `frontend/src/screens/EventCreateStepOneNew.tsx`
2. `frontend/src/screens/EventCreateStepTwo.tsx`

### Routing
1. `frontend/app/events/create/step-2.tsx` (NEW)

### Modified
1. `frontend/app/events/create.tsx` (updated import)

### Archived
1. `frontend/src/screens/EventCreateStepOne.old.tsx` (backup)
2. `frontend/src/screens/EventCreatePreview.old.tsx` (backup)

---

## Next Steps

1. **Testing**: Manual testing auf echtem Gerät (iOS/Android)
2. **Image Upload API**: Backend-Endpoint implementieren
3. **Draft Support**: Event Detail Screen muss Drafts anzeigen können
4. **Animations**: Smooth transitions zwischen Steps (optional)
5. **Accessibility**: VoiceOver/TalkBack Support (optional)

---

**Implementation Date:** 2026-05-05  
**Design-Stil:** Apple-Style (Large Typography, Minimal UI, Viel Whitespace)  
**Status:** ✅ Ready for Testing
