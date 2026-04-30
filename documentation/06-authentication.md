# 06 – Authentication

## Überblick

Happin verwendet **Passwordless Authentication** via **E-Mail OTP** (One-Time Password). Es gibt kein Passwort — der Nutzer gibt seine E-Mail-Adresse ein, erhält einen 6-stelligen Code per E-Mail und bestätigt damit seine Identität. Dieses Verfahren wird vollständig über **Supabase Auth** abgewickelt.

Die Session-Verwaltung erfolgt automatisch durch den Supabase Client mit **persistierter, verschlüsselter Speicherung** und **automatischem Token-Refresh**.

---

## Ablauf (Flow)

```
[LoginScreen]
  1. Nutzer gibt E-Mail ein
  2. sendOtp(email)  →  Supabase sendet OTP-Mail
  3. Nutzer gibt 6-stelligen Code ein
  4. verifyOtp(email, token)  →  Supabase gibt Session zurück
  5. Supabase Client speichert Session automatisch (verschlüsselt via LargeSecureStore)
  6. AuthContext wird über onAuthStateChange informiert
  7. Navigation → EventListScreen

[App-Start]
  1. AuthProvider lädt persisted Session aus LargeSecureStore
  2. Supabase validiert Session
  3. Bei gültiger Session: Nutzer bleibt eingeloggt
  4. Bei abgelaufener Session: Automatischer Refresh (transparent im Hintergrund)

[EventScreen / EventCreateScreen]
  1. useAuth() hook liefert aktuellen session State
  2. Falls session null: Weiterleitung zu LoginScreen
  3. Falls session vorhanden: getSession() liefert aktuellen Access Token
  4. Token wird automatisch refreshed bevor er abläuft (kein manuelles Handling)
```

---

## Architektur

### 1. LargeSecureStore (Custom Storage Adapter)

**Problem:** Expo SecureStore hat ein **2048 Byte Limit**, Supabase Sessions (mit Refresh Token + Metadata) überschreiten dies oft.

**Lösung:** Hybrid-Ansatz mit **AES-256-CTR Encryption**
- **Encryption Key** (256 Bit) wird in **SecureStore** gespeichert (iOS Keychain / Android Keystore)
- **Session Data** wird verschlüsselt und in **AsyncStorage** gespeichert (unbegrenzte Größe)
- Bei jedem Zugriff: Decrypt via Key aus SecureStore

**Datei:** `src/utils/LargeSecureStore.ts`

**Sicherheit:**
- Encryption Key verlässt niemals SecureStore
- Session Data in AsyncStorage ist ohne Key unlesbar
- Jede App-Installation bekommt einen einzigartigen Key
- Bei Deinstallation werden Key und Daten gelöscht

**Interface:**
```typescript
class LargeSecureStore {
  async getItem(key: string): Promise<string | null>
  async setItem(key: string, value: string): Promise<void>
  async removeItem(key: string): Promise<void>
}
```

### 2. Supabase Client Konfiguration

**Datei:** `src/services/supabase.ts`

Der Supabase Client wird mit folgenden Auth-Optionen initialisiert:

```typescript
createClient(url, key, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,        // Automatisches Token Refresh vor Ablauf
    persistSession: true,           // Session über App-Restarts hinweg
    detectSessionInUrl: false,      // Deaktiviert für React Native (kein URL-OAuth)
  },
});
```

**Funktionen:**
- **Automatisches Token Refresh:** Supabase refresht Access Token ~5 Minuten vor Ablauf (Standard: 1 Stunde Lifetime)
- **Session Persistierung:** Session wird automatisch bei Login gespeichert und bei App-Start wiederhergestellt
- **Transparent:** Keine manuelle Token-Verwaltung nötig

### 3. AuthContext (Global State Management)

**Datei:** `src/contexts/AuthContext.tsx`

Der AuthProvider nutzt `supabase.auth.onAuthStateChange()` um auf alle Auth-Events zu reagieren:

**Events:**
- `INITIAL_SESSION` — Session bei App-Start geladen
- `SIGNED_IN` — Nutzer hat sich eingeloggt
- `SIGNED_OUT` — Nutzer hat sich ausgeloggt
- `TOKEN_REFRESHED` — Access Token wurde im Hintergrund refreshed
- `USER_UPDATED` — User-Daten wurden aktualisiert
- `PASSWORD_RECOVERY` — Password-Recovery-Flow gestartet
- `MFA_CHALLENGE_VERIFIED` — MFA-Challenge erfolgreich

**Context API:**
```typescript
interface AuthContextType {
  session: Session | null;       // Aktuelle Session (access_token, refresh_token, user)
  user: User | null;             // Aktueller User oder null
  loading: boolean;              // Loading während initial Session Check
  signOut: () => Promise<void>;  // Sign Out Funktion
}

// Usage in Components:
const { session, user, loading, signOut } = useAuth();
```

**Integration in App:**
```typescript
// app/_layout.tsx
<ThemeProvider>
  <AuthProvider>
    <Stack screenOptions={{ headerShown: false }} />
  </AuthProvider>
</ThemeProvider>
```

---

## Betroffene Dateien

| Datei | Rolle |
|---|---|
| `src/utils/LargeSecureStore.ts` | Custom Storage Adapter mit AES-256 Encryption für Session-Persistierung |
| `src/services/supabase.ts` | Supabase-Client mit autoRefreshToken, persistSession, LargeSecureStore |
| `src/contexts/AuthContext.tsx` | Global Auth State Management via onAuthStateChange Listener |
| `app/_layout.tsx` | AuthProvider Integration in App Root |
| `src/screens/LoginScreen.tsx` | OTP-Flow UI (kein manuelles Token-Speichern mehr) |
| `src/screens/EventScreen.tsx` | Auth-Guard via useAuth() hook |
| `src/screens/EventCreateStepOne.tsx` | Token-Abruf via getSession() beim API-Call |
| `.env.local` | Supabase-Zugangsdaten (URL, Anon Key) |

---

## Auth-Funktionen (`src/services/supabase.ts`)

### `sendOtp(email: string): Promise<void>`
Löst den OTP-Versand aus. Wirft einen Fehler, wenn Supabase die Anfrage ablehnt.

### `verifyOtp(email: string, token: string): Promise<string>`
Verifiziert den vom Nutzer eingegebenen 6-stelligen Code. Gibt bei Erfolg den `access_token` der neuen Session zurück. 

**Wichtig:** Der Supabase Client speichert die Session automatisch via LargeSecureStore — kein manuelles Speichern mehr nötig.

### `getSession(): Promise<string | null>`
Liest den `access_token` aus der aktuellen Supabase-Session. Nutzt `supabase.auth.getSession()` — lädt Session aus LargeSecureStore wenn nötig. Gibt `null` zurück wenn keine Session aktiv ist.

**Das ist die bevorzugte Methode um den Token für API-Calls abzurufen.**

### `authorize(): Promise<boolean>`
Prüft ob der aktuelle Nutzer eingeloggt ist. Ruft intern `getSession()` auf und validiert den Token über `supabase.auth.getUser()`. Gibt `true` zurück bei gültigem Token, sonst `false`.

**Deprecated:** Nutze stattdessen `useAuth()` hook für Auth Guards.

### `getSupabaseClient(): SupabaseClient`
Gibt die Supabase Client Instanz zurück. Nützlich für direkten Zugriff auf Auth-Events oder erweiterte Operationen.

```typescript
const supabase = getSupabaseClient();
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
});
```

---

## Token-Speicherung & Security

### Verschlüsselte Session-Speicherung

**Alle Plattformen (Web, iOS, Android) - IMMER verschlüsselt:**
- **Storage:** LargeSecureStore mit AES-256-CTR Encryption
- **Encryption:** Alle Session-Daten sind verschlüsselt
- **Key Storage:**
  - **iOS/Android:** SecureStore (iOS Keychain / Android Keystore) - Hardware-backed, persistent
  - **Web:** sessionStorage (cleared on browser close) - Vulnerable to XSS but still encrypted
- **Data Storage:** AsyncStorage (encrypted payload)

**Web Security Trade-offs:**
- ✅ IMMER verschlüsselt (nie plain-text)
- ✅ Encryption Key in sessionStorage (kein localStorage)
- ✅ Key wird bei Browser-Close gelöscht (kein persistent storage)
- ⚠️ Vulnerable to XSS attacks (gleich wie localStorage tokens)
- ⚠️ Empfehlung: Kürzere Session Timeouts im Web (1h statt 30d)

**Native Security:**
- ✅ Hardware-backed encryption key storage
- ✅ Encryption Key überlebt App-Restarts
- ✅ Key ist isoliert per App (keine Cross-App-Leaks)
- ✅ Biometric protection möglich (iOS Face ID / Touch ID)

**Ablauf:**
1. Login → Supabase gibt Session zurück
2. LargeSecureStore verschlüsselt Session-JSON mit AES-256
3. Encrypted Payload → AsyncStorage
4. Encryption Key → SecureStore (Native) / sessionStorage (Web)
5. App-Restart → LargeSecureStore lädt Encrypted Payload
6. Decrypt mit Key aus SecureStore/sessionStorage → Session verfügbar

**Kein manuelles Token-Handling mehr:**
- ❌ ~~`localStorage.setItem('access_token', token)`~~
- ❌ ~~`SecureStore.setItemAsync('access_token', token)`~~
- ✅ Supabase Client managed alles automatisch
- ✅ IMMER verschlüsselt, auf allen Plattformen

### Token Lifecycle

**Access Token:**
- Lifetime: **1 Stunde** (Standard, konfigurierbar in Supabase Dashboard)
- Refresh: **Automatisch ~5 Minuten vor Ablauf**
- Bei Refresh: `TOKEN_REFRESHED` Event → AuthContext updatet State

**Refresh Token:**
- Lifetime: **30 Tage** (Standard)
- **Single-Use:** Jeder Refresh Token kann nur einmal verwendet werden
- Reuse Protection: 10 Sekunden Toleranz für Race Conditions
- Bei Missbrauch: Komplette Session wird terminiert

**Session Expiry:**
- Nach 30 Tagen ohne Refresh: Session abgelaufen
- Nutzer muss sich neu einloggen (OTP-Flow)
- Kein "Remember Me" — Sessions haben feste Lifetime

---

## Auth-Guards

### Empfohlene Methode: useAuth() Hook

**EventScreen.tsx:**
```typescript
const { session } = useAuth();

useEffect(() => {
  if (!session) {
    router.replace('/login');
  }
}, [session]);
```

**Vorteile:**
- Reagiert automatisch auf Auth State Changes
- Kein async/await nötig
- Zugriff auf User-Objekt: `const { user } = useAuth();`

### Alternative: getSession() für API-Calls

**EventCreateStepOne.tsx:**
```typescript
const token = await getSession();
if (!token) {
  router.replace('/login');
  return;
}
const result = await api.createEvent(payload, token);
```

**Use Case:** Nur wenn Token für API-Call benötigt wird und kein User-Objekt.

---

## Supabase

- **Dienst:** [Supabase](https://supabase.com) — Open-Source Backend-as-a-Service
- **Verwendete Supabase-Funktion:** `supabase.auth` (GoTrue unter der Haube)
- **OTP-Typ:** `email` (kein TOTP/Authenticator-App)
- **`shouldCreateUser: true`** — neue Nutzer werden beim ersten Login automatisch angelegt (kein separater Registrierungsschritt)

### Supabase-Umgebungsvariablen (`.env.local`)

| Variable | Zweck |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL der Supabase-Instanz |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Öffentlicher Anon-Key |

**Sicherheitshinweis:** Der Anon-Key ist öffentlich und absichtlich nicht geheim — er identifiziert nur das Projekt. Zugriffsrechte werden über Supabase Row Level Security (RLS) geregelt.

---

## Sicherheitshinweise

### ✅ Umgesetzte Best Practices

1. **Automatisches Token Refresh**
   - Access Tokens werden refreshed bevor sie ablaufen
   - Kein manuelles Refresh-Handling → keine Fehlerquellen

2. **Verschlüsselte Session-Speicherung**
   - AES-256-CTR Encryption für alle Session-Daten
   - Encryption Key in Hardware-backed SecureStore (iOS Keychain / Android Keystore)

3. **Single-Use Refresh Tokens**
   - Refresh Tokens können nur einmal verwendet werden
   - Reuse Detection → automatische Session-Terminierung bei Missbrauch

4. **Session Lifecycle Management**
   - Feste Token-Lifetimes (1h Access Token, 30d Refresh Token)
   - Automatic Session Cleanup bei Logout

5. **Kein Manual Token Handling**
   - Eliminiert menschliche Fehler (Token-Leaks, falsche Speicherung)
   - Reduziert Angriffsfläche

### ⚠️ Bekannte Einschränkungen

1. **Web Platform Security**
   - Encryption Key in sessionStorage (vulnerable to XSS)
   - Besser als unencrypted, aber nicht Hardware-backed wie Native
   - **Mitigation:** Kürzere Session Timeouts im Web (TODO: Supabase Dashboard konfigurieren)
   - **Mitigation:** Content Security Policy (CSP) Headers setzen

2. **Token in API-Calls**
   - Access Token wird im RAM gehalten während API-Calls
   - Bei Memory Dumps potenziell auslesbar
   - **Mitigation:** Tokens haben kurze Lifetime (1h), automatisches Refresh

3. **No Biometric Auth**
   - Kein zusätzlicher Biometric Lock für Session-Zugriff
   - **TODO:** Optionale Face ID / Touch ID Integration für sensitives Event-Management

4. **SessionStorage auf Web**
   - Key wird bei Browser-Close gelöscht
   - User muss sich nach jedem Browser-Close neu einloggen
   - **Alternative:** localStorage mit kürzerer Session Lifetime (Trade-off: Convenience vs Security)

### 🔒 Zusätzliche Empfehlungen (für Production)

1. **Inactivity Timeout**
   - Supabase Dashboard: Auth → Settings → "Inactivity timeout" aktivieren
   - Empfohlen: 15-30 Minuten

2. **Single Session per User**
   - Supabase Dashboard: "Allow only one session per user" aktivieren
   - Verhindert Session-Hijacking über alte Geräte

3. **IP-basierte Rate Limiting**
   - Bereits in Supabase implementiert
   - Schützt vor Brute-Force OTP-Versuchen

4. **Row Level Security (RLS)**
   - Alle Events-Tabellen mit RLS schützen
   - User kann nur eigene Draft Events sehen/editieren

---

## Troubleshooting

### "Session not found" nach Login

**Ursache:** LargeSecureStore konnte Session nicht speichern

**Lösung:**
1. AsyncStorage Permissions prüfen
2. SecureStore Permissions prüfen (iOS Keychain / Android Keystore)
3. Console Logs checken: `[LargeSecureStore] Encryption failed`

### Token wird nicht automatisch refreshed

**Ursache:** `autoRefreshToken: false` oder Netzwerk-Fehler

**Lösung:**
1. Supabase Client Config prüfen: `autoRefreshToken: true`
2. Netzwerk-Verbindung prüfen
3. Console Logs checken: `[AuthContext] Auth event: TOKEN_REFRESHED`

### "Encryption failed" in LargeSecureStore

**Ursache:** SecureStore nicht verfügbar (z.B. im Web) oder Crypto API fehlt

**Lösung:**
1. Platform prüfen: `Platform.OS`
2. Fallback implementieren für Web (TODO)
3. Expo SecureStore Version prüfen: `expo-secure-store@~15.0.8`

### User bleibt nicht eingeloggt nach App-Restart

**Ursache:** `persistSession: false` oder LargeSecureStore-Fehler

**Lösung:**
1. Supabase Client Config prüfen: `persistSession: true`
2. LargeSecureStore Logs prüfen
3. AsyncStorage Permissions prüfen

---

## Dependencies

```json
{
  "@supabase/supabase-js": "^2.105.1",
  "@react-native-async-storage/async-storage": "^3.0.2",
  "expo-secure-store": "~15.0.8",
  "aes-js": "^3.1.2"
}
```

---

## Weiterführende Links

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Session Management](https://supabase.com/docs/guides/auth/sessions)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
