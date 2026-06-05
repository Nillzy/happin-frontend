# LoginViewModel

**Kategorie:** A-Software  
**Entwurfs-Entsprechung:** Präsentation – Login-Screen (M1)  
**Implementierung:** `src/screens/LoginScreen.tsx`, `src/services/supabase.ts`

## Beschreibung

Das `LoginViewModel` steuert den Login- und Registrierungsflow. Es implementiert den Workflow M1 (Nutzer anmelden) aus dem Pflichtenheft über ein zweistufiges OTP-Verfahren per E-Mail.

[→ Im Architekturentwurf ansehen](<https://gitlab.com/groups/dhbw-se/se-tinf24b2/happin/-/wikis/Entwurf/Komponentendiagramm#:~:text=Umgesetzte%20Anforderungen-,LoginViewModel,-M1%20(Nutzer%2DAuthentifizierung>)

## Workflow (M1)

```
1. Nutzer gibt E-Mail-Adresse ein
2. LoginScreen ruft sendOtp(email) auf
3. Supabase sendet OTP-Code per E-Mail
4. Nutzer gibt OTP ein
5. LoginScreen ruft verifyOtp(email, token) auf
6. Bei Erfolg: Session wird in AuthContext gespeichert
7. Weiterleitung zur Hauptseite
```

## Wichtige Funktionen

```tsx
// src/screens/LoginScreen.tsx

const handleSendOtp = async () => {
  await sendOtp(email);
  setStep("verify");
};

const handleVerifyOtp = async () => {
  const { data, error } = await verifyOtp(email, otp);
  if (data.session) {
    // AuthContext wird automatisch über onAuthStateChange aktualisiert
    router.replace("/");
  }
};
```

## Supabase-Auth-Funktionen

```ts
// src/services/supabase.ts
async function sendOtp(email: string): Promise<void>
async function verifyOtp(email: string, token: string): Promise<Session>
```

## UI-Zustände

| Zustand | Beschreibung |
|---|---|
| `email` | E-Mail-Eingabe |
| `verify` | OTP-Eingabe |
| `loading` | Lade-Spinner |
| `error` | Fehleranzeige |

## Abhängigkeiten

- `src/services/supabase.ts` – OTP-Versand und -Verifikation
- [`Sitzungsverwaltung`](sitzungsverwaltung.md) – `AuthContext` für Session-Speicherung
- [`BackendAdapter`](backend-adapter.md) – kein direkter Backend-Aufruf (Auth über Supabase)
