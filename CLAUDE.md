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
bun run typecheck        # TypeScript type checking (npx tsc --noEmit)
bun run lint             # ESLint check
bun run lint:fix         # ESLint auto-fix
bun run preview          # Preview production build (port 5173)
bun run serve            # Preview on port 3000
bun run release:patch    # Bump patch version, push with git tag
bun run release:minor    # Bump minor version, push with git tag
bun run release:major    # Bump major version, push with git tag
```

**Pre-commit verification**: `bun run lint && npx tsc --noEmit && npx prettier --check "src/**/*.{ts,tsx,css}"`

No automated tests exist. Testing is manual on real devices (Android Chrome + iOS Safari).

## Architecture

### File Structure

```
src/
├── App.tsx (~440 LOC)             # State machine + hook calls + conditional rendering
├── main.tsx (14 LOC)              # Entry point + Service Worker registration
├── sw.ts                          # Workbox service worker (PWA offline)
├── components/                    # Extracted overlay components
│   ├── GpsPermissionOverlay.tsx   # GPS permission flow
│   ├── WelcomeOverlay.tsx         # Block/lot selector with Supabase
│   ├── OrientationOverlay.tsx     # Compass permission (iOS/Android)
│   ├── NavigationOverlay.tsx      # Real-time navigation display (pills)
│   ├── ArrivedOverlay.tsx         # Floating arrival modals (non-blocking)
│   └── ExitCompleteOverlay.tsx    # Goodbye screen
├── hooks/
│   ├── useMapSetup.ts (~340 LOC)  # Map init + GPS + GeolocateControl + blocks layer
│   ├── useRouting.ts (~600 LOC)   # 3-tier routing fallback + retry + deviation detection
│   └── useNavigation.ts (44 LOC)  # Pure computation: distance + arrival check
├── data/
│   └── blocks.ts                   # Static village block polygons (GeoJSON)
├── lib/
│   ├── animations.ts              # Shared Framer Motion overlay/modal variants
│   ├── geo.ts                      # Haversine distance, point-on-line projection
│   └── supabase.ts                 # Lazy-loaded Supabase client
└── styles/
    ├── app.css                     # App styles (imports design-tokens.css)
    ├── design-tokens.css           # All --ggv-* CSS custom properties
    ├── fonts.css                   # Madimi One self-hosted font
    └── maplibre-gl.css             # MapLibre GL styles
```

### Navigation State Machine (5 states)

Simple `useState` in App.tsx — no React Router, no Context:

```
gps-permission → welcome → orientation-permission → navigating → exit-complete
```

Arrival is NOT a navState — it uses a separate `showArrivedModal` boolean. When the user arrives at a destination, `navState` stays `"navigating"` and the ArrivedOverlay floats on top without blocking map interaction (GPS tracking, compass rotation, and map gestures continue).

### Hook Architecture

**useMapSetup(containerRef)** — Initializes MapLibre map, GPS tracking via native `GeolocateControl`, loads block polygons as GeoJSON layers. Returns `{ map, userLocation, isMapReady, triggerGeolocate, userMarkerRef }`. Single fixed map style (OpenFreeMap Liberty).

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
- Returns `{ routeGeoJSON, distance, steps, routeSource, isRecalculating }`

**useNavigation(userLocation, destination)** — Pure computation hook (no effects, no state). Calculates distance remaining and arrival detection. Returns `{ distanceRemaining, hasArrived, arrivedAt }`.

### Arrival Flow (showArrivedModal pattern)

When `hasArrived` becomes true and `destination.type !== "exit"`:

- `showArrivedModal` is set to `true` (navState stays `"navigating"`)
- NavigationOverlay hides, ArrivedOverlay appears in a separate `AnimatePresence`
- Map remains fully interactive (`pointer-events: none` on overlay, `auto` on modals)
- GPS tracking, compass rotation, and route line continue unchanged
- Haptic feedback + bell sound play on arrival

For exit destinations (`destination.type === "exit"`), navState transitions to `"exit-complete"` (opaque overlay).

### Data Flow

```
main.tsx → <App />  (+ SW registration)

App.tsx
  ├── useMapSetup(containerRef) → map, userLocation, isMapReady
  ├── useRouting(map, userLocation, destination) → routeGeoJSON, distance, steps, routeSource
  ├── useNavigation(userLocation, destination) → distanceRemaining, hasArrived, arrivedAt
  ├── Supabase RPC (get_blocks) → block/lot data for WelcomeOverlay
  ├── AnimatePresence (mode="wait") → state-based overlays
  └── AnimatePresence (separate) → floating arrived modals
```

### Key Thresholds

| Constant              | Value         | Location              |
| --------------------- | ------------- | --------------------- |
| Arrival detection     | < 15m         | `useNavigation.ts:10` |
| Route recalc trigger  | > 30m moved   | `useRouting.ts:217`   |
| API request timeout   | 3,000ms       | `useRouting.ts:127`   |
| Route recalc debounce | 500ms         | `useRouting.ts:211`   |
| OSRM retry delays     | 10s, 30s, 60s | `useRouting.ts:214`   |

### MapLibre Usage

100% native MapLibre GL JS — no react-map-gl, no Turf.js:

- Map source IDs: `"route"` (route line), block sources from `addBlocksLayer()`
- Layer IDs: `"route-line"` (blue #4285F4), `"route-outline"`, `"route-arrows"`
- GPS: Native `GeolocateControl` with `trackUserLocation: true`
- Camera: `map.easeTo()` for smooth transitions, `map.jumpTo()` for instant snaps

### Routing Visualization

Single route source `"route"` with layers `"route-outline"`, `"route-line"`, `"route-arrows"`. Updated via `map.getSource("route").setData(geometry)`. Source and layers are recreated on each route update (old removed, new added).

## Deployment

### Hostinger (primary — `public/.htaccess`)

- Build: `bun run build` → upload `dist/` to Hostinger via FTP/SSH (manual)
- Server: LiteSpeed Enterprise (reads `.htaccess` with Apache compatibility)
- Domain: https://myggvgps.charlesbourgault.com/
- SPA redirect: `.htaccess` RewriteRule → `/index.html`
- Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, Permissions-Policy (geolocation=self)
- Cache: static assets 1 year immutable, HTML no-cache, `sw.js` no-store
- Gzip: enabled for text/JS/CSS/JSON/SVG/protobuf, disabled for `.pmtiles`

**Build pipeline**: ESLint → Vite build with code splitting (vendor, maps, supabase, animations chunks). Console logs stripped in production. ES2020+ target.

## Environment Variables

```bash
VITE_SUPABASE_URL=...           # Required — Supabase project URL
VITE_SUPABASE_ANON_KEY=...      # Required — Supabase anon key
VITE_OPENROUTE_API_KEY=...      # Optional — ORS routing fallback
```

Vite-specific (`VITE_` prefix), inlined at build time.

## Code Conventions

- **TypeScript** — All source files use `.tsx` (components) and `.ts` (hooks, libs, utils)
- **React 19** — Hooks only, no classes. React Compiler optimization enabled.
- **ESLint** enforced — `no-console` allows `warn`, `error`, `info` only (console.log forbidden). `react-hooks/set-state-in-effect` forbids synchronous `setState` inside `useEffect`.
- **GeoJSON coordinates**: `[longitude, latitude]` — GPS location objects: `{latitude, longitude}`
- **Constants**: `UPPER_SNAKE_CASE`. **State/props**: `camelCase`. **Components**: `PascalCase`.
- **No commented-out code** — use git history instead
- **CSS**: Design tokens in `design-tokens.css` (all `--ggv-*` prefixed). Component styles in `app.css`.

## Utility Library — `src/lib/geo.ts`

- `getDistance(lat1, lon1, lat2, lon2)` — Haversine distance in meters
- `projectPointOnLine(pointLng, pointLat, lineCoordinates)` — Project point onto nearest line segment
- `getDistanceAlongRoute(userLng, userLat, targetLng, targetLat, routeCoordinates)` — Distance along polyline
- `flattenCoordinates(routeGeoJSON)` — Flatten MultiLineString/LineString to coordinate array

## Key Dependencies

**Runtime**: `maplibre-gl` (5.15.0), `react`/`react-dom` (19.2.3), `@supabase/supabase-js` (2.88.0), `framer-motion` (12.23.26), `pmtiles` (4.4.0)

**Forbidden libraries**: `react-map-gl`, `@turf/turf`, `react-router-dom`, `Context`/`Redux`/`Zustand`

## Village Data

- **Center**: `[120.95134859887523, 14.347872973134175]`
- **Village exit**: `[120.951863, 14.35098]`
- **Block polygons**: `src/data/blocks.ts` (static GeoJSON, also loaded from Supabase RPC `get_blocks`)

## Browser Compatibility

Target: **Chrome Android** (primary, ~80% users), **Safari iOS 13+** (secondary)

Critical patterns:

- **iOS orientation**: `DeviceOrientationEvent.requestPermission()` required on iOS 13+
- **CSS viewport**: `100dvh` → `100svh` → `-webkit-fill-available` cascade
- **Input zoom prevention**: `font-size: 16px` minimum on all inputs (iOS Safari)
