# Navbar & Footer Components

Dieses Dokument beschreibt die wiederverwendbaren Layout-Komponenten `Navbar`, `Footer` und `HappinLogo`.

---

## Übersicht

Drei neue Atom-Komponenten in `src/components/atoms/`:

| Datei | Beschreibung |
|-------|-------------|
| `HappinLogo.tsx` | Brand-Logo: SVG-Pin-Icon + „happin"-Wordmark |
| `Navbar.tsx` | Obere Navigation: Logo (navigiert zu Home) + DarkLightToggle + optionaler CTA |
| `Footer.tsx` | Untere Leiste: Logo + Datenschutz/Impressum/Kontakt-Links + Copyright |

---

## HappinLogo

```tsx
import HappinLogo from '@/src/components/atoms/HappinLogo';

<HappinLogo size="md" />           // sm | md | lg
<HappinLogo size="lg" color="#fff" /> // override color
```

- **Icon:** SVG-Locationpin mit Herz-Ausschnitt, Gradient von `primary` zu `primary`@70%
- **Wordmark:** „happin" in `fontWeight: '800'`
- **Größen:** `sm` (20px icon / 18px text), `md` (26/22), `lg` (36/32)
- Farbe folgt standardmäßig `colors.primary` aus `useTheme()`

---

## Navbar

```tsx
import Navbar from '@/src/components/atoms/Navbar';

<Navbar showCta />          // Standard: Logo + Toggle + "App laden"-Button
<Navbar showBack />         // Back-Variante: "← Zurück" + Toggle (für Login/Detail-Screens)
<Navbar />                  // Logo + Toggle, kein CTA
```

**Props:**

| Prop | Default | Beschreibung |
|------|---------|-------------|
| `showCta` | `false` | Zeigt „App laden"-Button rechts neben Toggle |
| `showBack` | `false` | Ersetzt Logo durch „← Zurück"-Button |

- Hintergrund: `colors.background`
- Bottom-Border: `rgba(255,255,255,0.06)` (dark) / `rgba(0,0,0,0.06)` (light)
- iOS: `paddingTop: 54` für Safe-Area-Ausgleich

---

## Footer

```tsx
import Footer from '@/src/components/atoms/Footer';

<Footer />
```

- Zeigt HappinLogo (klickbar → navigiert zu Home)
- Links: Datenschutz · Impressum · Kontakt (Platzhalter, noch ohne Routing)
- Copyright: © 2025 Happin. Alle Rechte vorbehalten.

---

## Integration

Alle drei Screens nutzen die Komponenten:

| Screen | Navbar-Modus | Footer |
|--------|-------------|--------|
| `HomeScreen` | `showCta` | ✓ |
| `LoginScreen` | `showBack` | ✓ |
| `EventScreen` | `showBack` | ✓ |

Die bisherigen Inline-Nav/-Footer in `HomeScreen` sowie der Back-Button und das Logo-`<Text>` in `LoginScreen` wurden entfernt.
Die heroNav-Buttons im EventScreen (← / ↑) wurden entfernt, da die Navbar die Zurück-Navigation übernimmt.
