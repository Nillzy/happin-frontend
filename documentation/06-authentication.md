# 05 – Authentication

## Überblick

Happin verwendet **Passwordless Authentication** via **E-Mail OTP** (One-Time Password). Es gibt kein Passwort — der Nutzer gibt seine E-Mail-Adresse ein, erhält einen 6-stelligen Code per E-Mail und bestätigt damit seine Identität. Dieses Verfahren wird vollständig über **Supabase Auth** abgewickelt.

---

## Ablauf (Flow)

```
[LoginScreen]
  1. Nutzer gibt E-Mail ein
  2. sendOtp(email)  →  Supabase sendet OTP-Mail
  3. Nutzer gibt 6-stelligen Code ein
  4. verifyOtp(email, token)  →  Supabase gibt Session zurück
  5. access_token wird lokal gespeichert
  6. Navigation → EventListScreen

[EventCreateScreen]
  1. handleSubmit: getSession() → Token aus Supabase-Session
  2. Kein Token → Weiterleitung zu LoginScreen
  3. Token vorhanden → API-Call mit Bearer Token

[EventScreen]
  1. useEffect on mount: authorize()
  2. getSession() liest Token aus Supabase-Session
  3. Supabase prüft Token via getUser()
  4. Ungültig → Weiterleitung zu LoginScreen
```

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
| `EXPO_PUBLIC_SUPABASE_SB_PUBLISHABLE` | Öffentlicher Anon-Key |

---

## Betroffene Dateien

| Datei | Rolle |
|---|---|
| `src/services/supabase.ts` | Supabase-Client, alle Auth-Funktionen (sendOtp, verifyOtp, getSession, authorize) |
| `src/screens/LoginScreen.tsx` | OTP-Flow UI, Token-Speicherung nach Verifikation, Navigation → EventList |
| `src/screens/EventScreen.tsx` | Auth-Guard via `authorize()` im `useEffect` |
| `src/screens/EventCreateScreen.tsx` | Token-Abruf via `getSession()` beim Absenden, Redirect zu Login falls nicht eingeloggt |
| `.env` | Supabase-Zugangsdaten |

---

## Auth-Funktionen (`src/services/supabase.ts`)

### `sendOtp(email: string): Promise<void>`
Löst den OTP-Versand aus. Wirft einen Fehler, wenn Supabase die Anfrage ablehnt.

### `verifyOtp(email: string, token: string): Promise<string>`
Verifiziert den vom Nutzer eingegebenen 6-stelligen Code. Gibt bei Erfolg den `access_token` der neuen Session zurück. Wirft einen Fehler bei falschem Code oder abgelaufener Session.

### `getSession(): Promise<string | null>`
Liest den `access_token` aus der aktuellen Supabase-Session. Nutzt `supabase.auth.getSession()` — funktioniert auf Web (Cookies) und Native (SecureStore) gleichermaßen. Gibt `null` zurück wenn keine Session aktiv ist. **Das ist die bevorzugte Methode um den Token abzurufen** — nicht manuell aus localStorage/SecureStore lesen.

### `authorize(): Promise<boolean>`
Prüft ob der aktuelle Nutzer eingeloggt ist. Ruft intern `getSession()` auf und validiert den Token über `supabase.auth.getUser()`. Gibt `true` zurück bei gültigem Token, sonst `false`.

---

## Token-Speicherung

Der `access_token` wird nach erfolgreicher OTP-Verifikation plattformabhängig gespeichert:

### Web (`Platform.OS === 'web'`)
- **Speicher:** `localStorage`
- **Key:** `access_token`
- **Lesen:** `localStorage.getItem('access_token')`
- **Schreiben:** `localStorage.setItem('access_token', token)`
- **Grund:** `expo-secure-store` ist ein natives Modul und steht im Browser nicht zur Verfügung.

### iOS & Android (`Platform.OS !== 'web'`)
- **Speicher:** `expo-secure-store`
- **Key:** `access_token`
- **Lesen:** `SecureStore.getItemAsync('access_token')`
- **Schreiben:** `SecureStore.setItemAsync('access_token', token)`
- **Grund:** Auf nativen Plattformen wird der Token verschlüsselt im Keychain (iOS) bzw. Android Keystore (Android) abgelegt — deutlich sicherer als AsyncStorage.

Die plattformabhängige Abstraktion ist in `LoginScreen.tsx` (`storeToken`) und `supabase.ts` (`getStoredToken`) implementiert.

---

## Auth-Guards

### EventScreen
`EventScreen` prüft beim Mount ob der Nutzer eingeloggt ist:

```typescript
useEffect(() => {
    authorize().then((isAuthorized) => {
        if (!isAuthorized) navigation.navigate('Login');
    });
}, []);
```

### EventCreateScreen
`EventCreateScreen` prüft beim Absenden des Formulars ob eine gültige Session existiert:

```typescript
const token = await getSession();
if (!token) {
    navigation.navigate('Login');
    return;
}
const result = await api.createEvent(payload, token);
```

Falls kein Token vorhanden ist, wird der Nutzer zum Login weitergeleitet. Nach erfolgreichem Login kann er das Formular erneut absenden.

---

## Sicherheitshinweise

- Der `access_token` ist ein kurzlebiges JWT (Standard: 1 Stunde). Supabase-Refresh-Tokens werden derzeit **nicht** persistiert — nach Ablauf muss sich der Nutzer erneut einloggen.
- Auf Web liegt der Token im `localStorage` (unverschlüsselt). Das ist akzeptabel für den aktuellen Entwicklungsstand, aber für eine Production-App sollte eine verschlüsselte Lösung (z.B. via `aes-js` + SecureStore für den Schlüssel) evaluiert werden.
- Der Supabase Anon-Key ist öffentlich und absichtlich nicht geheim — er identifiziert nur das Projekt. Zugriffsrechte werden über Supabase Row Level Security (RLS) geregelt.