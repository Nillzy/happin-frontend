# Event Creation - Phase 1 Implementation (P0 Features)

**Datum:** 2026-05-05  
**Status:** ✅ Implementiert  
**Phase:** P0 (Kritische Pflichtenheft-Lücken)

## Übersicht

Diese Dokumentation beschreibt die Implementierung der kritischen P0-Features für den Event-Creation Flow gemäß Pflichtenheft:

1. **Titelbild-Upload (M2 - Pflichtfeld)**
2. **Location als Pflichtfeld (M2)**
3. **Kategorie-Chips statt Freitext (S7)**

---

## 1. Titelbild-Upload (M2 - Pflichtfeld)

### Problem
Titelbild war laut Pflichtenheft **Pflichtfeld**, aber nicht implementiert.

### Lösung: ImageUploader Komponente

**Location:** `frontend/src/components/atoms/ImageUploader.tsx`

#### Features
- 📷 **Foto aufnehmen** (Kamera)
- 🖼️ **Aus Galerie auswählen**
- **Preview** des ausgewählten Bildes
- **Aspect Ratio:** 16:9 (Standard), 4:3 oder 1:1
- **Max. Dateigröße:** 5MB (konfigurierbar)
- **Bildformat:** JPEG/PNG
- **Berechtigungen:** Automatische Permission-Requests für Kamera/Galerie

#### Props Interface
```typescript
interface ImageUploaderProps {
    value: string | null;        // URI des ausgewählten Bildes
    onChange: (uri: string) => void;
    aspectRatio?: '16:9' | '4:3' | '1:1';
    maxSizeMB?: number;
}
```

#### Usage in EventCreatePreview
```typescript
<ImageUploader
    value={data.imageUri}
    onChange={(uri) => onChange({ imageUri: uri })}
/>
```

#### Design
- **Placeholder State:**
  - Dashed border (gestrichelt)
  - Zentriertes Icon (image-outline)
  - Text: "Tippen zum Hochladen"
  - Hint: "Max. 5MB · 16:9 Format"
  
- **Preview State:**
  - Vollflächiges Bild (cover)
  - Floating Kamera-Button (rechts unten)
  - Border-Radius: 20px

#### Theme Support
✅ Light Mode: `surfaceContainer` background  
✅ Dark Mode: `surfaceContainer` background  
✅ Colors via `useTheme()`

---

## 2. Location als Pflichtfeld (M2)

### Problem
Stadt war laut Pflichtenheft Pflichtfeld, wurde aber nicht validiert.

### Lösung: Validation in handleSubmit

**Location:** `frontend/src/screens/EventCreatePreview.tsx:156-172`

#### Implementation
```typescript
const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    // Validation
    const errors: string[] = [];
    
    if (!data.city.trim()) {
        errors.push('Stadt ist ein Pflichtfeld');
    }
    
    if (!data.imageUri) {
        errors.push('Titelbild ist erforderlich');
    }
    
    if (errors.length > 0) {
        setSubmitError(errors.join('\n'));
        setSubmitting(false);
        return;
    }
    
    // ... rest of submit logic
};
```

#### Behavior
- **Stadt fehlt:** Error-Message "Stadt ist ein Pflichtfeld"
- **Titelbild fehlt:** Error-Message "Titelbild ist erforderlich"
- **Beide fehlen:** Beide Fehler untereinander angezeigt
- **Error Display:** Rote Textfarbe (`colors.error`), oberhalb Submit-Button

---

## 3. Kategorie-Chips statt Freitext (S7)

### Problem
Kategorien sollten vordefiniert sein, waren aber Freitext mit Komma-Trennung.

### Lösung: CategorySelector Komponente

**Location:** `frontend/src/components/atoms/CategorySelector.tsx`

#### Features
- **9 vordefinierte Kategorien** mit Emojis
- **Multi-Select:** Bis zu 3 Kategorien gleichzeitig
- **Horizontal Scroll:** Swipeable Chips
- **Counter:** `X/3` Anzeige

#### Kategorien
1. 🎵 Musik
2. ⚽ Sport
3. 🎨 Kunst
4. 🍴 Essen & Trinken
5. 💼 Networking
6. 🎓 Bildung
7. 🎭 Kultur
8. 🎉 Party
9. 🏃 Outdoor

#### Props Interface
```typescript
interface CategorySelectorProps {
    value: string[];                    // Array von category IDs
    onChange: (categories: string[]) => void;
    maxSelection?: number;              // Default: 3
}
```

#### Usage in EventCreatePreview
```typescript
<CategorySelector
    value={data.categories}
    onChange={(cats) => onChange({ categories: cats })}
/>
```

#### Design
- **Unselected Chip:**
  - Background: `surfaceContainer`
  - Border: 1.5px `outlineVariant`
  - Text: `onSurface`, weight 500
  
- **Selected Chip:**
  - Background: `primaryContainer`
  - Border: 1.5px `primary`
  - Text: `onPrimaryContainer`, weight 600
  
- **Chip Style:**
  - Border-Radius: 20px (pill shape)
  - Padding: 16px horizontal, 10px vertical
  - Gap: 6px (emoji + text)

#### Theme Support
✅ Light Mode: Surface-based colors  
✅ Dark Mode: Primary accent on selection  
✅ Colors via `useTheme()`

---

## Interface-Änderungen

### PreviewFormData Interface (Updated)

**Location:** `frontend/src/screens/EventCreatePreview.tsx:30-48`

```typescript
export interface PreviewFormData {
    // ... existing fields
    category: string;         // Legacy (wird aus categories[] gebaut)
    categories: string[];     // NEU: Array von category IDs
    imageUri: string;         // NEU: URI des ausgewählten Bildes
}
```

### Initialization
```typescript
const [data, setData] = useState<PreviewFormData>({
    // ... existing
    category: '',
    categories: [],           // NEU
    imageUri: '',            // NEU
});
```

---

## API-Integration

### handleSubmit - Category Mapping

**Location:** `frontend/src/screens/EventCreatePreview.tsx:176-179`

```typescript
// Build category string from categories array
// Backend erwartet comma-separated string
const categoryString = data.categories.length > 0
    ? data.categories.join(',')
    : (data.category.trim() || undefined);

const payload: EventCreateRequest = {
    // ...
    category: categoryString,
    // ...
};
```

### Image Upload (TODO)

**Aktuell:** Image URI wird gespeichert, aber noch nicht hochgeladen  
**Next Step:** Backend-Endpoint für Image-Upload implementieren

```typescript
// TODO: Nach Event-Erstellung
if (data.imageUri) {
    await api.uploadEventImage(result.event_id, data.imageUri, token);
}
```

---

## Dependencies

### Neue Package-Installation

```bash
npm install expo-image-picker
```

**Version:** Latest (Expo SDK 54 compatible)  
**Verwendung:** Kamera + Galerie Zugriff

---

## Testing Checklist

### ImageUploader
- [ ] Kamera-Zugriff (Permission Request)
- [ ] Galerie-Zugriff (Permission Request)
- [ ] Bild-Preview nach Auswahl
- [ ] Bild ändern (via Kamera-Button)
- [ ] Validation: Error wenn kein Bild ausgewählt
- [ ] Light Mode Darstellung
- [ ] Dark Mode Darstellung

### CategorySelector
- [ ] Multi-Select funktioniert
- [ ] Max. 3 Kategorien auswählbar
- [ ] Counter `X/3` aktualisiert sich
- [ ] Horizontal Scroll funktioniert
- [ ] Selected State visuell korrekt
- [ ] Deselect funktioniert
- [ ] Light Mode Darstellung
- [ ] Dark Mode Darstellung

### Location Validation
- [ ] Submit ohne Stadt zeigt Error
- [ ] Submit mit Stadt funktioniert
- [ ] Error-Message verschwindet nach Korrektur
- [ ] Error wird oberhalb Submit-Button angezeigt

### Integration
- [ ] ImageUploader + CategorySelector im Edit-Modal
- [ ] Preview zeigt ausgewählte Kategorien
- [ ] Preview zeigt ausgewähltes Bild (EventHero)
- [ ] Submit erstellt Event mit allen Daten
- [ ] Navigation zu /event/{id}/manage funktioniert

---

## Known Issues / Next Steps

### Image Upload API
**Status:** ⚠️ Backend-Endpoint fehlt

**Required:**
```python
# backend/app/api/v1/events.py
@router.post("/{event_id}/media")
async def upload_event_image(
    event_id: str,
    file: UploadFile,
    user=Depends(get_current_user),
):
    # Upload to Supabase Storage
    # Update event.image_url in DB
    pass
```

### EventHero Image Support
**Status:** ⚠️ Prüfen ob `imageUrl` prop existiert

**Aktuell angenommen:**
```typescript
<EventHero imageUrl={data.imageUri || undefined} />
```

Falls `imageUrl` nicht existiert, muss EventHero erweitert werden.

---

## Änderungen an bestehenden Files

### Modified Files
1. `frontend/src/screens/EventCreatePreview.tsx`
   - Interface `PreviewFormData` erweitert (+2 Felder)
   - State initialisiert mit `categories: []` und `imageUri: ''`
   - `handleSubmit` Validation hinzugefügt (Stadt + Bild)
   - Category-Modal durch CategorySelector ersetzt
   - ImageUploader im Upload-Section hinzugefügt
   - EventHero mit `imageUrl` prop erweitert

### Created Files
1. `frontend/src/components/atoms/ImageUploader.tsx` (NEU)
2. `frontend/src/components/atoms/CategorySelector.tsx` (NEU)

---

## Design System Compliance

✅ **Alle Komponenten verwenden `useTheme()`**  
✅ **Border-Radius:** 20px (CategorySelector Chips), 20px (ImageUploader)  
✅ **Spacing:** 8px-System (gap, padding, margins)  
✅ **Typography:** Material Design 3 Scale  
✅ **Elevation:** Keine Shadows (nur borders)  
✅ **Colors:** MD3 Token-basiert

Referenz: `frontend/documentation/DESIGN.md`

---

## Git Workflow

**Branch:** `feature/event-creation-phase-1`  
**Commits:** Alle auf Deutsch  
**Nächster Schritt:** Testing, dann Merge Request

```bash
# Commit Messages
git commit -m "feat: Titelbild-Upload Komponente implementiert (M2)"
git commit -m "feat: CategorySelector mit Multi-Select Chips (S7)"
git commit -m "feat: Stadt-Validation als Pflichtfeld hinzugefügt (M2)"
```

---

## Nächste Schritte (Phase 2)

Nach erfolgreichem Testing von Phase 1:

### Phase 2: Ticketing-UI (P1)
1. TicketOptionBuilder.tsx erstellen
2. Toggle "Kostenlos" vs "Kostenpflichtig"
3. API-Integration mit `PUT /events/{id}/ticket-options`

### Phase 3: RSVP-Formular Builder (P1)
1. RsvpFieldBuilder.tsx erstellen
2. Field-Types: text, textarea, yes_no, single_choice, multi_choice
3. Backend-Endpoint prüfen/erstellen

Siehe: `frontend/documentation/CLAUDE_PROMPT_EVENT_CREATION_REDESIGN.md`

---

**Ende der Dokumentation**
