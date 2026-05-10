# Google Wallet Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Placeholder-Button "Zu Google Wallet hinzufügen" im `TicketDetailScreen` mit echter Funktionalität versehen: API-Call → URL öffnen. Nur auf Android + Web sichtbar.

**Architecture:** `api.ts` bekommt eine neue `getWalletUrl`-Methode. `TicketDetailScreen.tsx` bekommt einen Handler + Loading-State. Der Button wird nur gerendert wenn `Platform.OS !== 'ios'`.

**Tech Stack:** React Native `Linking`, `Alert`, `Platform`; bestehendes `api`-Service-Pattern

---

## Dateien

| Datei | Änderung |
|-------|----------|
| `src/services/api.ts` | `getWalletUrl(eventId, token?)` am Ende des `api`-Objekts hinzufügen |
| `src/screens/TicketDetailScreen.tsx` | `Alert` + `Linking` importieren, `walletLoading`-State + `handleAddToWallet`-Handler, Button conditional + loading |
| `documentation/29-google-wallet-frontend.md` | Bereits erstellt (Spec) |
| `documentation/00-index.md` | Eintrag für Dok 29 hinzufügen |

---

### Task 1: API-Methode `getWalletUrl` hinzufügen

**Files:**
- Modify: `src/services/api.ts:148-154`

- [ ] **Schritt 1: `getWalletUrl` vor dem letzten `scanTicket` einfügen**

In `src/services/api.ts` die neue Methode vor `scanTicket` (Zeile 148) einfügen.
Der bestehende Block sieht so aus:

```typescript
    scanTicket: (eventId: string, qrToken: string, token: string) =>
        request<ScanTicketResponse>(`/api/v1/events/${eventId}/tickets/scan`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ qr_token: qrToken }),
        }),
};
```

Ersetze diesen Block durch:

```typescript
    getWalletUrl: (eventId: string, token?: string) =>
        request<{ wallet_url: string }>(`/api/v1/events/${eventId}/wallet`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),

    scanTicket: (eventId: string, qrToken: string, token: string) =>
        request<ScanTicketResponse>(`/api/v1/events/${eventId}/tickets/scan`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ qr_token: qrToken }),
        }),
};
```

- [ ] **Schritt 2: TypeScript-Fehler prüfen**

```bash
cd "/Users/I749945/Documents/DHBW/Software Engineering/Happin-Projekt/frontend"
npx tsc --noEmit 2>&1 | head -30
```

Erwartet: keine Fehler in `api.ts`.

- [ ] **Schritt 3: Commit**

```bash
git add "src/services/api.ts"
git commit -m "feat: getWalletUrl Methode in api-Service hinzugefügt"
```

---

### Task 2: TicketDetailScreen — Imports und State

**Files:**
- Modify: `src/screens/TicketDetailScreen.tsx:1-15` (Imports), `src/screens/TicketDetailScreen.tsx:40-50` (State)

- [ ] **Schritt 1: `Alert` und `Linking` zu den React Native Imports hinzufügen**

Aktuelle Import-Zeilen 5-15:

```typescript
import {
    View,
    Text,
    ScrollView,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
    Pressable,
    PanResponder,
    Animated,
    Platform,
} from 'react-native';
```

Ersetze durch:

```typescript
import {
    View,
    Text,
    ScrollView,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity,
    Pressable,
    PanResponder,
    Animated,
    Platform,
    Alert,
    Linking,
} from 'react-native';
```

- [ ] **Schritt 2: `walletLoading`-State nach den bestehenden States hinzufügen**

Aktuell stehen die States in Zeilen 45-49:

```typescript
    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [tickets, setTickets] = useState<UserTicket[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
```

Ersetze durch:

```typescript
    const [event, setEvent] = useState<EventDetailResponse | null>(null);
    const [tickets, setTickets] = useState<UserTicket[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [walletLoading, setWalletLoading] = useState(false);
```

- [ ] **Schritt 3: TypeScript-Fehler prüfen**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Erwartet: keine neuen Fehler.

---

### Task 3: Handler `handleAddToWallet` implementieren

**Files:**
- Modify: `src/screens/TicketDetailScreen.tsx` — nach `dismissSheet` (endet ca. Zeile 89)

- [ ] **Schritt 1: Handler nach `dismissSheet` einfügen**

Aktuell endet `dismissSheet` bei Zeile 89:

```typescript
    }, [translateY, backdropOpacity, router]);
```

Direkt danach (nach dieser schließenden Klammer) einfügen:

```typescript
    const handleAddToWallet = async () => {
        if (!eventId) return;
        setWalletLoading(true);
        try {
            const token = await getSession();
            const { wallet_url } = await api.getWalletUrl(eventId, token ?? undefined);
            await Linking.openURL(wallet_url);
        } catch {
            Alert.alert('Fehler', 'Google Wallet konnte nicht geöffnet werden.');
        } finally {
            setWalletLoading(false);
        }
    };
```

- [ ] **Schritt 2: TypeScript-Fehler prüfen**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Erwartet: keine Fehler.

---

### Task 4: Button verkabeln — Conditional Rendering + Loading State

**Files:**
- Modify: `src/screens/TicketDetailScreen.tsx:324-334` (Wallet Button)

- [ ] **Schritt 1: Bestehenden Wallet-Button ersetzen**

Aktueller Button (Zeilen 324–334):

```tsx
                {/* Add to Google Wallet Button */}
                <TouchableOpacity
                    style={[styles.walletButton, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
                    onPress={() => {
                        console.log('Add to Google Wallet');
                    }}
                >
                    <Text style={[styles.walletButtonText, { color: colors.onSurface }]}>
                        Zu Google Wallet hinzufügen
                    </Text>
                </TouchableOpacity>
```

Ersetze durch:

```tsx
                {/* Add to Google Wallet Button — nur Android + Web */}
                {Platform.OS !== 'ios' && (
                    <TouchableOpacity
                        style={[styles.walletButton, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}
                        onPress={handleAddToWallet}
                        disabled={walletLoading}
                    >
                        {walletLoading ? (
                            <ActivityIndicator size="small" color={colors.onSurface} />
                        ) : (
                            <Text style={[styles.walletButtonText, { color: colors.onSurface }]}>
                                Zu Google Wallet hinzufügen
                            </Text>
                        )}
                    </TouchableOpacity>
                )}
```

- [ ] **Schritt 2: TypeScript-Fehler prüfen**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Erwartet: keine Fehler.

- [ ] **Schritt 3: Manueller Test (Web)**

```bash
npm run web
```

1. Navigiere zu einem Ticket (z.B. `/ticket/<eventId>`)
2. Bottom Sheet öffnet sich
3. "Zu Google Wallet hinzufügen"-Button ist sichtbar (Web = nicht iOS)
4. Klick → Button zeigt kurz Spinner → Browser öffnet `pay.google.com/...`
5. Bei Netzwerkfehler oder 503: Alert "Google Wallet konnte nicht geöffnet werden."

- [ ] **Schritt 4: Manueller Test iOS (falls Simulator verfügbar)**

1. `npm run ios`
2. Navigiere zu einem Ticket
3. "Zu Google Wallet hinzufügen"-Button ist **nicht sichtbar** auf iOS

- [ ] **Schritt 5: Commit**

```bash
git add "src/screens/TicketDetailScreen.tsx"
git commit -m "feat: Google Wallet Integration im TicketDetailScreen implementiert"
```

---

### Task 5: Dokumentation aktualisieren

**Files:**
- Modify: `documentation/00-index.md`

- [ ] **Schritt 1: Eintrag für Dok 29 in `00-index.md` hinzufügen**

In `documentation/00-index.md` nach dem letzten Tabelleneintrag (Zeile mit `28-kalender-export-frontend.md`) einfügen:

```markdown
| [29-google-wallet-frontend.md](./29-google-wallet-frontend.md) | **Google Wallet Integration Frontend**: `getWalletUrl` in api.ts, Handler im TicketDetailScreen, Platform-Split (nur Android + Web), Fehlerbehandlung. |
```

- [ ] **Schritt 2: Commit**

```bash
git add "documentation/00-index.md" "documentation/29-google-wallet-frontend.md"
git commit -m "docs: Google Wallet Frontend-Dokumentation (Dok 29) hinzugefügt"
```
