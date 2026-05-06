# Navbar & Footer Components

Dieses Dokument beschreibt die wiederverwendbaren Layout-Komponenten `Navbar`, `Footer` und `HappinLogo`.

---

## Übersicht

Drei neue Atom-Komponenten in `src/components/atoms/`:

| Datei | Beschreibung |
|-------|-------------|
| `HappinLogo.tsx` | Brand-Logo: SVG-Pin-Icon + „happin"-Wordmark |
| `Navbar.tsx` | Obere Navigation: Logo (links) + Account-Button (rechts) + optionaler CTA |
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

<Navbar showCta />          // Logo (links) + "App laden"-Button (rechts)
<Navbar showBack />         // "← Zurück"-Button (links)
<Navbar />                  // Nur Logo, kein CTA
<Navbar showNavItems={false} /> // Desktop-Nav-Items unterdrücken (z.B. Startseite)
```

**Props:**

| Prop | Default | Beschreibung |
|------|---------|-------------|
| `showCta` | `false` | Zeigt „App laden"-Button rechts (nur wenn keine Nav-Items aktiv) |
| `showBack` | `false` | Ersetzt Logo durch „← Zurück"-Button |
| `onBackPress` | `router.back()` | Optionaler Custom-Handler für Zurück |
| `showNavItems` | `true` | Nav-Items auf Desktop anzeigen (auf `false` z.B. für Startseite) |

- **Rendert `null`** wenn `Platform.OS !== 'web'` oder Viewport `< 768px` — auf Mobile nie sichtbar
- Feste Höhe: 52px (+ iOS Safe Area)
- Hintergrund: `colors.background`, Bottom-Border subtil

### Desktop-Navigation (≥ 768px, Web)

Wenn `showNavItems={true}` (default) und `showBack={false}`, werden die 4 Tab-Links rechts angezeigt:

| Tab | Route | Icon |
|-----|-------|------|
| Explore | `/events` | `compass` |
| Karte | `/map` | `map` |
| Events | `/my-events` | `calendar` |
| Konto | `/account` | `person` |

Plus outlined „Event erstellen"-Button ganz rechts (`borderWidth: 1`, `borderColor: colors.primary`, Pill-Form).

- Aktiver Tab: `colors.primary`, leichter `primaryContainer`-Hintergrund
- Inaktiver Tab: `colors.onSurfaceVariant`
- `fontWeight: '600'` immer (kein Layout-Shift beim Aktivieren)

---

## Integration

| Screen | Navbar-Modus | Mobile |
|--------|-------------|--------|
| `HomeScreen` | `showNavItems={false}` | nicht sichtbar (null) |
| `EventListScreen` | `showCta={false}` | nicht sichtbar (null) |
| `MapScreen` | `showCta={false}` | nicht sichtbar (null) |
| `MyEventsScreen` | `showCta={false}` | nicht sichtbar (null) |
| `AccountScreen` | `showCta={false}` | nicht sichtbar (null) |
| `EventCreateStepOneNew` | `showBack` | nicht sichtbar → eigener mobiler Zurück-Header |
| `EventCreateStepTwo` | `showBack` | nicht sichtbar → eigener mobiler Zurück-Header |
