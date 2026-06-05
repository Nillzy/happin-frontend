# Sitzungsverwaltung

**Kategorie:** A-Software  
**Entwurfs-Entsprechung:** `<<component>> Sitzungsverwaltung`  
**Implementierung:** `src/contexts/AuthContext.tsx`, `src/contexts/SavedEventsContext.tsx`, `src/contexts/ReminderSettingsContext.tsx`

## Beschreibung

Die `Sitzungsverwaltung` kennt alle angemeldeten Benutzer (also alle aktiven Sitzungen) und stellt deren Sitzungsdaten bereit. In einer Single-User-App wie Happin verwaltet sie die eine aktive Sitzung des eingeloggten Nutzers.

[→ Im Architekturentwurf ansehen](<https://gitlab.com/groups/dhbw-se/se-tinf24b2/happin/-/wikis/Entwurf/Komponentendiagramm#:~:text=Co%2DHost%2DSitzung)-,Sitzungsverwaltung,-M1%20(Kenntnis%20aller>)

## Schnittstellen

| Schnittstelle | Richtung | Beschreibung |
|---|---|---|
| `SessionInfo` | → Sitzungssteuerung, BackendAdapter | Auth-Status, User-Objekt, Session-Token |
| `TermSsn` | ← Sitzungssteuerung | Sitzung beenden (signOut) |

## AuthContext (`src/contexts/AuthContext.tsx`)

Der `AuthContext` ist die Kernkomponente der Sitzungsverwaltung:

```tsx
interface AuthContextType {
  session: Session | null;     // Supabase-Session mit JWT
  user: User | null;           // Eingeloggter Nutzer
  loading: boolean;            // Initialisierung läuft
  signOut: () => Promise<void>;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Initialisierung: bestehende Session laden
    getSupabaseClient().auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // Reaktiv auf Auth-Änderungen (Login, Logout, Token-Refresh)
    const { data: { subscription } } = getSupabaseClient().auth
      .onAuthStateChange((_, session) => {
        setSession(session);
      });

    return () => subscription.unsubscribe();
  }, []);
}
```

## Session-Persistenz

Sessions werden persistent gespeichert, sodass der Nutzer nach einem App-Neustart eingeloggt bleibt:

```tsx
// src/utils/LargeSecureStore.ts
// Wrapper um expo-secure-store für große JWT-Tokens
// (expo-secure-store hat ein Größenlimit → Token wird aufgeteilt)
class LargeSecureStore {
  async setItem(key: string, value: string): Promise<void>
  async getItem(key: string): Promise<string | null>
  async removeItem(key: string): Promise<void>
}
```

## SavedEventsContext

Verwaltet die gespeicherten/gebookmarkten Events des Nutzers:

```tsx
interface SavedEventsContextType {
  savedEventIds: string[];
  toggleSaveEvent: (eventId: string) => void;
  isSaved: (eventId: string) => boolean;
}
```

Gespeichert in `AsyncStorage` – lokal auf dem Gerät, kein Backend-Sync.

## ReminderSettingsContext

Verwaltet die Push-Erinnerungseinstellungen:

```tsx
interface ReminderSettingsContextType {
  reminderSettings: Record<string, ReminderTime>;
  setReminder: (eventId: string, time: ReminderTime) => void;
  clearReminder: (eventId: string) => void;
}
```

## signOut-Flow

```tsx
const signOut = async () => {
  // 1. Push-Token vom Backend deregistrieren
  await api.unregisterPushToken();
  // 2. Auth-Daten löschen
  await clearAuthData();
  // 3. Supabase-Session beenden
  await getSupabaseClient().auth.signOut();
};
```

## Abhängigkeiten

- `src/services/supabase.ts` – Supabase Auth Client
- `src/utils/LargeSecureStore.ts` – Sichere Token-Persistenz
- `expo-secure-store` (T-Software) – Gerätespeicher
- [`BackendAdapter`](backend-adapter.md) – Push-Token-Deregistrierung bei Logout
