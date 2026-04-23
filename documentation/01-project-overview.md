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
├── app/                    # Expo Router entry points (minimal — delegates to src/)
│   ├── _layout.tsx         # Root layout (stack navigator, fonts, splash screen)
│   └── index.tsx           # Entry route — renders <App />
├── src/                    # Application source code
│   ├── components/
│   │   ├── App.tsx         # Root component mounted by app/index.tsx
│   │   └── atoms/
│   │       └── icons.tsx   # Shared SVG icon components
│   ├── navigation/
│   │   └── RootNavigator.tsx  # Top-level React Navigation stack
│   ├── screens/
│   │   ├── HomeScreen.tsx  # Landing page with animated Berlin city map
│   │   ├── LoginScreen.tsx # 3-step phone number login (phone → channel → OTP)
│   │   ├── EventScreen.tsx # Event detail page (hero, RSVP, info, line-up, host)
│   │   └── TestScreen.tsx
│   └── utils/
│       └── useAppNavigation.ts  # Typed navigation hook
├── constants/
│   ├── berlin-map-paths.ts # SVG path data for the Berlin city map
│   └── colors.ts           # Material Design 3 color tokens (light + dark)
├── hooks/
│   └── use-theme.ts        # useTheme() — returns { colors, isDark }
├── assets/
│   └── images/             # App icons, splash screen, and static images
├── documentation/          # Project documentation (you are here)
├── app.json                # Expo app configuration
├── tsconfig.json           # TypeScript configuration
├── eslint.config.js        # ESLint configuration
└── package.json            # Dependencies and scripts
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
