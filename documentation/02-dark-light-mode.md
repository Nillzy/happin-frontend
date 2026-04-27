# Dark/Light Mode Toggle

## Übersicht

Die App unterstützt einen manuell schaltbaren Dark/Light Mode. Der Nutzer kann über einen animierten Toggle-Switch in der Navigationsleiste des HomeScreens zwischen den beiden Modi wechseln — unabhängig von der Systemeinstellung des Geräts.

## Architektur

### ThemeContext (`context/ThemeContext.tsx`)

Zentraler React Context, der den Theme-Zustand für die gesamte App bereitstellt.

```
ThemeProvider (App.tsx)
└── useTheme() → { colors, isDark, toggleTheme }
```

**State-Logik:**
- Standardmäßig wird die OS-Einstellung via `useColorScheme()` gelesen.
- Beim ersten Tippen auf den Toggle wird ein manueller Override (`'light' | 'dark'`) gesetzt, der die OS-Einstellung dauerhaft überschreibt (für die App-Session).

**Exportierter Hook:**
```ts
useTheme(): { colors: ThemeColors; isDark: boolean; toggleTheme: () => void }
```

### use-theme.ts (`hooks/use-theme.ts`)

Re-exportiert `useTheme` aus dem Context. Alle Screens importieren weiterhin von `@/hooks/use-theme` — keine Änderungen an bestehenden Screens nötig.

### DarkLightToggle (`src/components/atoms/DarkLightToggle.tsx`)

Animierter Pill-Toggle im Material Design Stil (ohne Textlabels).

**Aufbau:**

```
┌──────────────────────────────────┐
│  ☀︎  ●                           │   ← Light Mode (Thumb links)
└──────────────────────────────────┘

┌──────────────────────────────────┐
│                         ●  ☽    │   ← Dark Mode (Thumb rechts)
└──────────────────────────────────┘
```

| Element | Beschreibung |
|---------|--------------|
| Track | Pill-Form, Farbe interpoliert von `#e8e0f0` (light) → `#2d2640` (dark) |
| Thumb | Weißer Kreis mit Shadow, gleitet mit Spring-Animation |
| Icon links | Sonnen-SVG (`#f5a623`), blendet bei Dark Mode aus |
| Icon rechts | Mond-SVG (`#cdbdff`), blendet bei Light Mode aus |
| Icon im Thumb | Kontextabhängig: Sonne (`#b32053`) oder Mond (`#6645c7`) |

**Animationen** (via `react-native-reanimated`):
- Thumb-Position: `withSpring` (damping 18, stiffness 200)
- Track-Farbe: `interpolateColor`
- Icon-Opacity: `withTiming` (180 ms)

**Maße:**

| Eigenschaft | Wert |
|-------------|------|
| Track Breite | 56 px |
| Track Höhe | 28 px |
| Thumb Durchmesser | 22 px |
| Thumb Padding | 3 px |

## Integration

### App.tsx

Der `ThemeProvider` wrapping die gesamte App:

```tsx
<ThemeProvider>
  <NavigationContainer linking={linking}>
    <RootNavigator />
  </NavigationContainer>
</ThemeProvider>
```

### HomeScreen NavBar

Der Toggle sitzt rechts in der Navigationsleiste, neben dem "App laden"-Button:

```tsx
<View style={styles.navRight}>
  <DarkLightToggle />
  <TouchableOpacity style={styles.navCta}>...</TouchableOpacity>
</View>
```

## Verwendung in Screens

Jeder Screen ruft `useTheme()` auf und erhält `colors` und `isDark`. `toggleTheme` muss nur dort verwendet werden, wo der Toggle gerendert wird.

```ts
import { useTheme } from '@/hooks/use-theme';

const { colors, isDark } = useTheme();
```

## Betroffene Dateien

| Datei | Änderung |
|-------|---------|
| `context/ThemeContext.tsx` | Neu — Context, Provider, Hook |
| `hooks/use-theme.ts` | Re-exportiert `useTheme` aus Context |
| `src/components/App.tsx` | `ThemeProvider` hinzugefügt |
| `src/components/atoms/DarkLightToggle.tsx` | Neu — Toggle-Komponente |
| `src/screens/HomeScreen.tsx` | Toggle in NavBar eingebaut |
