# Happin Frontend

React Native / Expo Frontend der **Happin Event-Discovery Plattform** — läuft auf Web, iOS und Android aus einer einzigen Codebasis.

> Das zugehörige Backend (FastAPI / Python) befindet sich in einem separaten Repository.

---

## Inhaltsverzeichnis

1. [Tech Stack](#tech-stack)
2. [Systemarchitektur](#systemarchitektur)
3. [Verzeichnisstruktur](#verzeichnisstruktur)
4. [Voraussetzungen](#voraussetzungen)
5. [Quick Start](#quick-start)
6. [Verfügbare Befehle](#verfügbare-befehle)
7. [Environment Variables](#environment-variables)
8. [Routing](#routing)
9. [Theming](#theming)
10. [Docker](#docker)
11. [CI/CD](#cicd)
12. [Weiterführende Dokumentation](#weiterführende-dokumentation)

---

## Tech Stack

| Bereich | Technologie | Version |
|---|---|---|
| Sprache | TypeScript (strict mode) | ~5.9 |
| Framework | React Native | ^0.81 |
| Build-Tool | Expo SDK | ~54.0 |
| Routing | Expo Router (file-based) | via Expo SDK |
| Navigation | React Navigation (Native Stack) | ^7 |
| Animationen | React Native Reanimated | ~4.1 |
| SVG | react-native-svg | via Expo SDK |
| Auth / DB | Supabase JS Client | ^2.105 |
| Linting | ESLint (`eslint-config-expo`) | — |
| Produktions-Server | Nginx (statischer Web-Export) | — |
| Backend | FastAPI (Python) | separates Repository |

---

## Systemarchitektur

```
┌─────────────────────────────────────────────┐
│               Happin Frontend               │
│           (Expo / React Native)             │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Web    │  │   iOS    │  │ Android  │  │
│  │(Browser) │  │Simulator │  │ Emulator │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  Expo Router (file-based Routing)   │    │
│  │  app/ → automatische URL-Zuordnung  │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌────────────────┐  ┌───────────────────┐  │
│  │  src/screens/  │  │  src/components/  │  │
│  │  (Logik)       │  │  (UI-Bausteine)   │  │
│  └────────────────┘  └───────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  hooks/ + constants/ (Theme, Farben)│    │
│  └─────────────────────────────────────┘    │
└────────────────────┬────────────────────────┘
                     │ HTTP / REST
          ┌──────────▼──────────┐
          │   Happin Backend    │
          │  (FastAPI / Python) │
          └─────────────────────┘
                     │
          ┌──────────▼──────────┐
          │      Supabase       │
          │ (Auth, Datenbank,   │
          │  Realtime)          │
          └─────────────────────┘
```

Die App kommuniziert mit dem Backend über `EXPO_PUBLIC_BACKEND_URL` (REST) und direkt mit Supabase für Authentifizierung (Passwordless E-Mail OTP).

---

## Verzeichnisstruktur

```
happin-frontend/
├── app/                          # Expo Router — Route-Definitionen
│   ├── _layout.tsx               # Root-Layout: ThemeProvider + Stack
│   ├── index.tsx                 # Route / → HomeScreen
│   ├── login.tsx                 # Route /login → LoginScreen
│   ├── +not-found.tsx            # 404-Fallback
│   ├── event/
│   │   └── [eventId].tsx         # Route /event/:id → EventScreen
│   └── events/
│       ├── index.tsx             # Route /events → EventListScreen
│       └── create.tsx            # Route /events/create → EventCreateScreen
│
├── src/                          # Gesamte Anwendungslogik
│   ├── components/
│   │   ├── atoms/
│   │   │   ├── DarkLightToggle.tsx   # Theme-Umschalter
│   │   │   ├── Footer.tsx            # App-Footer
│   │   │   ├── HappinLogo.tsx        # Markenlogo (Pin + Herz-Cutout)
│   │   │   ├── Navbar.tsx            # App-Navigationsleiste
│   │   │   └── icons.tsx             # Wiederverwendbare SVG-Icons
│   │   └── App.tsx                   # (Legacy-Einstiegspunkt, nicht mehr aktiv)
│   ├── screens/
│   │   ├── HomeScreen.tsx            # Startseite mit animierter Berlin-Karte
│   │   ├── LoginScreen.tsx           # E-Mail OTP Login (3 Schritte)
│   │   ├── EventListScreen.tsx       # Event-Übersicht (API-Anbindung)
│   │   ├── EventScreen.tsx           # Event-Detailseite
│   │   └── EventCreateScreen.tsx     # Event-Erstellungsformular
│   └── utils/
│       ├── useAppNavigation.ts       # Typisierter Navigation-Hook (Legacy)
│       └── getTimeBasedSlogan.ts     # Tageszeit-abhängiger Slogan
│
├── constants/
│   ├── colors.ts                 # Material Design 3 Farbtokens (Light + Dark)
│   └── berlin-map-paths.ts       # SVG-Pfaddaten für die Berlin-Karte
│
├── hooks/
│   └── use-theme.ts              # useTheme() → { colors, isDark }
│
├── context/
│   └── ThemeContext.tsx           # React Context für manuellen Theme-Override
│
├── assets/
│   └── images/                   # App-Icons, Splash Screen, statische Bilder
│
├── documentation/                # Technische Projektdokumentation (siehe unten)
│
├── Dockerfile                    # Multi-Stage Build: Node (Build) + Nginx (Serve)
├── nginx.conf                    # Nginx-Konfiguration für den Web-Export
├── .gitlab-ci.yml                # CI/CD Pipeline-Definition
├── app.json                      # Expo App-Konfiguration
├── tsconfig.json                 # TypeScript-Konfiguration (strict, path alias @/*)
├── eslint.config.js              # ESLint-Konfiguration
├── .env.example                  # Vorlage für Environment Variables
└── package.json                  # Abhängigkeiten und npm-Skripte
```

---

## Voraussetzungen

| Voraussetzung | Version | Plattform |
|---|---|---|
| Node.js | ≥ 20 | alle |
| npm | ≥ 10 | alle |
| Xcode | aktuell | nur iOS (macOS) |
| Android Studio + Emulator | aktuell | nur Android |

---

## Quick Start

```bash
# 1. Repository clonen
git clone https://gitlab.com/dhbw-se/se-tinf24b2/happin/frontend.git
cd frontend

# 2. Abhängigkeiten installieren
npm install

# 3. Environment Variables einrichten
cp .env.example .env.local
# .env.local mit den richtigen Werten befüllen (siehe Abschnitt unten)

# 4. Development Server starten
npm run web      # Browser: http://localhost:8081
npm run ios      # iOS Simulator (nur macOS)
npm run android  # Android Emulator
```

---

## Verfügbare Befehle

| Befehl | Beschreibung |
|---|---|
| `npm start` | Expo Dev-Server starten (Plattform interaktiv wählbar) |
| `npm run web` | Im Browser starten (`http://localhost:8081`) |
| `npm run ios` | Auf iOS Simulator starten |
| `npm run android` | Auf Android Emulator starten |
| `npm run lint` | ESLint ausführen |
| `npm run build` | Web-Export nach `dist/` (`expo export --platform web`) |

---

## Environment Variables

Alle Variablen müssen mit dem Präfix `EXPO_PUBLIC_` beginnen, damit sie im Frontend-Code erreichbar sind. Vorlage: [`.env.example`](.env.example)

| Variable | Beschreibung | Pflicht |
|---|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | Basis-URL des FastAPI Backends (z. B. `http://localhost:8000`) | Ja |
| `EXPO_PUBLIC_SUPABASE_URL` | URL der Supabase-Instanz | Ja |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Öffentlicher Supabase Anon-Key | Ja |

> **Wichtig:** `.env.local` niemals in Git einchecken. Die Datei ist in `.gitignore` eingetragen.

---

## Routing

Die App nutzt **Expo Router** (file-based Routing). Jede Datei im `app/`-Verzeichnis wird automatisch zu einer URL-Route. Screens selbst leben in `src/screens/` — die Route-Dateien in `app/` sind dünne Re-Exporte.

| Route | Datei | Screen |
|---|---|---|
| `/` | `app/index.tsx` | `HomeScreen` |
| `/login` | `app/login.tsx` | `LoginScreen` |
| `/events` | `app/events/index.tsx` | `EventListScreen` |
| `/events/create` | `app/events/create.tsx` | `EventCreateScreen` |
| `/event/:id` | `app/event/[eventId].tsx` | `EventScreen` |

Navigation zwischen Screens:

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/events');
router.push(`/event/${eventId}`);
router.replace('/login');
router.back();
```

Weitere Details: [`documentation/08-routing.md`](documentation/08-routing.md)

---

## Theming

Das Design-System basiert auf **Material Design 3** und unterstützt Light Mode ("Happin Light") und Dark Mode ("Neon Horizon"). Das aktive Theme kann auch manuell über den `DarkLightToggle` umgeschaltet werden.

```typescript
import { useTheme } from '@/hooks/use-theme';

const { colors, isDark } = useTheme();
// colors enthält alle MD3-Farbtokens für das aktive Theme
```

Farbpaletten und Typografie: [`documentation/DESIGN.md`](documentation/DESIGN.md)

---

## Docker

```bash
# Image bauen
docker build -t happin-frontend .

# Container starten (Port 80)
docker run -p 80:80 happin-frontend

# Oder via Docker Compose (aus dem Root-Verzeichnis)
docker compose up frontend
```

Der Dockerfile führt einen **Multi-Stage Build** durch:
1. **Build-Stage** — Node.js exportiert den statischen Web-Build nach `dist/`
2. **Serve-Stage** — Nginx liefert den Build aus

---

## CI/CD

Die GitLab CI/CD Pipeline (`.gitlab-ci.yml`) läuft bei jedem Push auf `main` automatisch:

| Stage | Was passiert |
|---|---|
| **build** | Docker-Image wird gebaut und in die GitLab Container Registry gepusht |
| **deploy** | Image wird auf dem Produktionsserver (`vm552.ipp-vps.net`) ausgerollt |

---

## Weiterführende Dokumentation

Detaillierte technische Dokumentation liegt im Ordner [`documentation/`](documentation/).

---

*DHBW Karlsruhe — Software Engineering TINF24B2 — Happin*
