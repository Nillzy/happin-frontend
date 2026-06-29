# Project Overview

## What is Happin?

Happin is a mobile application built with React Native and Expo. This repository (`happin-frontend`) contains the frontend client. The backend is a separate service built with **FastAPI** (Python).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Expo](https://expo.dev/) (SDK 54) with React Native 0.81 |
| Language | TypeScript (strict mode) |
| Routing | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based) |
| Navigation | React Navigation (bottom tabs) |
| Animations | React Native Reanimated |
| Styling | React Native built-in styling (with light/dark theme support) |
| Linting | ESLint with `eslint-config-expo` |
| Backend | FastAPI (Python) — separate repository |

## Project Structure

```
happin-frontend/
├── app/                          # Expo Router — file-based routing
│   ├── _layout.tsx               # Root layout (ThemeProvider + AuthProvider + Stack)
│   ├── index.tsx                 # Route / → HomeScreen
│   ├── login.tsx                 # Route /login → LoginScreen
│   ├── account.tsx               # Route /account → AccountScreen
│   ├── +not-found.tsx            # 404 Fallback
│   ├── event/
│   │   ├── [eventId].tsx         # Route /event/:id → EventScreen
│   │   └── [eventId]/
│   │       └── host.tsx          # Route /event/:id/host → EventHostScreen
│   └── events/
│       ├── index.tsx             # Route /events → EventListScreen
│       └── create.tsx            # Route /events/create → EventCreateScreen
│
├── src/                          # Application source code
│   ├── components/
│   │   ├── atoms/
│   │   │   ├── DarkLightToggle.tsx  # Theme toggle button
│   │   │   ├── Footer.tsx           # App footer
│   │   │   ├── HappinLogo.tsx       # Logo component (Pin + Heart cutout)
│   │   │   ├── Navbar.tsx           # Navigation bar
│   │   │   ├── AccountButton.tsx    # Account button in navbar
│   │   │   ├── EditButton.tsx       # Edit button component
│   │   │   ├── DatePicker.tsx       # Date picker component
│   │   │   ├── TimePicker.tsx       # Time picker component
│   │   │   └── icons.tsx            # Shared SVG icon components
│   │   ├── auth/
│   │   │   └── AuthGate.tsx         # Auth guard component (redirects to /login)
│   │   ├── event/
│   │   │   ├── EventHero.tsx        # Event hero section with image/gradient
│   │   │   ├── EventDescription.tsx # Event description block
│   │   │   ├── EventInfoBlock.tsx   # Event info cards (date, location, etc.)
│   │   │   └── EventCategories.tsx  # Event category chips
│   │   └── map/
│   │       └── MapView.tsx          # Simple MapTiler map component (web only)
│   ├── contexts/
│   │   └── AuthContext.tsx       # Global auth state (session, user, loading, signOut)
│   ├── screens/
│   │   ├── HomeScreen.tsx        # Landing page with animated Berlin city map
│   │   ├── LoginScreen.tsx       # Passwordless E-Mail OTP login (3 steps)
│   │   ├── AccountScreen.tsx     # User account page
│   │   ├── MapScreen.tsx         # Map view with simple MapTiler integration
│   │   ├── EventListScreen.tsx   # Public events list
│   │   ├── EventScreen.tsx       # Event detail page (hero, RSVP, info)
│   │   ├── EventHostScreen.tsx   # Host view for event management
│   │   ├── EventCreateScreen.tsx # Event creation wizard (multi-step)
│   │   ├── EventCreateStepOne.tsx   # Step 1: Basic info
│   │   ├── EventCreatePreview.tsx   # Final preview before publish
│   │   └── TestScreen.tsx        # Development test screen
│   ├── services/
│   │   ├── supabase.ts           # Supabase client + auth functions
│   │   └── api.ts                # Backend REST API client
│   ├── types/
│   │   ├── events.ts             # Event type definitions
│   │   └── host.ts               # Host type definitions
│   └── utils/
│       ├── LargeSecureStore.ts   # Custom storage adapter (AES-256 encrypted)
│       ├── clearAuthData.ts      # Helper to clear auth data (debug)
│       └── getTimeBasedSlogan.ts # Time-based greeting text
│
├── context/
│   └── ThemeContext.tsx          # Manual theme override context
│
├── constants/
│   ├── berlin-map-paths.ts       # SVG path data for Berlin city map
│   └── colors.ts                 # Material Design 3 color tokens (light + dark)
│
├── hooks/
│   └── use-theme.ts              # useTheme() hook → { colors, isDark }
│
├── assets/
│   └── images/                   # App icons, splash screen, static images
│
├── repo-docs/                    # Technical documentation (you are here)
│
├── Dockerfile                    # Multi-stage build (Node build + Nginx serve)
├── nginx.conf                    # Nginx config for web export
├── .gitlab-ci.yml                # CI/CD pipeline definition
├── app.json                      # Expo app configuration
├── tsconfig.json                 # TypeScript strict config (path alias @/*)
├── eslint.config.js              # ESLint configuration
├── .env.example                  # Environment variables template
└── package.json                  # Dependencies and scripts
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo dev server |
| `npm run android` | Start on Android emulator |
| `npm run ios` | Start on iOS simulator |
| `npm run web` | Start in the browser |
| `npm run lint` | Run ESLint |
| `npm run reset-project` | Reset the project to a blank starting point |

## Architecture Notes

- **File-based routing** — screens are defined by their file path inside `app/`. Expo Router maps these to URL-like routes automatically.
- **Theming** — the app supports light and dark mode out of the box via `constants/theme.ts` and the `useThemeColor` / `useColorScheme` hooks.
- **New Architecture enabled** — React Native's new architecture (Fabric renderer, TurboModules) is enabled in `app.json`.
- **Backend communication** — the frontend will communicate with the FastAPI backend over HTTP/REST (or WebSockets where needed). API integration is not yet set up.
