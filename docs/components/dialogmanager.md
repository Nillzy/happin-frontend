# DialogManager

**Kategorie:** T-Software  
**Entwurfs-Entsprechung:** `<<component>> DialogManager`  
**Implementierung:** `app/_layout.tsx` (Expo Router Root Layout)

## Beschreibung

Der `DialogManager` erzeugt und konfiguriert die Dialog-Komponenten bei der Erzeugung eines Dialogs. Er kommuniziert mit der Sitzungssteuerung und ist der Einstiegspunkt, der den kompletten Navigationsbaum aufbaut.

In der Implementierung entspricht der `DialogManager` dem **Root Layout** (`app/_layout.tsx`), das von Expo Router beim App-Start einmalig ausgeführt wird.

## Schnittstellen

| Schnittstelle | Richtung | Beschreibung |
|---|---|---|
| `ManageDlg` | → Sitzungssteuerung | Stack-Navigator mit allen Screen-Definitionen |

## Implementierung

```tsx
// app/_layout.tsx
export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SavedEventsProvider>
          <ReminderSettingsProvider>
            <NotificationsProvider>
              <Stack>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="event/[eventId]" />
                <Stack.Screen name="events/index" />
                <Stack.Screen name="ticket/[eventId]"
                  options={{ presentation: "modal" }} />
                {/* ... weitere Screens */}
              </Stack>
            </NotificationsProvider>
          </ReminderSettingsProvider>
        </SavedEventsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

## Aufgaben des DialogManagers

1. **Provider-Hierarchie** aufbauen (Theme, Auth, Contexts)
2. **Screen-Registrierung** – alle Screens im Stack-Navigator anmelden
3. **Modal-Konfiguration** – z. B. Ticket-Screen als Modal
4. **Deep-Link-Mapping** – URL-Pfade auf Screen-Komponenten abbilden
5. **Authentifizierungsweiterleitungen** – nicht angemeldete Nutzer zu Login leiten

## Deep-Link-Schema

Der `DialogManager` verwaltet das Deep-Link-Schema `happin://`:

| URL | Screen |
|---|---|
| `happin://` | HomeScreen |
| `happin://login` | LoginScreen |
| `happin://event/[id]` | EventScreen |
| `happin://events` | EventListScreen |
| `happin://ticket/[id]` | TicketDetailScreen (Modal) |

## Abhängigkeiten

- Expo Router (T-Software) – Dateibasiertes Routing
- [`Sitzungssteuerung`](sitzungssteuerung.md) – Stack-Navigator
- Alle Context-Provider – [`Sitzungsverwaltung`](sitzungsverwaltung.md), etc.
