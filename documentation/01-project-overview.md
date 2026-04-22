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
├── app/                    # Screens and routing (file-based with Expo Router)
│   ├── _layout.tsx         # Root layout (stack navigator, fonts, splash screen)
│   ├── modal.tsx           # Modal screen
│   └── (tabs)/             # Tab-based navigation group
│       ├── _layout.tsx     # Tab bar configuration
│       ├── index.tsx       # Home tab screen
│       └── explore.tsx     # Explore tab screen
├── components/             # Reusable UI components
│   ├── external-link.tsx   # Opens URLs in an in-app browser
│   ├── haptic-tab.tsx      # Tab bar button with haptic feedback
│   ├── hello-wave.tsx      # Animated waving hand emoji
│   ├── parallax-scroll-view.tsx  # Scroll view with parallax header image
│   ├── themed-text.tsx     # Text component with theme-aware colors
│   ├── themed-view.tsx     # View component with theme-aware colors
│   └── ui/                 # Lower-level UI primitives
│       ├── collapsible.tsx # Expandable/collapsible section
│       └── icon-symbol.tsx # Cross-platform icon component (SF Symbols on iOS, MaterialIcons elsewhere)
├── constants/
│   └── theme.ts            # Color palette for light and dark themes
├── hooks/
│   ├── use-color-scheme.ts # Returns the device color scheme (native)
│   ├── use-color-scheme.web.ts  # Web-specific color scheme hook
│   └── use-theme-color.ts  # Resolves a theme color by name for the current scheme
├── assets/
│   └── images/             # App icons, splash screen, and static images
├── scripts/
│   └── reset-project.js    # Utility to reset the project to a blank state
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
