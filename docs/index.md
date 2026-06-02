# Happin Frontend – Dokumentation

Happin ist eine Eventplattform, auf der Nutzer Events entdecken, erstellen, buchen und verwalten können. Dieses Dokument beschreibt die Architektur und die Komponenten des **Happin-Frontends**.

## Technologie-Stack

| Komponente | Technologie |
|---|---|
| Framework | React Native (Expo SDK 54) |
| Sprache | TypeScript (strict mode) |
| Navigation | Expo Router + React Navigation |
| Authentifizierung | Supabase Auth |
| Kartenmaterial | MapLibre GL |
| Zustandsverwaltung | React Context API |
| Zielplattformen | Web, iOS, Android |
| Build-Tool | Expo / Metro Bundler |

## Schnellstart

```bash
# Abhängigkeiten installieren
npm install

# Umgebungsvariablen setzen
cp .env.example .env
# .env befüllen

# Entwicklungsserver starten
npx expo start

# Web-Build starten
npx expo start --web
```

## Projektstruktur

```
happin-frontend/
├── app/                      # Expo Router – Dateibasiertes Routing
├── src/
│   ├── screens/              # Screen-Komponenten (eine je ViewModel)
│   ├── components/           # Wiederverwendbare UI-Komponenten
│   │   ├── atoms/            # Basisbausteine
│   │   ├── event/            # Event-spezifische Komponenten
│   │   ├── auth/             # Auth-bezogene Komponenten
│   │   └── map/              # Karten-Komponenten
│   ├── contexts/             # Globaler Zustand (AuthContext, etc.)
│   ├── services/             # API-Client und externe Dienste
│   ├── types/                # TypeScript-Typdefinitionen
│   └── utils/                # Hilfsfunktionen
├── constants/                # Farben, Gradienten, Konstanten
├── package.json
└── mkdocs.yml
```

## Weiterführende Abschnitte

- [Architektur](architecture.md) – Komponentendiagramm und Entwurfsvergleich
- [Komponenten](components/index.md) – Jede Komponente auf einer eigenen Seite
