## Commands

```bash
# Development
npm start          # Start Expo dev server (all platforms)
npm run web        # Start in browser at http://localhost:8081
npm run ios        # Start on iOS simulator
npm run android    # Start on Android emulator

# Physical Device Development (iOS/Android)
npm start          # Start Expo, then scan QR code with Expo Go app

# Quality
npm run lint       # Run ESLint
npm test           # Run all tests (Jest)
npm run test:watch # Run tests in watch mode
npm run test:coverage # Generate coverage report (HTML + LCOV)

# Build
npm run build      # Export web build to dist/ (Expo export --platform web)
```

## Testing

**Test Framework:** Jest 29.7.0 + ts-jest  
**Test Suites:** 16 test files, 551 tests  
**Execution Time:** ~7 seconds

### Test Coverage
- **Statement Coverage:** 94.04%
- **Branch Coverage:** 82.84%
- **Function Coverage:** 95.10%
- **Line Coverage:** 95.17%

### Running Tests
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate HTML report → open coverage/index.html
```

**Mocking Strategy:**  
- MSW für API-Calls in Services
- Global `fetch` mocking
- Jest-Mocks für External SDKs (expo-secure-store, AsyncStorage, etc.)
- TypeScript strict mode maintained

See [repo-docs/38-test-summary.md](repo-docs/38-test-summary.md) for detailed test documentation.

## Local Development on Physical Devices

### Problem: macOS Firewall blocks LAN connections

When developing on a physical device (iPhone/Android), the device cannot reach `http://localhost:8001` on your Mac. The standard solution (using your Mac's local IP like `http://192.168.x.x:8001`) fails if macOS Firewall is enabled, which blocks incoming connections from other devices.

### Solution: ngrok tunnel for backend

Use **ngrok** to create a public tunnel to your local backend that bypasses the firewall:

#### 1. Start Backend (on 0.0.0.0 to accept external connections)
```bash
cd /Users/I749987/Documents/vs-code/happin/happin-backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

#### 2. Start ngrok tunnel (in separate terminal)
```bash
ngrok http 8001
```

This outputs a public URL like:
```
https://abc-xyz-123.ngrok-free.dev
```

#### 3. Update Frontend .env.local
```bash
# .env.local
EXPO_PUBLIC_BACKEND_URL=https://abc-xyz-123.ngrok-free.dev
EXPO_PUBLIC_SUPABASE_URL=https://hylnqapjtkgqyxvmfqgy.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_EE_Ih9vyxOh7cKAPySDLqg_a3ZdrnzA
```

#### 4. Start Expo
```bash
cd /Users/I749987/Documents/vs-code/happin/happin-frontend
npm start
```

#### 5. Open on Device
- Scan the QR code with **Expo Go** app (iOS App Store / Google Play)
- Ensure your Mac and phone are on the **same Wi-Fi** (for Expo Metro bundler)
- The app will connect to the backend via the ngrok tunnel

### Important Notes

- **ngrok URL changes** on every restart unless you use a paid ngrok account with a fixed domain
- After restarting ngrok, update `EXPO_PUBLIC_BACKEND_URL` in `.env.local` and restart Expo
- **Supabase auth works directly** from the phone because it uses the public Supabase URL (no tunnel needed)
- **Performance**: ngrok adds latency (~100-300ms) but is acceptable for development

### Alternative: Disable macOS Firewall (less secure)

If you don't want to use ngrok:
1. Go to **System Settings → Network → Firewall**
2. Add **Python** to allowed apps
3. Use your Mac's local IP in `.env.local`: `http://192.168.x.x:8001`
4. Find your IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`

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

**Responsive Layout Patterns:**

1. **Platform-specific rendering:**
   ```typescript
   const isWeb = Platform.OS === 'web';
   
   return isWeb ? <WebLayout /> : <MobileLayout />;
   ```

2. **Dynamic dimensions:**
   ```typescript
   const [dimensions, setDimensions] = useState(Dimensions.get('window'));
   
   useEffect(() => {
       const subscription = Dimensions.addEventListener('change', ({ window }) => {
           setDimensions(window);
       });
       return () => subscription?.remove();
   }, []);
   ```

3. **Breakpoints for Web:**
   ```typescript
   function getNumColumns(width: number): number {
       if (width >= 1200) return 3;
       if (width >= 768) return 2;
       return 1;
   }
   ```

**EventListScreen** uses this pattern: `FlatList` (virtualized) for Mobile, Flexbox Grid for Web with responsive columns.

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

The project has **two separate documentation folders** with different purposes — do not confuse them:

- **`repo-docs/`** — Implementation-level documentation for developers and AI agents working in the codebase. Tracks feature history, UI decisions, auth flows, migration paths, workarounds. Used as a working aid during implementation. **This is where you write.**
- **`docs/`** — Stakeholder documentation rendered via MkDocs. Describes the **architecture** of the frontend (ViewModels, components, design-vs-implementation mapping). Served at `/docs` when `EXPO_PUBLIC_DEBUG=true`. **Do not document implementation details here.**

See [`repo-docs/34-documentation-concept.md`](repo-docs/34-documentation-concept.md) for the full concept.

`repo-docs/` is the source of truth for project context and design decisions:

- `repo-docs/00-index.md` — index of all docs
- `repo-docs/DESIGN.md` — complete design system (colors, typography, spacing, elevation, component specs for both themes)

**Always read the relevant docs before starting a task.** When making changes, document them in the appropriate file in `repo-docs/`. New topics that don't fit an existing file get their own file, registered in `00-index.md`.

**All implementation documentation must live in `repo-docs/` — never create doc files outside this folder.** (Exception: architectural docs belong in `docs/`.)
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
Never push to the main branch. If you start a new topic open a new one.

## Event Absagen

Hosts können Events absagen via `POST /api/v1/events/{event_id}/cancel`. Bezahlte Tickets werden vom Backend automatisch via Stripe zurückerstattet; das Event bleibt dauerhaft für Host und Teilnehmer sichtbar (kein 48h-Fenster).

- `api.cancelEvent(eventId, token): Promise<RefundSummary>` in `src/services/api.ts` — sagt Event ab und liefert `RefundSummary` (`refunded_count`, `failed_count`, `failed_order_ids`, `skipped_count`)
- `EventListItem.is_cancelled?: boolean` und `EventListItem.cancelled_at?: string | null` in `src/types/events.ts`
- `RefundSummary` Interface in `src/types/events.ts`
- Cancel-Button + Bestätigungs-Modal in `src/screens/EventHostScreen.tsx` — Sperre, sobald `is_cancelled === true` (kein 48h-Block vor Absage)
- "Abgesagt"-Badge in `src/screens/MyEventsScreen.tsx` — `opacity: 0.55` bei abgesagten Events
- Roter Banner in `src/screens/EventScreen.tsx` — bei `is_cancelled === true`; alle modifizierenden Buttons (RSVP, Tickets, Custom Fields, Verwalten) werden disabled
