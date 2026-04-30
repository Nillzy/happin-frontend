# Supabase Auth Migration Summary

## Was wurde implementiert?

Die Happin-App nutzt jetzt eine **State-of-the-Art Supabase Auth-Implementierung** mit:

### ✅ Automatisches Token Refresh
- Access Tokens werden automatisch ~5 Minuten vor Ablauf refreshed
- Kein manuelles Token-Handling mehr nötig
- Nutzer bleibt eingeloggt ohne Unterbrechung

### ✅ Verschlüsselte Session-Persistierung
- Sessions überleben App-Restarts
- **LargeSecureStore**: AES-256-CTR verschlüsselte Session-Daten in AsyncStorage
- Encryption Key:
  - **Native (iOS/Android):** SecureStore (Hardware-backed Keychain/Keystore)
  - **Web:** sessionStorage (cleared on close, NOT persistent)
- **State-of-the-art:** IMMER verschlüsselt, auf allen Plattformen

### ✅ Global Auth State Management
- **AuthContext** mit `onAuthStateChange` Listener
- Alle Komponenten haben Zugriff auf `{ session, user, loading, signOut }`
- Reaktive Auth-Guards via `useAuth()` hook

## Geänderte Dateien

### Neue Dateien:
- `src/utils/LargeSecureStore.ts` - Custom Storage Adapter mit AES-256 Encryption
- `src/contexts/AuthContext.tsx` - Global Auth State Provider

### Modifizierte Dateien:
- `src/services/supabase.ts` - Client mit `autoRefreshToken`, `persistSession`, `LargeSecureStore`
- `app/_layout.tsx` - AuthProvider Integration
- `src/screens/LoginScreen.tsx` - Entfernt: manuelles Token-Speichern
- `src/screens/EventScreen.tsx` - Auth Guard via `useAuth()` hook
- `src/screens/EventCreateStepOne.tsx` - Auth Check via `useAuth()` hook
- `documentation/06-authentication.md` - Vollständig neu geschrieben

### Dependencies:
```bash
npm install @react-native-async-storage/async-storage@^3.0.2 aes-js@^3.1.2 expo-crypto@~15.0.0
npm install --save-dev @types/aes-js
```

## Migration von alter zu neuer Architektur

### Vorher ❌
```typescript
// Manuelles Token-Speichern
const accessToken = await verifyOtp(email, otp);
await SecureStore.setItemAsync('access_token', accessToken);

// Auth Check in jedem Screen
useEffect(() => {
  authorize().then((isAuthorized) => {
    if (!isAuthorized) router.replace('/login');
  });
}, []);
```

### Nachher ✅
```typescript
// Automatisches Session Management
await verifyOtp(email, otp);
// Session wird automatisch gespeichert und persistiert

// Auth Check via Context
const { session } = useAuth();
useEffect(() => {
  if (!session) router.replace('/login');
}, [session]);
```

## Wie funktioniert es?

### 1. Login-Flow
```
User gibt E-Mail ein → OTP wird gesendet
User gibt OTP ein → verifyOtp()
→ Supabase gibt Session zurück
→ LargeSecureStore verschlüsselt Session
→ Encrypted Session in AsyncStorage
→ AuthContext wird via onAuthStateChange informiert
→ App navigiert zu /events
```

### 2. App-Restart
```
App startet → AuthProvider initialisiert
→ Supabase lädt Session aus LargeSecureStore
→ LargeSecureStore lädt Encrypted Payload aus AsyncStorage
→ Decrypts mit Key aus SecureStore
→ Supabase validiert Session
→ Falls gültig: User ist eingeloggt
→ Falls abgelaufen: Automatischer Refresh
```

### 3. Token Refresh (automatisch)
```
Access Token läuft in 5 Minuten ab
→ Supabase Client detects Expiry
→ Automatischer Refresh via Refresh Token
→ Neue Session wird in LargeSecureStore gespeichert
→ onAuthStateChange Event: TOKEN_REFRESHED
→ AuthContext updatet session State
→ App läuft weiter ohne Unterbrechung
```

## Testing Checklist

- [ ] Login funktioniert (OTP-Flow)
- [ ] Session persistiert nach App-Restart
- [ ] Token wird automatisch refreshed (nach 55 Minuten testen)
- [ ] Logout funktioniert
- [ ] Auth Guards redirecten zu /login wenn nicht eingeloggt
- [ ] Events können erstellt werden (Token wird korrekt in API-Calls verwendet)

## Troubleshooting

### "Session not found" nach Login
→ Prüfe Console Logs: `[LargeSecureStore] setItem failed`
→ Permissions für AsyncStorage oder SecureStore fehlen

### Token wird nicht automatisch refreshed
→ Prüfe Console Logs: `[AuthContext] Auth event: TOKEN_REFRESHED`
→ Falls nicht: Netzwerkverbindung prüfen oder Supabase Dashboard checken

### "Encryption failed"
→ SecureStore nicht verfügbar (z.B. im Web ohne HTTPS)
→ Crypto API fehlt oder Expo SDK Version inkompatibel

## Nächste Schritte (TODO)

1. **Web Platform Security:** SessionStorage statt AsyncStorage für Web
2. **Biometric Lock:** Optionale Face ID / Touch ID für Event-Management
3. **Inactivity Timeout:** In Supabase Dashboard aktivieren (15-30 Min)
4. **Single Session per User:** In Supabase Dashboard aktivieren
5. **Tests schreiben:** Unit Tests für LargeSecureStore, Integration Tests für Auth-Flow

## Links

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Session Management](https://supabase.com/docs/guides/auth/sessions)
- [LargeSecureStore Pattern](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
