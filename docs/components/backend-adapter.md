# BackendAdapter

**Kategorie:** A-Software  
**Entwurfs-Entsprechung:** `<<component>> BackendAdapter`  
**Implementierung:** `src/services/api.ts`, `src/services/supabase.ts`

## Beschreibung

Der `BackendAdapter` ist die einzige Schnittstelle zwischen Frontend und Backend. Er kapselt alle Netzwerkkommunikation und stellt dem Dialogkern und der Sitzungsverwaltung die Schnittstellen `AuthBackend` (Authentifizierung) und `AppBackend` (Anwendungsdaten) bereit.

## Schnittstellen

| Schnittstelle | Implementierung | Beschreibung |
|---|---|---|
| `AuthBackend` | `src/services/supabase.ts` | Supabase Auth: OTP, Session, Account-Verwaltung |
| `AppBackend` | `src/services/api.ts` | REST-Aufrufe an Happin-Backend (`/api/v1/*`) |

## AuthBackend (`supabase.ts`)

```ts
// Authentifizierung
async function sendOtp(email: string): Promise<void>
async function verifyOtp(email: string, token: string): Promise<AuthResponse>
async function getSession(): Promise<Session | null>

// Account-Verwaltung
async function getUserProfile(): Promise<UserProfile>
async function updateDisplayName(name: string): Promise<void>
async function deleteAccount(): Promise<void>

// Bild-Upload
async function uploadEventImage(uri: string): Promise<string>  // URL
async function uploadProfilePicture(uri: string): Promise<string>
```

## AppBackend (`api.ts`)

Der REST-Client mit 30-Sekunden-Cache für häufig gelesene Daten:

### Events

```ts
getPublicEvents(filters: EventFilters): Promise<EventListItem[]>
getEventById(id: string): Promise<EventDetail>
createEvent(data: EventCreate): Promise<{ id: string }>
updateEvent(id: string, data: EventUpdate): Promise<void>
cancelEvent(id: string): Promise<RefundSummary>
getHostEvents(): Promise<EventListItem[]>
```

### RSVP & Tickets

```ts
rsvpEvent(eventId: string, status: RsvpStatus): Promise<void>
joinWaitlist(eventId: string): Promise<void>
bookTicket(eventId: string, optionId: string): Promise<UserTicket>
getUserTickets(eventId: string): Promise<UserTicket[]>
scanTicket(eventId: string, token: string): Promise<ScanResult>
```

### Teilnehmerverwaltung

```ts
getParticipants(eventId: string): Promise<ParticipantList>
exportParticipantsCsv(eventId: string): Promise<Blob>
exportParticipantsPdf(eventId: string): Promise<Blob>
```

### Benachrichtigungen & Erinnerungen

```ts
getNotifications(): Promise<Notification[]>
markNotificationRead(id: string): Promise<void>
subscribeReminder(eventId: string, scheduledFor: string): Promise<void>
unregisterPushToken(): Promise<void>
```

### Zahlungen

```ts
getStripeConnectUrl(): Promise<{ url: string }>
createCheckoutSession(
  eventId: string,
  optionId: string,
  quantity: number
): Promise<{ checkout_url: string }>
```

## Caching

Der API-Client implementiert einen einfachen In-Memory-Cache mit 30-Sekunden-TTL:

```ts
const cache = new Map<string, { data: unknown; expiresAt: number }>();

async function cachedGet<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.data as T;

  const data = await fetch(url, { headers: authHeaders() }).then(r => r.json());
  cache.set(url, { data, expiresAt: Date.now() + 30_000 });
  return data;
}
```

## Fehlerbehandlung

Alle API-Aufrufe werfen typisierte Fehler:

```ts
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) { super(message); }
}
```

## Abhängigkeiten

- `src/contexts/AuthContext.tsx` – JWT für Auth-Header
- Supabase JS Client (AT-Software) – Auth-Operationen
- Happin Backend (`/api/v1/*`) – REST-API
