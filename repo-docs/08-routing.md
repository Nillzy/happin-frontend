# Routing (Expo Router)

## Überblick

Die App nutzt **Expo Router** (file-based Routing) statt manueller React Navigation. Jede Datei im `app/`-Verzeichnis wird automatisch zu einer Route. Das löst das Problem, dass bei Browser-Reload auf einer Unterseite "Seite nicht gefunden" angezeigt wurde.

## Dateistruktur

```
app/
  _layout.tsx              # Root Layout: ThemeProvider + Stack
  index.tsx                # HomeScreen (/)
  login.tsx                # LoginScreen (/login)
  events/
    index.tsx              # EventListScreen (/events)
    create.tsx             # EventCreateScreen (/events/create)
  event/
    [eventId].tsx          # EventScreen (/event/123)
  +not-found.tsx           # 404 Fallback-Seite
```

Jede Route-Datei re-exportiert den Screen aus `src/screens/`:

```typescript
export { default } from '@/src/screens/EventListScreen';
```

Die Screen-Logik bleibt vollständig in `src/screens/` — Route-Dateien sind nur dünne Weiterleitungen.

## Navigation

### `useRouter()` statt `useAppNavigation()`

Alle Screens und Components nutzen `useRouter()` aus `expo-router`:

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/events');           // Zur Eventliste navigieren
router.push(`/event/${eventId}`); // Zu einem Event navigieren
router.replace('/login');         // Ersetzen (kein Zurück-Button)
router.back();                    // Zurück-Navigation
```

### Route-Params

Dynamische Segmente (z.B. `[eventId]`) werden über `useLocalSearchParams()` gelesen:

```typescript
import { useLocalSearchParams } from 'expo-router';

const { eventId } = useLocalSearchParams<{ eventId: string }>();
const id = Number(eventId); // Params sind auf Web immer Strings
```

## Web-Verhalten

- `app.json` → `"web.output": "static"` — jede Route bekommt eine eigene HTML-Datei
- Browser-Reload auf jeder URL funktioniert ohne Server-Konfiguration
- Statische Routen (`events/create.tsx`) haben Vorrang vor dynamischen (`event/[eventId].tsx`)

## Vorherige Architektur (entfernt)

Folgende Dateien wurden entfernt, da Expo Router sie ersetzt:
- `src/components/App.tsx` — NavigationContainer mit manueller Linking-Config
- `src/navigation/RootNavigator.tsx` — createNativeStackNavigator mit Route-Definitionen
- `src/utils/useAppNavigation.ts` — Typed Navigation Wrapper

## Konfiguration

- **Expo Router Plugin:** In `app.json` unter `plugins` registriert
- **Typed Routes:** `experiments.typedRoutes: true` in `app.json`
- **Deep-Link Scheme:** `happinfrontend://` (definiert in `app.json` unter `scheme`)
