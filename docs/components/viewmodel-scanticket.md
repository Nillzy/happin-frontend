# ScanTicketViewModel

**Kategorie:** A-Software  
**Entwurfs-Entsprechung:** Präsentation – Ticket scannen (M8)  
**Implementierung:** `src/screens/ScanTicketScreen.tsx`

## Beschreibung

Das `ScanTicketViewModel` ermöglicht es Event-Hosts, QR-Code-Tickets beim Einlass zu scannen und zu validieren. Es implementiert den Workflow M8 (Ticketkontrolle).

[→ Im Architekturentwurf ansehen](<https://gitlab.com/groups/dhbw-se/se-tinf24b2/happin/-/wikis/Entwurf/Komponentendiagramm#:~:text=Co%2DHost%2DVerwaltung)-,ScanTicketViewModel,-M9%20(QR%2DScanner>)

## Workflow (M8 – Ticket scannen)

```
1. Host öffnet ScanTicketScreen für sein Event
2. Kamera-Ansicht wird aktiviert
3. Nutzer hält QR-Code vor die Kamera
4. QR-Code wird dekodiert → HMAC-Token extrahiert
5. api.scanTicket(eventId, token) → Servervalidierung
6. Ergebnis:
   ✅ Gültig:    Grüne Bestätigung + Nutzername
   ❌ Ungültig:  Rote Fehlermeldung (unbekannt, bereits genutzt)
   ⚠️ Warnung:  Ticket für falsches Event
```

## Implementierung

```tsx
// src/screens/ScanTicketScreen.tsx
function ScanTicketScreen({ eventId }) {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleBarCodeScanned = async ({ data }) => {
    setScanning(false);
    try {
      const scan = await api.scanTicket(eventId, data);
      setResult({ success: true, ...scan });
    } catch (e) {
      setResult({ success: false, error: e.message });
    }
  };

  return (
    <CameraView
      onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
    />
  );
}
```

## Scan-Ergebnis

```ts
interface ScanResult {
  success: boolean;
  guest_name?: string;
  ticket_option?: string;
  already_scanned?: boolean;
  error?: string;
}
```

## Kamera-Berechtigung

Vor dem ersten Öffnen wird die Kameraerlaubnis angefragt (`expo-camera`). Auf Web wird die Browser-Kamera-API verwendet.

## Abhängigkeiten

- [`BackendAdapter`](backend-adapter.md) – `api.scanTicket()`
- `expo-camera` – Kamerazugriff und QR-Scanning (T-Software)
- [`Sitzungsverwaltung`](sitzungsverwaltung.md) – nur für den Event-Host zugänglich
