# Sitzungssteuerung

**Kategorie:** T-Software  
**Entwurfs-Entsprechung:** `<<component>> Sitzungssteuerung`  
**Implementierung:** React Navigation Stack Navigator (konfiguriert in `app/_layout.tsx`)

## Beschreibung

Die `Sitzungssteuerung` verwaltet alle zur Sitzung gehörenden Dialogkomponenten (Screens). Sie interagiert mit der `Sitzungsverwaltung`, um den Authentifizierungsstatus zu berücksichtigen, und steuert welche Screens aktiv sind.

In der Implementierung entspricht die `Sitzungssteuerung` dem **React Navigation Stack Navigator**, der den Navigationszustand (welche Screens sind auf dem Stack) für die gesamte App-Sitzung verwaltet.

## Schnittstellen

| Schnittstelle | Richtung | Beschreibung |
|---|---|---|
| `ManageDlg` | ← DialogManager | Empfängt Screen-Konfiguration vom DialogManager |
| `ManageSsn` | → Sitzungsverwaltung | Fragt Auth-Status ab, schützt Screens |
| `TermDlg` | ← DialogManager | Screens werden beim Navigieren entfernt |

## Implementierung

### Stack Navigator

```tsx
// Konfiguriert in app/_layout.tsx via Expo Router
<Stack
  screenOptions={{
    headerShown: false,
    animation: "slide_from_right"
  }}
>
  <Stack.Screen name="index" />
  <Stack.Screen name="login" />
  <Stack.Screen
    name="ticket/[eventId]"
    options={{ presentation: "modal" }}
  />
</Stack>
```

### Navigations-Aktionen (DialogEvents)

```tsx
// Vorwärts navigieren
router.push("/event/abc123");

// Zurück navigieren (Pop vom Stack)
router.back();

// Ersetzen (kein Zurück)
router.replace("/");

// Modal öffnen
router.push("/ticket/abc123");  // als Modal konfiguriert
```

## Auth-Guard

Die Sitzungssteuerung schützt authentifizierungspflichtige Screens durch einen Auth-Guard:

```tsx
// src/components/auth/AuthGate.tsx
function AuthGate({ children }) {
  const { session, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) {
    router.replace("/login");
    return null;
  }
  return children;
}
```

## Navigationszustand

Der Stack-Navigator hält den vollständigen Navigationsverlauf der Sitzung:

```
Stack:
  [0] HomeScreen          ← Bottom of Stack
  [1] EventListScreen
  [2] EventScreen         ← Current Screen (Top of Stack)
```

## Abhängigkeiten

- React Navigation (T-Software) – Stack Navigator
- Expo Router (T-Software) – Dateibasiertes Routing
- [`Sitzungsverwaltung`](sitzungsverwaltung.md) – `useAuth()` für Auth-Guard
