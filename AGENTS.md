## Commands

```bash
# Development
npm start          # Start Expo dev server (all platforms)
npm run web        # Start in browser at http://localhost:8081
npm run ios        # Start on iOS simulator
npm run android    # Start on Android emulator

# Quality
npm run lint       # Run ESLint

# Build
npm run build      # Export web build to dist/ (Expo export --platform web)
```

No test framework is configured yet.

## Environment

Copy `.env.example` to `.env.local` and fill in the values:
- `EXPO_PUBLIC_BACKEND_URL` — REST API base URL
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase instance URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase public anon key

All runtime env vars must use the `EXPO_PUBLIC_` prefix to be accessible in frontend code.

## Architecture

This is an **Expo SDK 54** app (React Native 0.81 + React 19) targeting iOS, Android, and web. The project has `newArchEnabled: true` and the React Compiler experiment enabled in `app.json`.

### Navigation

The app uses **React Navigation** (not Expo Router's file-based routing despite `app/` existing). `app/_layout.tsx` and `app/index.tsx` are thin bootstraps that render `src/components/App.tsx`, which sets up the `NavigationContainer`. The real route tree lives in `src/navigation/RootNavigator.tsx` — a `createNativeStackNavigator` with three routes: `Home`, `Login`, `Event`.

Deep-link scheme: `happin://` (routes: `/`, `/login`, `/event`).

Use the typed navigation wrapper instead of raw hooks:
```typescript
import { useAppNavigation } from '@/src/utils/useAppNavigation';
```

### Theming

Every screen gets colors through `useTheme()` from `hooks/use-theme.ts`. It returns `{ colors, isDark }` based on the system color scheme. Color tokens follow **Material Design 3** and are defined in `constants/colors.ts` with separate `light` and `dark` objects.

Always destructure `colors` from `useTheme()` at the top of a component — do not hard-code hex values in screen files.

### Styling

Use React Native's `StyleSheet.create`. Styles that depend on the theme must be computed inside the component (not at module level) so they can reference `colors`. Responsive behaviour uses `Dimensions.get('window')` and `Platform.OS` checks.

### Component Structure

```
src/
  components/
    App.tsx           # Root: NavigationContainer + linking config
    atoms/            # Smallest reusable pieces (SVG icons, etc.)
  navigation/
    RootNavigator.tsx # Stack navigator definition
  screens/            # One file per screen
  utils/              # Typed hooks and small helpers
constants/            # Static data shared across screens (colors, SVG paths)
hooks/                # Custom React hooks
```

Screens own their local state (useState/useReducer). There is no global state library — keep state local until a clear cross-screen need emerges.

### SVG

The Berlin map on `HomeScreen` is built from raw SVG path data in `constants/berlin-map-paths.ts` and rendered via `react-native-svg`. Custom icon components live in `src/components/atoms/icons.tsx`.

## Documentation

The `documentation/` folder is the source of truth for project context and design decisions:

- `documentation/00-index.md` — index of all docs
- `documentation/DESIGN.md` — complete design system (colors, typography, spacing, elevation, component specs for both themes)

**Always read the relevant docs before starting a task.** When making changes, document them in the appropriate file in `documentation/`. New topics that don't fit an existing file get their own file, registered in `00-index.md`.

**All documentation must live in `documentation/` — never create doc files outside this folder.**
Every major Change should be well documented (eventually in an own file).

`DESIGN.md` in particular must be consulted before touching any UI. It defines:
- Full MD3 color token sets for both `light` ("Happin Light") and `dark` ("Neon Horizon") themes
- Typography scales and font families (`Plus Jakarta Sans` for headings in light mode, `Inter` everywhere in dark mode)
- 8px spacing system with named tokens (`xs` 4px → `xxl` 48px)
- Elevation/depth model (ambient shadows in light; tonal layering + glassmorphism in dark)
- Shape language (large rounded corners; 8 / 12–16 / 20px radius tiers; pill = 9999px)
- Component specs: buttons (min 48px height), cards (20px radius, nested image 16px radius), inputs, chips, FAB

## TypeScript

Strict mode is enabled. Path alias `@/*` maps to the repo root (e.g. `@/src/screens/HomeScreen`).

## Git

If you make commits, they should always be in german.
