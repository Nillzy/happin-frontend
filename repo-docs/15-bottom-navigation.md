---
title: Bottom Navigation Bar
created: 2026-05-04
status: implemented
---

# Bottom Navigation Bar

## Überblick

Die Bottom Navigation Bar ist die primäre Navigationsmethode für **Mobile**. Ab Viewport-Breite ≥ 768px (Tablet/Desktop/Web) wird sie ausgeblendet — die Navigation erfolgt dann über die Top-Navbar.

## Responsive Verhalten

| Viewport | Navigation |
|----------|-----------|
| < 768px (Mobile/Web-schmal) | Bottom Nav sichtbar, Navbar versteckt |
| ≥ 768px (Tablet/Desktop) | Bottom Nav versteckt, Navbar mit Tab-Links |

Gesteuert in `ScreenWithNav.tsx`:
```tsx
const isMobile = Platform.OS !== 'web' || width < 768;
{showBottomNav && isMobile && <BottomNavBar />}
```

## Design

### HappinLogo in der Mitte
Unter dem Erstellen-Button wird das `HappinLogo size="sm"` angezeigt — skaliert auf 70% (`transform: scale(0.7)`) und `opacity: 0.8`.

### Tab-Struktur

| Tab | Route | Icon (Ionicons) |
|-----|-------|-----------------|
| **Explore** | `/events` | `compass-outline` / `compass` |
| **Karte** | `/map` | `map-outline` / `map` |
| **Erstellen** | `/events/create` | Floating `add-circle` + HappinLogo darunter |
| **Events** | `/my-events` | `calendar-outline` / `calendar` |
| **Konto** | `/account` | `person-outline` / `person` |

### Tab-States

**Aktiver Tab:**
- Icon: Filled-Variante (z.B. `compass` statt `compass-outline`)
- Farbe: `colors.primary` (#b32053 light, #ffb1c0 dark)
- Text: Fett (fontWeight 600)

**Inaktiver Tab:**
- Icon: Outline-Variante
- Farbe: `colors.onSurfaceVariant`
- Text: Normal (fontWeight 500)

### Typography
- **Font Size**: 11px
- **Letter Spacing**: 0.2
- **Margin Top**: 2px (zwischen Icon und Label)

## Tab-Struktur

Die Bottom Nav enthält 5 Tabs:

| Tab | Route | Icon (Ionicons) | Beschreibung | Pflichtenheft-Referenz |
|-----|-------|-----------------|--------------|------------------------|
| **Explore** | `/events` | `compass-outline` / `compass` | Öffentliche Eventliste | M11 - Öffentliche Eventliste |
| **Karte** | `/map` | `map-outline` / `map` | Kartenansicht mit Event-Pins | S6 - Kartensuche |
| **Erstellen** | `/events/create` | `add-circle-outline` / `add-circle` | Event erstellen | M2 - Event-Erstellung |
| **Events** | `/my-events` | `calendar-outline` / `calendar` | Eigene Events verwalten | M7 - Host-Übersicht |
| **Konto** | `/account` | `person-outline` / `person` | Account & Profil | Accountverwaltung |

## Technische Implementierung

### Komponenten-Hierarchie

```
ScreenWithNav (Wrapper)
└── View (flex: 1)
    ├── {children} (Screen Content)
    └── BottomNavBar
```

### Dateien

**Core Components:**
- `src/components/atoms/BottomNavBar.tsx` - Die Bottom Navigation Bar Komponente
- `src/components/atoms/ScreenWithNav.tsx` - Wrapper für Screens mit Bottom Nav

**Integration:**
Die folgenden Screens verwenden `ScreenWithNav`:
- `src/screens/EventListScreen.tsx` - Explore Tab
- `src/screens/MapScreen.tsx` - Karte Tab
- `src/screens/MyEventsScreen.tsx` - Events Tab
- `src/screens/AccountScreen.tsx` - Konto Tab

### Routing

Die Bottom Nav nutzt **Expo Router** für Navigation:

```typescript
import { useRouter, usePathname } from 'expo-router';

const router = useRouter();
router.push(tab.route);
```

**Aktiver Tab Detection:**
```typescript
const pathname = usePathname();
const activeTab = NAV_TABS.find((tab) => {
    if (tab.route === '/events' && pathname === '/events') return true;
    if (tab.route === pathname) return true;
    if (pathname.startsWith(tab.route + '/')) return true;
    return false;
});
```

### Icon Library

**@expo/vector-icons** (bereits installiert):
```typescript
import { Ionicons } from '@expo/vector-icons';

<Ionicons name="compass-outline" size={24} color={iconColor} />
```

## Plattform-Spezifika

### Web
- Bottom Nav ist **standardmäßig aktiviert** (auch für Testing)
- Kann via `showBottomNav={false}` prop in `ScreenWithNav` deaktiviert werden

### Mobile (iOS/Android)
- Bottom Nav ist immer sichtbar
- Safe Area Insets werden automatisch berücksichtigt
- Touch Target: Minimum 48x48px (Material Design 3 Guideline)

## Verwendung

### Screen mit Bottom Nav erstellen

```typescript
import ScreenWithNav from '@/src/components/atoms/ScreenWithNav';

export default function MyScreen() {
    return (
        <ScreenWithNav>
            <View style={{ flex: 1 }}>
                {/* Screen Content */}
            </View>
        </ScreenWithNav>
    );
}
```

### Bottom Nav deaktivieren (z.B. für Fullscreen-Screens)

```typescript
<ScreenWithNav showBottomNav={false}>
    {/* Content */}
</ScreenWithNav>
```

## Design-Compliance

Die Bottom Navigation folgt den Vorgaben aus `DESIGN.md`:

✅ **Spacing**: 8px System (padding, gaps)
✅ **Border Radius**: 0 (Bottom Nav hat keine rounded corners)
✅ **Elevation**: Platform-spezifische Shadows (iOS/Android)
✅ **Colors**: Material Design 3 Tokens aus `constants/colors.ts`
✅ **Typography**: Inter (11px, fontWeight 500/600)
✅ **Touch Targets**: Minimum 48px Höhe

## Bekannte Einschränkungen

1. **Glassmorphismus (Dark Mode)**: 
   - Aktuell nur Transparenz, kein Backdrop-Blur auf Native
   - TODO: `@react-native-community/blur` für iOS/Android BlurView einbauen

2. **Nested Navigation**:
   - Die Bottom Nav erscheint auf allen Screens, die `ScreenWithNav` verwenden
   - Event-Detail-Screens (`/event/[id]`) haben KEINE Bottom Nav (gewollt)

3. **Animation**:
   - Keine Transition-Animationen zwischen Tabs
   - TODO: Animierte Tab-Wechsel (optional)

## Testing

**Browser (Web):**
1. Öffne http://localhost:8081/map
2. Aktiviere Responsive Design Mode (F12 → Device Toolbar)
3. Wähle Mobile Device (z.B. iPhone 14 Pro)
4. Bottom Nav sollte am unteren Rand sichtbar sein

**Mobile Device (USB):**
1. Verbinde Android/iOS per USB
2. `adb reverse tcp:8081 tcp:8081` (Android)
3. Öffne Expo Go → `exp://localhost:8081`

## Änderungshistorie

- **2026-05-04**: Initial implementiert (Branch: `feature/ui-framework-with-mockup-data`)
  - 5 Tabs mit Ionicons
  - ScreenWithNav Wrapper
  - Integration in EventListScreen, MapScreen, MyEventsScreen, AccountScreen
  - FAB ("+"-Button) aus EventListScreen entfernt (Event-Erstellung erfolgt über "Erstellen" Tab)
  - EventCreateStepOne mit ScreenWithNav gewrapped (Bottom Nav bleibt während Event-Erstellung sichtbar)
