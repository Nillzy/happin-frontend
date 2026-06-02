# GUI-Frontend iOS

**Kategorie:** T-Software (React Native / Expo)  
**Entwurfs-Entsprechung:** `<<component>> GUI-Frontend iOS`  
**Implementierung:** Expo iOS-Build, `app/` (Expo Router), `app.json` (iOS-Konfiguration)

## Beschreibung

Das `GUI-Frontend iOS` ist die native iOS-App der Happin-Plattform. Sie wird durch **React Native** und **Expo** aus demselben Codebase wie Web und Android erzeugt und läuft nativ auf iPhone und iPad.

## Bereitgestellte Schnittstellen

| Schnittstelle | Beschreibung |
|---|---|
| `DefinePresentation` | Expo Router definiert die Screen-Struktur über das Dateisystem unter `app/` |
| `DisplayData` | React-Rendering aktualisiert die native UI bei State-Änderungen |

## Genutzte Schnittstellen

- **`PresentationEvents`** – Native Touch-Events, Gesten und Navigations-Callbacks

## Technische Details

| Merkmal | Details |
|---|---|
| Build-Tool | Expo (EAS Build) |
| Mindest-iOS-Version | iOS 16+ |
| Deep-Link-Schema | `happin://` |
| Push-Benachrichtigungen | Expo Push Notifications (APNs) |
| Kamera | `expo-camera` (Ticket-Scan) |
| Secure Storage | `expo-secure-store` (Tokens) |

## Plattformspezifika

- **Expo Push Notifications** über APNs (Apple Push Notification Service)
- **Native Navigation-Gesten** (Swipe Back, Tab Bar)
- **`expo-secure-store`** für sichere Token-Speicherung (LargeSecureStore-Wrapper)
- **Native Kamera** für QR-Code-Scanning (`ScanTicketScreen`)
- **SafeAreaInsets** für Notch/Dynamic Island

## iOS-Konfiguration (`app.json`)

```json
{
  "ios": {
    "bundleIdentifier": "com.happin.app",
    "supportsTablet": true,
    "infoPlist": {
      "NSCameraUsageDescription": "Zum Scannen von Tickets",
      "NSPhotoLibraryUsageDescription": "Zum Hochladen von Event-Bildern"
    }
  }
}
```

## Abhängigkeiten

- Expo SDK 54 (T-Software)
- React Native (T-Software)
- [`Präsentation`](praesentation.md) – Screen-Komponenten
