---
title: Google Wallet Integration — Frontend
created: 2026-05-08
status: spec
---

# Google Wallet Integration — Frontend

## Übersicht

Der bestehende Placeholder-Button "Zu Google Wallet hinzufügen" im `TicketDetailScreen`
wird mit echter Funktionalität versehen. Der Backend-Endpoint ist bereits implementiert
und von Google offiziell genehmigt.

**Backend-Dokumentation:** `backend/documentation/18-google-wallet.md`
**Endpoint:** `GET /api/v1/events/{event_id}/wallet` → `{ wallet_url: string }`

---

## Plattform-Verhalten

| Plattform | Sichtbar | Verhalten |
|-----------|----------|-----------|
| Android   | ✅       | Öffnet Google Wallet App (falls installiert) oder Browser |
| Web       | ✅       | Öffnet pay.google.com im neuen Tab |
| iOS       | ❌       | Button ausgeblendet (`Platform.OS !== 'ios'`) |

iOS wird ausgeblendet, da Apple Wallet dort die native Lösung ist.

---

## Architektur

### API-Methode (`src/services/api.ts`)

Neue Methode `getWalletUrl`:

```typescript
getWalletUrl: (eventId: string, token?: string) =>
    request<{ wallet_url: string }>(`/api/v1/events/${eventId}/wallet`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
```

Auth-Token wird optional mitgesendet (für private Events).

### Handler (`src/screens/TicketDetailScreen.tsx`)

```typescript
const [walletLoading, setWalletLoading] = useState(false);

const handleAddToWallet = async () => {
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

### Button-Rendering

```tsx
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

---

## Fehlerbehandlung

| Fall | Reaktion |
|------|----------|
| 503 (nicht konfiguriert) | Alert "Google Wallet konnte nicht geöffnet werden." |
| 404 (Event nicht gefunden) | Alert "Google Wallet konnte nicht geöffnet werden." |
| Netzwerkfehler | Alert "Google Wallet konnte nicht geöffnet werden." |
| Kein eventId | Handler wird nicht aufgerufen (Button nur bei geladenem Event sichtbar) |

---

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/services/api.ts` | `getWalletUrl(eventId, token?)` hinzugefügt |
| `src/screens/TicketDetailScreen.tsx` | `handleAddToWallet`, `walletLoading`-State, `Linking`-Import, `Platform.OS !== 'ios'` Conditional |
| `repo-docs/31-google-wallet-frontend.md` | Diese Dokumentation |
| `repo-docs/00-index.md` | Eintrag für Dok 31 hinzugefügt |
