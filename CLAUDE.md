# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Conventions

**Conversation language**: French (Français) - Claude and the developer exchange in French.

**Application language**: English + Tagalog

- All UI text must be in **English** (primary)
- Each text should include a **brief Tagalog translation** in parentheses or as subtitle
- Target audience: Filipino residents of Garden Grove Village

```jsx
<h1>Enable Location</h1>
<p className="tagalog">(I-enable ang Lokasyon)</p>
```

## Project Overview

MyGGV GPS is a React PWA for GPS navigation within Garden Grove Village, Philippines. Accessed via QR code scan at the village entrance — no install, no signup. Uses **100% native MapLibre GL JS** (no wrappers).

**Architecture Philosophy**: Extreme simplification (KISS principle) — simple useState state management, conditional rendering (no router), direct MapLibre calls (no react-map-gl), no Turf.js.

## Requirements

- **Bun** (>= 1.0) — https://bun.sh
- **Node.js** (>= 20.19.0)

## Commands

```bash
bun run dev              # Dev server (port 5173, LAN accessible)
bun run build            # Production build → dist/
bun run build:netlify    # Lint + build (Netlify-specific, deprecated)
bun run lint             # ESLint check
bun run lint:fix         # ESLint auto-fix
bun run preview          # Preview production build (port 5173)
bun run serve            # Preview on port 3000
bun run release:patch    # Bump patch version, push with git tag
bun run release:minor    # Bump minor version, push with git tag
bun run release:major    # Bump major version, push with git tag
```

No automated tests exist. Testing is manual on real devices (Android Chrome + iOS Safari).

## Architecture

### File Structure

```
src/
├── App.jsx (~990 LOC)             # Main component with 6 inline overlays + state machine
├── main.jsx (14 LOC)              # Entry point + Service Worker registration
├── hooks/
│   ├── useMapSetup.js (~250 LOC)  # Map init + GPS + GeolocateControl + blocks layer
│   ├── useRouting.js (~370 LOC)   # 3-tier routing fallback + retry + deviation detection
│   └── useNavigation.js (34 LOC)  # Pure computation: distance + arrival check
├── data/
│   └── blocks.js                   # Static village block polygons (GeoJSON)
├── lib/
│   ├── geo.js                      # Haversine distance, point-on-line projection
│   └── supabase.js                 # Lazy-loaded Supabase client
└── styles/
    ├── app.css                     # App styles + design tokens
    ├── fonts.css                   # Madimi One self-hosted font
    └── maplibre-gl.css             # MapLibre GL styles
```

### Navigation State Machine (6 states)

Simple `useState` in App.jsx — no React Router, no Context:

```
gps-permission → welcome → orientation-permission → navigating → arrived → exit-complete
```

Each state renders an inline overlay component via conditional rendering.

### Hook Architecture

**useMapSetup(containerRef)** — Initializes MapLibre map, GPS tracking via native `GeolocateControl`, loads block polygons as GeoJSON layers. Returns `{ map, userLocation, isMapReady }`. Single fixed map style (OpenFreeMap Liberty), no style toggle.

**useRouting(map, origin, destination)** — Calculates routes with 3-tier cascading fallback:

1. **OSRM** (router.project-osrm.org) — primary, free
2. **OpenRouteService** (ORS) — fallback, requires `VITE_OPENROUTE_API_KEY`
3. **Direct line** — last resort (bearing only)

Key behaviors:

- Recalculates when user moves >30m from last calculated origin
- Immediate recalculation on destination change (no debounce)
- 500ms debounce on GPS position updates
- Exponential backoff retry for OSRM failures (10s, 30s, 60s)
- 3s request timeout on API calls
- Returns `{ routeGeoJSON, distance, steps, routeSource }` where `routeSource` is `"osrm" | "ors" | "direct"`

**useNavigation(map, userLocation, destination)** — Pure computation hook (no effects, no state). Calculates distance remaining and arrival detection. Returns `{ distanceRemaining, hasArrived, arrivedAt }`. Arrival threshold: `< 12m` (code current value; planned change to 15m in v3.0.0).

### Data Flow

```
main.jsx → <App />  (+ SW registration)

App.jsx
  ├── useMapSetup(containerRef) → map, userLocation, isMapReady
  ├── useRouting(map, userLocation, destination) → routeGeoJSON, distance, steps, routeSource
  ├── useNavigation(map, userLocation, destination) → distanceRemaining, hasArrived, arrivedAt
  ├── Supabase RPC (get_blocks) → block/lot data for WelcomeOverlay
  └── Conditional overlays based on navState
```

### Key Thresholds

| Constant              | Value         | Location              |
| --------------------- | ------------- | --------------------- |
| Arrival detection     | < 12m         | `useNavigation.js:26` |
| Route recalc trigger  | > 30m moved   | `useRouting.js:206`   |
| API request timeout   | 3,000ms       | `useRouting.js`       |
| Route recalc debounce | 500ms         | `useRouting.js:162`   |
| OSRM retry delays     | 10s, 30s, 60s | `useRouting.js:165`   |

### MapLibre Usage

100% native MapLibre GL JS — no react-map-gl, no Turf.js:

- Map source IDs: `"route"` (route line), block sources from `addBlocksLayer()`
- Layer IDs: `"route-line"` (blue #4285F4 line, width 5)
- GPS: Native `GeolocateControl` with `trackUserLocation: true`
- Camera: `map.flyTo()` for bearing/pitch/zoom animations

### Routing Visualization

Single route source `"route"` with layer `"route-line"`. Updated via `map.getSource("route").setData(geometry)`. Created lazily on first route (addSource + addLayer if not exists).

## Deployment

### Hostinger (primary — `public/.htaccess`)

- Build: `bun run build` → upload `dist/` to Hostinger via FTP/SSH (manual, Phase 1)
- Server: LiteSpeed Enterprise (reads `.htaccess` with Apache compatibility)
- SPA redirect: `.htaccess` RewriteRule → `/index.html`
- Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, X-XSS-Protection, Permissions-Policy (geolocation=self), Referrer-Policy strict-origin-when-cross-origin
- Cache: static assets 1 year immutable, HTML no-cache, `sw.js` no-store
- MIME types: `.pbf` (protobuf), `.pmtiles` (PMTiles)
- Gzip: enabled for text/JS/CSS/JSON/SVG/protobuf, disabled for `.pmtiles` (range request compatibility)
- HSTS: disabled by default, uncomment in `.htaccess` after SSL is confirmed working
- Phase 3 (Story 3.4) will automate deployment via GitHub Actions

### Netlify (deprecated — `netlify.toml`)

- Build: `bun run build:netlify` (lint + build)
- Publish: `dist/`
- SPA redirect: all routes → `/index.html`
- Security headers + geolocation restricted to `self`
- Static assets cached 1 year (immutable)
- **Note:** `netlify.toml` kept during DNS transition period. Remove after full cutover to Hostinger.

**Build pipeline**: ESLint → Vite build with code splitting (vendor, maps, supabase, animations chunks). Console logs stripped in production. ES2020+ target.

## Environment Variables

```bash
VITE_SUPABASE_URL=...           # Required — Supabase project URL
VITE_SUPABASE_ANON_KEY=...      # Required — Supabase anon key
VITE_OPENROUTE_API_KEY=...      # Optional — ORS routing fallback
```

Vite-specific (`VITE_` prefix), inlined at build time.

## Code Conventions

- **Modern React** — Hooks only, no classes. React 19 compiler optimization enabled.
- **ESLint** enforced — `no-console` allows `warn`, `error`, `info` only (console.log forbidden)
- **JSX** extension for all component files
- **GeoJSON coordinates**: `[longitude, latitude]` — GPS location objects: `{latitude, longitude}`
- **Constants**: `UPPER_SNAKE_CASE`. **State/props**: `camelCase`. **Components**: `PascalCase`.
- **No commented-out code** — use git history instead

## Utility Library — `src/lib/geo.js`

- `getDistance(lat1, lon1, lat2, lon2)` — Haversine distance in meters
- `projectPointOnLine(pointLng, pointLat, lineCoordinates)` — Project point onto nearest line segment
- `getDistanceAlongRoute(userLng, userLat, targetLng, targetLat, routeCoordinates)` — Distance along polyline

## Key Dependencies

**Runtime**: `maplibre-gl` (5.15.0), `react`/`react-dom` (19.2.3), `@supabase/supabase-js` (2.88.0), `framer-motion` (12.23.26), `pmtiles` (4.4.0)

**Forbidden libraries**: `react-map-gl`, `@turf/turf`, `react-router-dom`, `Context`/`Redux`/`Zustand`

## Village Data

- **Center**: `[120.95134859887523, 14.347872973134175]`
- **Village exit**: `[120.951863, 14.35098]`
- **Block polygons**: `src/data/blocks.js` (static GeoJSON, also loaded from Supabase RPC `get_blocks`)

## Browser Compatibility

Target: **Chrome Android** (primary, ~80% users), **Safari iOS 13+** (secondary)

Critical patterns:

- **iOS orientation**: `DeviceOrientationEvent.requestPermission()` required on iOS 13+
- **CSS viewport**: `100dvh` → `100svh` → `-webkit-fill-available` cascade
- **Input zoom prevention**: `font-size: 16px` minimum on all inputs (iOS Safari)

## v3.0.0 Refactoring Plan

Planning artifacts in `_bmad-output/planning-artifacts/` define a 4-phase refactoring:

- **Phase 1**: Offline-first PWA (Workbox SW, self-hosted tiles/fonts/style, Hostinger migration)
- **Phase 2**: Architecture cleanup (extract overlays to `src/components/`, TypeScript migration, CSS design tokens, NavigationOverlay → floating pills)
- **Phase 3**: Analytics (Supabase) + unit tests (Vitest) + CI/CD (GitHub Actions)
- **Phase 4**: Admin UI for block/lot management (future, no timeline)

Planned threshold change: arrival detection from 12m → **15m** (standardized across all planning docs).
