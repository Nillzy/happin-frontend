---
title: Event Detail Screen Redesign
created: 2026-05-05
status: implemented
---

# Event Detail Screen - Luma-Inspired Layout

## Überblick

Der EventScreen wurde komplett neu designed mit einem Luma-inspirierten Layout. Das Layout folgt modernen Event-App-Patterns, während das Design System (Farben, Typography, Spacing) aus DESIGN.md beibehalten wird.

## Design-Prinzipien

**Layout-Inspiration:** Luma Event App
- Hero Image mit Title Overlay
- Action Buttons Row (Register, Contact, Share, More)
- Location Card mit Map
- Host Section
- About Event Section
- Primary CTA Button

**Design System:** Material Design 3 (DESIGN.md)
- Colors: `useTheme()` hook (Happin Light / Neon Horizon)
- Typography: Inter für Body (15px/24px), Plus Jakarta Sans für Headings (32px)
- Spacing: 24px grid_margin, 16px padding (8px System)
- Border Radius: 12-16px für Cards (card_radius aus DESIGN.md)
- Elevation: Platform-spezifische Shadows

## Layout-Struktur

```
┌─────────────────────────────────────┐
│ Hero Image (3:4 Aspect Ratio)       │
│   ┌──────┐                          │
│   │ Back │                          │
│   └──────┘                          │
│                                     │
│   ┌─────────────────────────────┐  │
│   │ [Dark Gradient Overlay]     │  │
│   │ Event Title (32px, bold)    │  │
│   │ Date & Time (16px)          │  │
│   └─────────────────────────────┘  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Host Card                           │
│ ┌─┐ Jason Smith                 ⋯  │
│ │J│ invited you                    │
│ └─┘                                │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Action Buttons Row                  │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│ │ ✓  │ │ ✉  │ │ ↗  │ │ ⋯  │        │
│ │Reg.│ │Con.│ │Shr.│ │More│        │
│ └────┘ └────┘ └────┘ └────┘        │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ LOCATION                            │
│ ┌─────────────────────────────────┐ │
│ │ 633 Rose Ave          ☀ 18°C   │ │
│ │ Los Angeles, California         │ │
│ │                                 │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │     Map Placeholder         │ │ │
│ │ │          🗺                 │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ HOST                       Contact  │
│ ┌─┐ Jason Smith                     │
│ │J│                                │
│ └─┘                                │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ ABOUT EVENT                         │
│ Get ready to kick off your July... │
│ (Multi-line description text)       │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│         Accept Invite               │
└─────────────────────────────────────┘
```

## Technische Details

### Komponente

**Datei:** `src/screens/EventScreen.tsx`

### Key Features

1. **Hero Section**
   - Full-width Image oder Gradient-Fallback
   - 3:4 Aspect Ratio (Höhe = 75% der Screen-Width)
   - Title Overlay mit Dark Gradient (transparent → rgba(0,0,0,0.85))
   - Back Button (oben links, floating)

2. **Host Card**
   - Avatar mit Initial-Letter
   - "invited you" Subtext (Luma-Style)
   - Three-dot Menu rechts

3. **Action Buttons**
   - 4 Buttons: Register, Contact, Share, More
   - Flexbox Row mit gap: 8px
   - Icons: Ionicons (`checkbox-outline`, `mail-outline`, `share-outline`, `ellipsis-horizontal`)
   - Register Button: Primary Style (Border)

4. **Location Card**
   - Address + City/Country
   - Weather Icon + Temperature (Placeholder: 18°C)
   - Map Placeholder (200px height, centered Icon)

5. **Host Section**
   - Avatar + Name
   - "Contact" Link rechts

6. **About Event**
   - Section Title: "ABOUT EVENT" (uppercase, 13px, spacing 0.5)
   - Description Text (15px, line-height 24px)

7. **CTA Button**
   - "Accept Invite" (Primary Background)
   - Full-width, 56px height, border-radius 12px

### Props & State

```typescript
const params = useLocalSearchParams<{ id?: string; eventId?: string }>();
const id = params.id || params.eventId; // Support both URL patterns

const [event, setEvent] = useState<EventDetailResponse | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

### API Integration

```typescript
const loadEvent = async () => {
    const token = await getSession();
    const data = await api.getEventById(id!, token || undefined);
    setEvent(data);
};
```

### Navigation

**Bottom Nav:** Deaktiviert (`showBottomNav={false}`)
- Event-Details sind Fullscreen-Experience
- Back Button im Hero statt Bottom Nav

## Styling (DESIGN.md Compliance)

### Colors (Material Design 3 Tokens)

```typescript
const { colors } = useTheme();

// Backgrounds
backgroundColor: colors.background
backgroundColor: colors.surfaceContainer
backgroundColor: colors.surfaceContainerHigh

// Text
color: colors.onSurface
color: colors.onSurfaceVariant
color: colors.primary

// Buttons
backgroundColor: colors.primary
color: colors.onPrimary
```

### Typography

```typescript
// Hero Title
fontSize: 32 // h2 from DESIGN.md
fontWeight: '700'
letterSpacing: -0.5

// Hero Date
fontSize: 16 // body-md
color: 'rgba(255,255,255,0.9)'

// Body Text
fontSize: 15 // body-md
lineHeight: 24

// Section Titles
fontSize: 13
fontWeight: '600'
textTransform: 'uppercase'
letterSpacing: 0.5
```

### Spacing

```typescript
// Content Padding
paddingHorizontal: 24 // grid_margin from DESIGN.md
paddingTop: 24

// Card Padding
padding: 16

// Section Margins
marginBottom: 32

// Button Gaps
gap: 8
```

### Border Radius

```typescript
// Cards
borderRadius: 16 // card_radius_large from DESIGN.md

// Buttons
borderRadius: 12 // card_radius from DESIGN.md

// Circular (Avatar)
borderRadius: 24 // 50% of 48px
```

### Elevation

```typescript
// Back Button
elevation: 4
shadowColor: '#000'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.2
shadowRadius: 4

// CTA Button
elevation: 2
shadowColor: '#000'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.1
shadowRadius: 4
```

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/screens/EventScreen.tsx` | Komplett neu implementiert (1555 → 402 Zeilen) |
| `app/event/[eventId].tsx` | Route bleibt unverändert (Export von EventScreen) |

## Bekannte Limitationen

1. **Map Integration:** Aktuell nur Placeholder mit Icon
   - TODO: React Native Maps oder Mapbox Integration
   - TODO: Event-Location als Pin anzeigen

2. **Weather API:** Hardcoded 18°C Placeholder
   - TODO: OpenWeatherMap oder ähnliche API integrieren
   - TODO: Location-basierte Weather-Daten

3. **RSVP Logic:** Noch nicht implementiert
   - TODO: "Accept Invite" Button → RSVP Status setzen
   - TODO: RSVP Status anzeigen (Accepted/Pending/Declined)

4. **Share Funktionalität:** Noch nicht implementiert
   - TODO: Native Share API (iOS/Android)
   - TODO: Web Share API oder Fallback (Copy Link)

5. **Contact Host:** Noch nicht implementiert
   - TODO: Modal mit Kontaktformular oder Email-Link

## Testing

**Browser (Web):**
1. Navigiere zu einem Event (z.B. `/event/1`)
2. Hero Image sollte sichtbar sein (oder Gradient bei fehlendem Bild)
3. Back Button (oben links) navigiert zurück
4. Action Buttons sind anklickbar (noch ohne Funktion)
5. Kein Bottom Nav sichtbar (Fullscreen)

**Mobile:**
- Safe Area wird für Back Button berücksichtigt (iOS)
- Touch Targets: Minimum 48px (Material Design 3 Guideline)

## Änderungshistorie

- **2026-05-05**: Initial implementiert
  - Luma-inspiriertes Layout
  - Material Design 3 Farben und Typography
  - Hero Image mit Title Overlay
  - Action Buttons Row
  - Location Card mit Map Placeholder
  - Host Section
  - About Event Section
  - Accept Invite CTA
