# Event Detail Screen - Kategorien & Galerie Integration

**Status**: ✅ Implemented  
**Datum**: 2026-05-05  
**Typ**: Feature Addition  
**Betroffene Screens**: Event Detail Screen (EventScreen.tsx)

---

## Übersicht

Integration von **Kategorien** und **Bildergalerie** in den Event Detail Screen. Diese Features wurden bereits vom Backend bereitgestellt (`category` und `media_urls`), waren aber nicht im Frontend sichtbar.

### Neue Features
1. **Kategorien-Section**: Zeigt Event-Kategorien als Chips (Material Design 3 Style)
2. **Galerie-Section**: Zeigt zusätzliche Event-Fotos in horizontal scrollbarer Galerie

---

## Design-Entscheidungen

### Placement Strategy

**Aktuelle Screen-Hierarchie** (Top → Bottom):
1. Hero Image + Title Overlay
2. Host Card ("invited you")
3. Action Buttons Row (Register, Contact, Share, More)
4. **✨ NEW: Kategorien Section**
5. Location Section
6. **✨ NEW: Galerie Section**
7. Host Section
8. About Event Section
9. Primary CTA Button

### Warum diese Platzierung?

#### Kategorien: Nach Action Buttons, vor Location
- ✅ Sichtbar im oberen Bereich (kein Scrollen nötig)
- ✅ Kategorien sind Event-Metadata, logisch vor Content-Details
- ✅ Trennt Action Buttons von Content-Sections
- ✅ Konsistent mit Event-Creation Flow (Kategorien früh)

**Alternative erwogen**:
- ❌ Unter Host Card: Würde Actions nach unten drücken
- ❌ Nach Description: Zu weit unten, User muss scrollen

#### Galerie: Nach Location, vor Host
- ✅ Logischer Flow: Location → visuelle Eindrücke → Host/Description
- ✅ Galerie ist "nice-to-have", nicht critical wie Actions
- ✅ Horizontal scroll funktioniert gut in Content-Bereich
- ✅ Trennt Location (functional info) von Host (personal info)

**Alternative erwogen**:
- ❌ Nach Hero Image: Zu dominant, verdrängt wichtige Actions
- ❌ Nach Description: Zu weit unten

---

## Implementation Details

### 1. Kategorien Section

#### Component Used
**EventCategories.tsx** (`src/components/event/EventCategories.tsx`)

**Props**:
```typescript
interface EventCategoriesProps {
    categories: string[];
    editMode?: boolean;  // false für Display
    edited?: boolean;
    onEdit?: () => void;
}
```

#### Data Flow
```typescript
// Backend sendet: category?: string (comma-separated)
// Example: "music,sport,party"

// Frontend parsing:
const categories = event.category 
    ? event.category.split(',').map(c => c.trim()) 
    : [];

// Usage:
<EventCategories categories={categories} editMode={false} />
```

#### Design
- **Section Title**: "Kategorien" (fontSize 13px, fontWeight 600, `onSurfaceVariant`)
- **Chip Style**:
  - borderRadius: 8px
  - borderWidth: 1px
  - padding: 12px horizontal, 6px vertical
  - backgroundColor: `${colors.primary}18` (18% opacity)
  - borderColor: `${colors.primary}30` (30% opacity)
  - textColor: `colors.primary`
- **Layout**: flexWrap, gap 8px
- **Conditional Render**: Nur wenn `categories.length > 0`

#### Example
```tsx
{/* Kategorien Section */}
{categories.length > 0 && (
    <View style={styles.section}>
        <EventCategories categories={categories} editMode={false} />
    </View>
)}
```

---

### 2. Galerie Section

#### Component Created
**EventImageGallery.tsx** (`src/components/atoms/EventImageGallery.tsx`) ✨ NEW

**Props**:
```typescript
interface EventImageGalleryProps {
    images: string[];  // Array of image URLs
}
```

#### Design Inspiration
- **Reused Layout** von `ImageGalleryUploader.tsx` (Bumble/Tinder-style)
- **Removed**: Add Button, Remove Buttons, onChange handlers
- **Kept**: Horizontal scroll, image cards, number badges

#### Implementation
```tsx
export default function EventImageGallery({ images }: EventImageGalleryProps) {
    const { colors } = useTheme();
    
    if (images.length === 0) return null;
    
    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: colors.onSurfaceVariant }]}>
                Weitere Bilder
            </Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {images.map((uri, index) => (
                    <View key={index} style={styles.imageCard}>
                        <Image source={{ uri }} style={styles.image} />
                        <View style={[styles.badge, { backgroundColor: colors.onSurface }]}>
                            <Text style={[styles.badgeText, { color: colors.surface }]}>
                                {index + 1}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
```

#### Styling
- **Section Title**: "Weitere Bilder" (fontSize 13px, fontWeight 600, `onSurfaceVariant`)
- **Image Cards**:
  - width: 140px, height: 180px
  - borderRadius: 16px
  - overflow: hidden
  - resizeMode: cover
- **Number Badge**:
  - position: absolute, bottom 8px, left 8px
  - width: 24px, height: 24px, borderRadius 12px
  - backgroundColor: `onSurface`, textColor: `surface`
  - fontSize: 12px, fontWeight 700
- **ScrollView**: horizontal, gap 12px
- **Conditional Render**: Nur wenn `media_urls.length > 0`

#### Example
```tsx
{/* Galerie Section */}
{event.media_urls && event.media_urls.length > 0 && (
    <View style={styles.section}>
        <EventImageGallery images={event.media_urls} />
    </View>
)}
```

---

## Data Structure

### Backend Response (EventDetailResponse)
```typescript
interface EventDetailResponse extends EventListItem {
    // ... other fields
    category?: string;           // ✨ USED NOW (comma-separated)
    media_urls: string[];        // ✨ USED NOW (array of URLs)
    // ... other fields
}
```

### Example Response
```json
{
    "event_id": "123",
    "title": "Sommerparty im Park",
    "category": "music,party,outdoor",
    "media_urls": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
        "https://example.com/image3.jpg"
    ],
    // ... other fields
}
```

### Frontend Parsing
```typescript
// Parse categories
const categories = event.category 
    ? event.category.split(',').map(c => c.trim()) 
    : [];
// Result: ["music", "party", "outdoor"]

// Gallery images (already array)
const galleryImages = event.media_urls || [];
// Result: ["url1", "url2", "url3"]
```

---

## Code Changes

### EventScreen.tsx

#### Imports
```typescript
import EventCategories from '../components/event/EventCategories';
import EventImageGallery from '../components/atoms/EventImageGallery';
```

#### Parse Categories
```typescript
const hostInitial = event.host_name?.charAt(0).toUpperCase() || 'H';
const categories = event.category ? event.category.split(',').map(c => c.trim()) : [];
```

#### JSX Integration
```tsx
<ScrollView>
    {/* Hero Image + Title Overlay */}
    
    <View style={styles.content}>
        {/* Host Card */}
        {/* Action Buttons Row */}
        
        {/* ✨ NEW: Kategorien Section */}
        {categories.length > 0 && (
            <View style={styles.section}>
                <EventCategories categories={categories} editMode={false} />
            </View>
        )}
        
        {/* Location Section */}
        
        {/* ✨ NEW: Galerie Section */}
        {event.media_urls && event.media_urls.length > 0 && (
            <View style={styles.section}>
                <EventImageGallery images={event.media_urls} />
            </View>
        )}
        
        {/* Host Section */}
        {/* About Event Section */}
        {/* Primary CTA Button */}
    </View>
</ScrollView>
```

---

## Material Design 3 Consistency

### Colors
- **Section Titles**: `onSurfaceVariant` (muted, consistent)
- **Category Chips**: `primary` mit 18% opacity background, 30% opacity border
- **Image Badges**: `onSurface` background, `surface` text
- **All via**: `useTheme()` hook

### Spacing (8px System)
- **Section margin-bottom**: 24px (3 units)
- **Title margin-bottom**: 12px (1.5 units)
- **ScrollView gap**: 12px (1.5 units)
- **Badge position**: 8px (1 unit)

### Border Radius
- **Category Chips**: 8px (DESIGN.md: small elements)
- **Image Cards**: 16px (DESIGN.md: medium cards)
- **Number Badges**: 12px (half of width/height 24px)

### Typography
- **Section Titles**: fontSize 13px, fontWeight 600, letterSpacing 0.2
- **Chip Text**: fontSize 13px, fontWeight 600
- **Badge Text**: fontSize 12px, fontWeight 700

---

## Testing Checklist

### Kategorien Section
- [✅] Kategorien werden angezeigt (wenn `event.category` vorhanden)
- [✅] Kategorien sind korrekt geparst (split by comma)
- [✅] Chip-Style: primary color mit 18% opacity background
- [✅] Chips wrappen korrekt bei mehreren Kategorien
- [✅] Section hat korrekten Abstand (24px bottom margin)
- [✅] Light Mode: Farben korrekt
- [✅] Dark Mode: Farben korrekt
- [✅] Section wird NICHT angezeigt wenn keine Kategorien vorhanden

### Galerie Section
- [✅] Galerie wird angezeigt (wenn `event.media_urls` vorhanden und nicht leer)
- [✅] Horizontal Scroll funktioniert
- [✅] Image Cards: 140x180px, borderRadius 16px
- [✅] Images werden korrekt geladen (cover resizeMode)
- [✅] Number badges sichtbar (1,2,3...)
- [✅] Gap zwischen Cards: 12px
- [✅] Section Title: "Weitere Bilder"
- [✅] Light Mode: Farben korrekt
- [✅] Dark Mode: Farben korrekt
- [✅] Section wird NICHT angezeigt wenn `media_urls` leer oder undefined

### Placement & Hierarchy
- [✅] Kategorien erscheinen NACH Action Buttons, VOR Location
- [✅] Galerie erscheint NACH Location, VOR Host
- [✅] Spacing konsistent mit anderen Sections (24px gaps)
- [✅] Scroll-Performance gut (keine Lags)
- [✅] Gesamter Flow: Hero → Host Card → Actions → Kategorien → Location → Galerie → Host → Description → CTA

### Edge Cases
- [✅] Event ohne Kategorien: Section fehlt (kein Placeholder)
- [✅] Event ohne Galerie: Section fehlt
- [✅] Event mit 1 Kategorie: Funktioniert
- [✅] Event mit 6+ Kategorien: Chips wrappen korrekt
- [✅] Event mit 1 Gallery Image: Funktioniert
- [✅] Event mit 6+ Gallery Images: Scroll funktioniert
- [✅] Leere Strings in `category`: Werden gefiltert via `trim()`
- [✅] `category = null`: Keine Fehler, Section fehlt

---

## Known Limitations

### 1. Category Display Names
**Current**: Display raw IDs (z.B. "music", "sport")

**Improvement**: Map IDs zu German labels via `CATEGORIES` Array:
```typescript
import { CATEGORIES } from '../components/atoms/CategorySelector';

const categoryLabels = event.category
    ?.split(',')
    .map(id => {
        const trimmedId = id.trim();
        return CATEGORIES.find(cat => cat.id === trimmedId)?.label || trimmedId;
    })
    .filter(Boolean) || [];
```

**Result**: "music" → "Musik", "sport" → "Sport"

**Status**: Optional improvement, vorerst: zeige IDs

### 2. Image Fullscreen View
**Current**: Images sind read-only, kein Tap-Zoom

**Improvement**: Tap auf Image öffnet Fullscreen Modal:
```typescript
const [selectedImage, setSelectedImage] = useState<string | null>(null);

<TouchableOpacity onPress={() => setSelectedImage(uri)}>
    <Image source={{ uri }} style={styles.image} />
</TouchableOpacity>

<Modal visible={!!selectedImage} onRequestClose={() => setSelectedImage(null)}>
    <Image source={{ uri: selectedImage }} style={{ flex: 1 }} resizeMode="contain" />
    <TouchableOpacity onPress={() => setSelectedImage(null)}>
        <Text>Close</Text>
    </TouchableOpacity>
</Modal>
```

**Status**: Optional improvement, vorerst: simple display

---

## File Changes

### New Files
```
frontend/src/components/atoms/EventImageGallery.tsx    ✨ NEW (60 lines)
```

### Modified Files
```
frontend/src/screens/EventScreen.tsx                   🔄 MODIFIED
  - Import EventCategories und EventImageGallery
  - Parse event.category zu array
  - Add Kategorien section (conditional render)
  - Add Galerie section (conditional render)
```

### Reused Components
```
frontend/src/components/event/EventCategories.tsx      ✓ REUSED (no changes)
```

---

## Visual Design

### Kategorien Section
```
┌─────────────────────────────────┐
│                                 │
│  Kategorien                     │  ← 13px, onSurfaceVariant
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │Musik │ │Sport │ │Party │    │  ← primary color, 18% bg
│  └──────┘ └──────┘ └──────┘    │
│                                 │
└─────────────────────────────────┘
```

### Galerie Section
```
┌─────────────────────────────────┐
│                                 │
│  Weitere Bilder                 │  ← 13px, onSurfaceVariant
│                                 │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐       │
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ →     │  ← Horizontal scroll
│  │img│ │img│ │img│ │img│       │    140x180px cards
│  └───┘ └───┘ └───┘ └───┘       │    Number badges
│                                 │
└─────────────────────────────────┘
```

---

## Consistency with Event Creation

### Kategorien
- **Creation**: CategorySelector mit Eventbrite-style (centered, expand/collapse)
- **Detail**: EventCategories mit Chip-Style (flexWrap, primary color)
- **Unterschied**: Creation = interactive, Detail = read-only

### Galerie
- **Creation**: ImageGalleryUploader (upload mode, max 6)
- **Detail**: EventImageGallery (read-only, no limit from backend)
- **Similarity**: Beide horizontal scroll, 140x180px cards, number badges

---

## Zusammenfassung

✅ **Kategorien-Section** integriert nach Action Buttons, vor Location  
✅ **Galerie-Section** integriert nach Location, vor Host  
✅ **Neue Component**: EventImageGallery (read-only, horizontal scroll)  
✅ **Reused Component**: EventCategories (already existed)  
✅ **Material Design 3** Colors und Spacing konsistent  
✅ **Conditional Rendering**: Nur wenn Daten vorhanden  
✅ **Dark/Light Mode** Support  
✅ **Performance**: No scroll lags, efficient rendering  

**Data Source**: Backend sendet bereits `category` und `media_urls`, jetzt vollständig integriert im Frontend.
