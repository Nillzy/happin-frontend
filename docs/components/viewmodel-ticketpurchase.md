# TicketPurchaseViewModel

**Kategorie:** A-Software  
**Entwurfs-Entsprechung:** Präsentation – Ticketkauf (S2)  
**Implementierung:** `src/screens/TicketDetailScreen.tsx`, `app/ticket/[eventId].tsx`, `src/utils/openCheckoutUrl.ts`

## Beschreibung

Das `TicketPurchaseViewModel` steuert den Ticketkauf-Workflow. Es zeigt verfügbare Ticket-Optionen an, leitet den Nutzer zum Stripe-Checkout weiter und zeigt gebuchte Tickets mit QR-Code an.

## Workflow (S2 – Ticketkauf)

```
1. Nutzer wählt Ticket-Option auf der Event-Detailseite
2. TicketPurchaseViewModel öffnet Ticket-Detailseite
3. Kostenfreies Ticket: direkte Buchung via api.bookTicket()
4. Kostenpflichtiges Ticket:
   a. api.createCheckoutSession() → Stripe-Checkout-URL
   b. Browser/App öffnet Stripe Checkout
   c. Nach Zahlung: Weiterleitung zurück zur App
   d. Ticket wird automatisch generiert (Webhook)
5. Ticket mit QR-Code anzeigen
```

## Ticket-Detailansicht

```tsx
// src/screens/TicketDetailScreen.tsx
function TicketDetailScreen({ eventId }) {
  const [tickets, setTickets] = useState<UserTicket[]>([]);

  useEffect(() => {
    api.getUserTickets(eventId).then(setTickets);
  }, [eventId]);

  // Ticket mit QR-Code und Download-Optionen anzeigen
}
```

## Ticket-QR-Code

Jedes Ticket enthält einen signierten HMAC-Token als QR-Code, der beim Einlass gescannt wird.

## Download-Optionen

| Option | Beschreibung |
|---|---|
| QR-Code anzeigen | Direkt in der App (native + Web) |
| Google Wallet | Google Wallet Pass hinzufügen |
| Kalender | ICS-Datei herunterladen |
| PDF | Ticket als PDF |

## Stripe Connect

Zahlungen laufen über Stripe Connect direkt auf das Konto des Event-Hosts. Happin nimmt keine Zahlungen selbst entgegen.

```ts
// src/services/api.ts
async createCheckoutSession(
  eventId: string,
  ticketOptionId: string,
  quantity: number
): Promise<{ checkout_url: string }>
```

## Abhängigkeiten

- [`BackendAdapter`](backend-adapter.md) – `api.bookTicket()`, `api.createCheckoutSession()`, `api.getUserTickets()`
- `src/utils/openCheckoutUrl.ts` – Plattformgerechtes Öffnen der Stripe-URL
- [`Sitzungsverwaltung`](sitzungsverwaltung.md) – Authentifizierung erforderlich
