# GUI-Frontend Web

**Kategorie:** T-Software (React Native Web / Expo)  
**Entwurfs-Entsprechung:** `<<component>> GUI-Frontend Web`  
**Implementierung:** Expo Web-Build, `nginx.conf`, `Dockerfile`, `app/` (Expo Router)

## Beschreibung

Das `GUI-Frontend Web` ist die browserbasierte Ausgabe der Happin-App. Es wird durch **React Native Web** und **Expo** realisiert: Derselbe React-Native-Codebase wird für den Browser kompiliert. Die Auslieferung erfolgt über einen **nginx**-Server, der den statischen Web-Build bereitstellt.

## Bereitgestellte Schnittstellen

| Schnittstelle | Beschreibung |
|---|---|
| `DefinePresentation` | Expo Router definiert die Screen-Struktur über das Dateisystem unter `app/` |
| `DisplayData` | React-Rendering aktualisiert die Oberfläche bei State-Änderungen |

## Genutzte Schnittstellen

- **`PresentationEvents`** – React-Navigation-Events und User-Interaktionen werden als Callbacks an die Screen-Komponenten weitergegeben

## Technische Details

| Merkmal | Details |
|---|---|
| Build-Tool | `npx expo export --platform web` |
| Ausgabe | Statisches Verzeichnis `dist/` |
| Server | nginx (siehe `nginx.conf`) |
| Port | 80 (Docker) |
| Deep-Link-Schema | `https://happin.app/` |
| Responsive | Ja – Breakpoints für Mobile und Desktop |

## Plattformspezifika

Das Web-Frontend hat folgende Besonderheiten gegenüber iOS/Android:

- **Web Push** statt Expo Push für Browser-Benachrichtigungen (VAPID)
- **MapLibre GL JS** für Kartenrendering im Browser
- **`window.open()`** statt `Linking.openURL()` für externe Links
- **CSS-basiertes Scrolling** statt nativer ScrollView

## Konfiguration

Relevante Felder in `app.json`:

```json
{
  "web": {
    "bundler": "metro",
    "favicon": "./assets/favicon.png",
    "output": "static"
  }
}
```

## Abhängigkeiten

- Expo SDK 54 (T-Software)
- React Native Web (T-Software)
- nginx (T-Software)
- [`Präsentation`](praesentation.md) – Screen-Komponenten
