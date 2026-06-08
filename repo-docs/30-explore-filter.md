# 30 — Explore Page: Filter UI

## Overview

The Explore page (`EventListScreen`) supports filtering events via a bottom sheet modal.
The filter button in the search bar opens `FilterModal`, which lets the user configure
filter criteria and apply them in one batch (single API call per apply).

## Filter Categories

| Category | UI | Backend mechanism |
|---|---|---|
| **Zeitraum** | Single-select chips (Heute / Diese Woche / Diesen Monat / Benutzerdefiniert) | `date_from` + `date_to` query params (ISO strings) |
| **Kategorie** | Multi-select chips (Musik, Sport, Party, Techno, Kunst, Business, Sonstiges) | `categories` query param (comma-separated), Python post-filtering |
| **Standort** | City search with MapTiler autocomplete dropdown | `city` query param, Python post-filtering (case-insensitive) |
| **Kostenlos** | Toggle switch | `is_free=true` query param |

## Architecture

- `FilterModal` (`src/components/atoms/FilterModal.tsx`) — owns draft state, uses `EditDrawer`
  as container and `FilterChip` for period/category selection. Props:
  - `visible: boolean`
  - `onClose: () => void`
  - `initialFilters: EventFilterParams`
  - `onApply: (filters: EventFilterParams) => void`

- `EventFilterParams` / `FilterPeriod` — defined in `src/types/events.ts`

- `getPeriodDates(period)` — local helper in `src/services/api.ts`, converts period enum
  (`'today' | 'week' | 'month'`) to `{ dateFrom, dateTo }` ISO strings in the client's
  local timezone. The `'custom'` period bypasses this helper and uses `filters.dateFrom`
  / `filters.dateTo` (YYYY-MM-DD strings) directly, converting them to start/end-of-day ISO.

- `searchCities(query)` — from `src/services/geocoding.ts`, used by `FilterModal` for
  debounced (300ms) city autocomplete via MapTiler. Returns `CitySuggestion[]` with
  `.name`, `.regionCode`, `.country`.

## State Management

Filter state is local to `EventListScreen`:
- `activeFilters: EventFilterParams` — currently applied filters
- `activeFiltersRef` — ref copy so callbacks always see the latest value

When `onApply` is called:
1. Module-level event cache (`cachedEvents`, `cachedHasMore`) is cleared
2. `activeFilters` state is updated
3. A fresh `api.getPublicEvents()` call is triggered with the new filters
4. `loadMore` and `handleRefresh` both read `activeFiltersRef.current` so they stay in sync

## Filter Badge

The filter button icon turns `colors.primary` (pink) and shows a small dot badge when any
filter is active. The `hasActiveFilters` boolean is derived from `activeFilters` state.

## Adding New Filter Categories

1. Add the new field to `EventFilterParams` in `src/types/events.ts`
2. Serialize it as a query param in `getPublicEvents` in `src/services/api.ts`
3. Add the UI section in `FilterModal.tsx`
4. Implement the backend filter in `backend/app/services/event_service.py`
