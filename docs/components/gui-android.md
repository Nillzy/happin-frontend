# GUI-Frontend Android

**Kategorie:** T-Software (React Native / Expo)  
**Entwurfs-Entsprechung:** `<<component>> GUI-Frontend Android`  
**Implementierung:** Expo Android-Build, `app/` (Expo Router), `app.json` (Android-Konfiguration)

## Beschreibung

Das `GUI-Frontend Android` ist die native Android-App der Happin-Plattform. Wie iOS wird sie durch **React Native** und **Expo** aus demselben Codebase erzeugt und läuft nativ auf Android-Smartphones und -Tablets.

## Bereitgestellte Schnittstellen

| Schnittstelle | Beschreibung |
|---|---|
| `DefinePresentation` | Expo Router definiert die Screen-Struktur über das Dateisystem unter `app/` |
| `DisplayData` | React-Rendering aktualisiert die native Android-UI bei State-Änderungen |

## Genutzte Schnittstellen

- **`PresentationEvents`** – Native Touch-Events, Material You-Gesten und Navigations-Callbacks

## Technische Details

| Merkmal | Details |
|---|---|
| Build-Tool | Expo (EAS Build) |
| Mindest-Android-Version | Android 10 (API 29)+ |
| Package-Name | `com.happin.app` |
| Deep-Link-Schema | `happin://` |
| Push-Benachrichtigungen | Expo Push Notifications (FCM) |
| Kamera | `expo-camera` (Ticket-Scan) |

## Plattformspezifika

- **Expo Push Notifications** über Firebase Cloud Messaging (FCM)
- **Material Design**-Gestaltungssprache durch React Native Paper
- **Back-Button-Handling** (Android Hardware-Zurück-Taste)
- **`expo-secure-store`** für sichere Token-Speicherung
- **Adaptive Icons** für Android-Launcher

## Android-Konfiguration (`app.json`)

```json
{
  "android": {
    "package": "com.happin.app",
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#ffffff"
    },
    "permissions": [
      "android.permission.CAMERA",
      "android.permission.READ_MEDIA_IMAGES"
    ]
  }
}
```

## Abhängigkeiten

- Expo SDK 54 (T-Software)
- React Native (T-Software)
- Firebase Cloud Messaging (AT-Software, für Push)
- [`Präsentation`](praesentation.md) – Screen-Komponenten
