# Zeitabhängiger Slogan

Der Slogan auf der Startseite (HomeScreen) passt sich dynamisch an die aktuelle Tageszeit des Nutzers an.

## Übersicht

Der Slogan spricht den Nutzer je nach Tageszeit unterschiedlich an - von einer lockeren Frage morgens bis zu einem freundlichen "Wir auch." nachts.

## Zeitbereiche und Slogans

| Zeitraum | Uhrzeiten | Slogan |
|----------|-----------|--------|
| Morgen | 06:00 - 09:59 | Was geht heute? Finde es heraus. |
| Nachmittag | 10:00 - 17:59 | Pläne für heute Abend? Mach' Dir welche. |
| Abend | 18:00 - 21:59 | Heute Abend noch nichts vor? Hol' Dir Inspiration. |
| Nacht | 22:00 - 05:59 | Noch wach? Wir auch. |

## Implementierung

### Hilfsfunktion

Die Logik ist in einer eigenen Hilfsfunktion gekapselt:

**Datei:** `src/utils/getTimeBasedSlogan.ts`

```typescript
export function getTimeBasedSlogan(): { firstLine: string; secondLine: string }
```

Die Funktion:
- Ermittelt die aktuelle Stunde via `new Date().getHours()`
- Gibt ein Objekt mit `firstLine` und `secondLine` zurück
- Kann leicht erweitert oder angepasst werden

### Integration im HomeScreen

**Datei:** `src/screens/HomeScreen.tsx`

```typescript
import { getTimeBasedSlogan } from '../utils/getTimeBasedSlogan';

// In der Komponente:
const slogan = getTimeBasedSlogan();

// Im JSX:
<Text style={[styles.headlineH1, { color: colors.onBackground }]}>
    {slogan.firstLine}{'\n'}
    <Text style={{ color: colors.primary }}>{slogan.secondLine}</Text>
</Text>
```

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/utils/getTimeBasedSlogan.ts` | Neue Hilfsfunktion |
| `src/screens/HomeScreen.tsx` | Import und Verwendung der Funktion |

## Hinweise

- Der Slogan wird bei jedem Rendern der Komponente neu berechnet
- Bei längerer Nutzung ohne Navigation aktualisiert sich der Slogan erst beim nächsten Rendern
- Die Zeitbereiche können in `getTimeBasedSlogan.ts` angepasst werden
