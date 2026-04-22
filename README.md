# Happin Frontend

React Native Web Frontend für die Happin Event-Discovery Plattform (Web, iOS, Android).

## Quick Start

```bash
# 1. Repository clonen
git clone https://gitlab.com/dhbw-se/se-tinf24b2/happin/frontend.git
cd frontend

# 2. Dependencies installieren
npm install

# 3. Environment Variables einrichten
cp .env.example .env

# 4. Development Server starten
npm start
```

## Tech Stack

- **Framework:** React Native 0.81 + Expo SDK 54
- **Language:** TypeScript (strict mode)
- **Routing:** Expo Router (file-based)
- **Navigation:** React Navigation (bottom tabs)
- **Animations:** React Native Reanimated
- **Build:** Metro Bundler
- **Server:** Nginx (Production)
- **Backend:** FastAPI (Python) — separate repository

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo dev server |
| `npm run android` | Start on Android emulator |
| `npm run ios` | Start on iOS simulator |
| `npm run web` | Start in the browser |
| `npm run lint` | Run ESLint |
| `npm run build` | Export web build to `dist/` |
| `npm run reset-project` | Reset to a blank starting point |

## Project Structure

```
happin-frontend/
├── app/                    # Screens and routing (file-based with Expo Router)
│   ├── _layout.tsx         # Root layout
│   ├── modal.tsx           # Modal screen
│   └── (tabs)/             # Tab-based navigation group
│       ├── _layout.tsx     # Tab bar configuration
│       ├── index.tsx       # Home tab
│       └── explore.tsx     # Explore tab
├── components/             # Reusable UI components
├── constants/              # Theme colors (light/dark)
├── hooks/                  # Custom React hooks
├── assets/                 # Images, fonts, static files
├── scripts/                # Utility scripts
├── documentation/          # Project documentation
├── Dockerfile              # Multi-stage Docker build (node + nginx)
├── nginx.conf              # Production web server config
├── .gitlab-ci.yml          # CI/CD pipeline
└── .env.example            # Environment variable template
```

## Environment Variables

See [`.env.example`](.env.example) for required variables:

- `REACT_APP_BACKEND_URL` - Backend API URL
- `REACT_APP_SUPABASE_URL` - Supabase URL for Realtime Features
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase Public Key

**Important:** Never commit `.env` files to git!

## Docker

```bash
# Build image
docker build -t happin-frontend .

# Run container
docker run -p 80:80 happin-frontend
```

Or with Docker Compose:

```bash
cd ..  # Root directory
docker compose up frontend
```

## CI/CD

GitLab CI/CD pipeline automatically builds Docker images on push to `main`:

- **Build Stage:** Docker image built and pushed to GitLab Container Registry
- **Deploy Stage:** Deployment to VM (`vm552.ipp-vps.net`)

## License

DHBW SE Project - Happin Team
