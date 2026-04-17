# Happin Frontend

React Native Web Frontend für die Happin Event-Discovery Plattform (Web, iOS, Android).

## Quick Start für neue Team-Mitglieder

```bash
# 1. Repository clonen
git clone https://gitlab.com/dhbw-se/se-tinf24b2/happin/frontend.git
cd frontend

# 2. Dependencies installieren
npm install

# 3. Environment Variables einrichten
cp .env.example .env
# Backend URL ist bereits gesetzt: http://localhost:8001

# 4. Development Server starten
npm start
# Frontend öffnet sich automatisch im Browser
```

**Fertig! Frontend läuft mit Hot Reload.** 

---

## Tech Stack

- **Framework:** React Native
- **Platform:** Expo (Web + Mobile aus einer Codebase)
- **Build:** Webpack / Metro Bundler
- **Server:** Nginx (Production)

## Lokale Entwicklung

### Voraussetzungen

- Node.js 20 oder höher
- npm oder yarn

### Setup

1. **Dependencies installieren:**
   ```bash
   npm install
   # oder
   yarn install
   ```
   
   **Neue Bibliothek hinzufügen:**
   ```bash
   npm install neue-bibliothek
   # Wird automatisch in package.json eingetragen
   ```

2. **Environment Variables konfigurieren:**
   ```bash
   cp .env.example .env
   # Backend URL in .env anpassen
   ```
   
   **Wichtig:**
   - `.env` ist in `.gitignore` und wird NICHT committed!
   - Neue Variable hinzugefügt? → Manuell auf VM in `/home/shared/deployment/frontend/.env` eintragen!

3. **Development Server starten:**
   ```bash
   # Expo Web
   npm start
   # oder direkt für Web
   expo start --web
   
   # iOS (requires Mac + Xcode)
   npm run ios
   
   # Android (requires Android Studio)
   npm run android
   ```

4. **App öffnen:**
   - Web: http://localhost:19006 (oder der angezeigte Port)
   - Mobile: Expo Go App auf dem Smartphone

## Docker

### Build & Run

```bash
# Image bauen
docker build -t happin-frontend .

# Container starten
docker run -p 3000:3000 happin-frontend

# Browser öffnen
open http://localhost:3000
```

### Mit Docker Compose (empfohlen)

```bash
cd ..  # Root-Verzeichnis
docker-compose up frontend
```

## Environment Variables

Siehe [`.env.example`](.env.example) für erforderliche Variablen:

- `REACT_APP_BACKEND_URL` - Backend API URL (z.B. `http://vm552.ipp-vps.net:8001`)
- `REACT_APP_SUPABASE_URL` - Supabase URL für Realtime Features
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase Public Key

**Wichtig:** `.env` Files niemals ins Git committen!

## Build für Production

```bash
# Web Build
npm run build
# oder
expo export:web

# Output: dist/ oder build/
```

## CI/CD

GitLab CI/CD Pipeline baut automatisch Docker Images bei Push zu `main`:

- **Build Stage:** Docker Image wird gebaut und zu GitLab Container Registry gepusht
- **Deploy Stage:** Manuelles Deployment zur VM

## Entwicklung

### Code Structure (geplant)

```
frontend/
├── App.js               # Entry Point
├── src/
│   ├── screens/         # Screen Components (MVVM ViewModels)
│   ├── components/      # Reusable UI Components
│   ├── navigation/      # React Navigation Setup
│   ├── services/        # API Client (BackendAdapter)
│   ├── state/           # State Management
│   └── utils/
├── package.json
└── nginx.conf           # Production Server Config
```

### Architektur

Frontend folgt **MVVM Pattern**:
- **View:** React Native Components
- **ViewModel:** Screen Logic & State
- **BackendAdapter:** API Kommunikation

## License

DHBW SE Project - Happin Team
