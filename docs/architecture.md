# Architecture — MyGGV GPS

> Generated: 2026-02-24 | Scan: exhaustive | Mode: full_rescan

---

## Executive Summary

MyGGV GPS is a mobile-first React SPA providing GPS navigation within Garden Grove Village (Cavite, Philippines). It follows a radically simplified KISS architecture: 7 source files, 3 custom hooks, 6 inline overlay components, direct MapLibre GL JS (no wrappers), conditional rendering (no router), and simple `useState` for all state management.

**Design philosophy:** Fewer files > modular architecture. Native APIs > wrapper libraries. Direct solutions > premature abstractions.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (iOS/Android)                    │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                        App.jsx                            │  │
│  │                                                           │  │
│  │  navState machine ─────────────────────────────────────  │  │
│  │  "gps-permission" → "welcome" → "orientation-permission"  │  │
│  │  → "navigating" → "arrived" | "exit-complete"            │  │
│  │                                                           │  │
│  │  ┌─────────────────┐  ┌────────────────┐  ┌──────────┐  │  │
│  │  │  useMapSetup()  │  │ useRouting()   │  │useNav()  │  │  │
│  │  │  map instance   │  │ OSRM→ORS→Line  │  │ distance │  │  │
│  │  │  GPS tracking   │  │ step parsing   │  │ arrival  │  │  │
│  │  │  block labels   │  │ retry backoff  │  │ (pure)   │  │  │
│  │  └────────┬────────┘  └───────┬────────┘  └────┬─────┘  │  │
│  │           │                   │                 │         │  │
│  │  ┌────────▼───────────────────▼─────────────────▼──────┐ │  │
│  │  │              MapLibre GL JS Map                      │ │  │
│  │  │   (tiles, GeoJSON layers, GeolocateControl)          │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  │                                                           │  │
│  │  Overlay Components (conditional rendering):              │  │
│  │  GPSPermission | Welcome | OrientationPerm |              │  │
│  │  Navigation | Arrived | ExitComplete                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
   ┌─────▼──────┐      ┌──────▼──────┐     ┌──────▼───────┐
   │  Supabase  │      │ OSRM / ORS  │     │  OpenFreeMap  │
   │  (blocks,  │      │  (routing)  │     │  (map tiles)  │
   │   lots)    │      └─────────────┘     └───────────────┘
   └────────────┘
```

---

## Navigation State Machine

The core application logic is a 6-state machine implemented with `useState` in `App.jsx`:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   [gps-permission] ──GPS granted──► [welcome]                    │
│                                        │                         │
│                          destination selected                     │
│                              ┌─────────┴──────────┐             │
│                              │                     │             │
│                    has orientation         no orientation         │
│                              │                     │             │
│                              ▼                     ▼             │
│                       [navigating] ◄── [orientation-permission]  │
│                              │                                    │
│                      ┌───────┴──────────┐                        │
│                      │                  │                         │
│                 dist < 12m         dist < 12m                    │
│               (normal dest)       (exit dest)                    │
│                      │                  │                         │
│                      ▼                  ▼                         │
│                  [arrived]       [exit-complete]                  │
│                      │                                            │
│            ┌─────────┴─────────┐                                 │
│            │                   │                                  │
│      navigate again       exit village                           │
│            │                   │                                  │
│            ▼                   ▼                                  │
│        [welcome]         [navigating]                            │
│                         (exit coords)                            │
└─────────────────────────────────────────────────────────────────┘
```

**Key transitions:**
- Welcome → navigating/orientation: triggered by destination selection
- Navigating → arrived/exit-complete: triggered by `useNavigation` (< 12m from destination)
- Arrived → navigating: "Exit Village" button sets `VILLAGE_EXIT = [120.951863, 14.35098]` as destination
- Any navigating → welcome: "Cancel" button resets destination

---

## Hook Architecture

### `useMapSetup(containerRef)`

**Responsibility:** Initialize and manage the MapLibre GL JS map.

**Initialization sequence:**
1. Dynamic `import("maplibre-gl")` — lazy loads ~264 KB gzipped
2. Parallel fetch of map style from OpenFreeMap
3. Override glyphs URL (OpenFreeMap fonts return 404)
4. Create `MapLibre.Map` with village `maxBounds` + `center` + `zoom`
5. On `map.load`: add block label layer, add `GeolocateControl`
6. Set `isMapReady = true`

**GPS tracking:** `GeolocateControl` handles the browser Geolocation API. Each `geolocate` event updates `userLocation`. Heading shown via map rotation, not the built-in heading dot.

**Returns:** `{ map, userLocation, isMapReady, triggerGeolocate }`

---

### `useRouting(map, origin, destination)`

**Responsibility:** Calculate and display route, handle service failures.

**Routing cascade:**
```
1. OSRM (primary, free, fast)
      ↓ fails/timeout (3s)
2. ORS (fallback, requires API key)
      ↓ fails or no API key
3. Direct line (straight GeoJSON LineString)
      ↓ schedule OSRM retry
4. OSRM retry: 10s → 30s → 60s (exponential backoff)
```

**Recalculation triggers:**
- New destination selected → immediate
- User moved > 30m from last calculated origin → debounced 500ms
- (No deviation detection — uses origin movement threshold instead)

**Map rendering:** Adds/updates `route` GeoJSON source + `route-line` layer (blue, 5px).

**Returns:** `{ routeGeoJSON, distance, steps, routeSource }`

---

### `useNavigation(map, userLocation, destination)`

**Responsibility:** Compute distance and arrival status.

**Pure computation** — no effects, no state, no side effects. Recalculates on every render where `userLocation` or `destination` changes (React Compiler memoizes automatically).

**Arrival detection:** `dist < 12` meters (Haversine from current position to destination coordinates).

**Returns:** `{ distanceRemaining, hasArrived, arrivedAt }`

---

## Component Architecture

### Overlay System

All overlays use the same Framer Motion pattern:

```
<AnimatePresence mode="wait">  ← waits for exit animation
  {navState === "X" && (
    <XOverlay
      key="X"                  ← key change triggers enter/exit
      variants={overlayVariants | modalVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    />
  )}
</AnimatePresence>
```

**Overlay z-index stack:**
```
z-index: 0    → map-container (MapLibre map)
z-index: 800  → .ggv-logo (always visible)
z-index: 900  → .navigation-overlay (top bar, partial screen)
z-index: 1000 → .overlay (full-screen modals)
```

### Component Props

```
GPSPermissionOverlay:    { onGrant, triggerGeolocate, isMapReady }
WelcomeOverlay:          { blocks, isLoadingBlocks, blocksError, onRetryBlocks, onSelectDestination }
OrientationPermissionOverlay: { onGrant }
NavigationOverlay:       { map, distanceRemaining, destination, steps, routeSource, routeGeoJSON, userLocation, onCancel }
ArrivedOverlay:          { destination, onNavigateAgain, onExitVillage }
ExitCompleteOverlay:     {}
```

---

## Data Architecture

### Supabase Database (read-only from client)

```
blocks table:              lots table:
┌──────────┐              ┌────────────┬──────────────────────────┐
│ name     │◄─────────────│ block_name │ lot    │ coordinates      │
│ (text)   │              │ (text FK)  │ (text) │ (PostGIS Point)  │
└──────────┘              └────────────┴──────────────────────────┘
```

- `get_blocks` RPC: returns all block names for dropdown
- `get_lots_by_block(block_name)` RPC: returns lots with centroid coordinates

### Local Village Data (`blocks.js`)
Static polygon coordinates for ~30+ blocks. Used only for map label rendering (not navigation). Navigation destinations come from Supabase.

### Coordinate System
- **GeoJSON standard:** `[longitude, latitude]` — used in map layers, route geometry, destination coordinates
- **GPS API standard:** `{ latitude, longitude }` — used in `userLocation` object from GeolocateControl
- **Supabase PostGIS:** Returns `{ type: "Point", coordinates: [lng, lat] }` — extracted in `WelcomeOverlay`

---

## Deployment Architecture

```
GitHub Repository
       │
       │ git push + tag
       ▼
  Netlify CI/CD
       │ bun run build:netlify
       │ (ESLint + Vite build)
       ▼
  dist/ directory
  ├── index.html
  ├── assets/
  │   ├── index-[hash].js  (React + App + hooks)
  │   ├── vendor-[hash].js (React core)
  │   ├── maps-[hash].js   (MapLibre, lazy)
  │   ├── supabase-[hash].js (Supabase, lazy)
  │   └── animations-[hash].js (Framer, lazy)
  └── [static assets]
       │
       ▼
  Netlify CDN
  ├── SPA redirect: /* → /index.html (status 200)
  ├── Cache: /assets/* → 1 year immutable
  └── Security headers: X-Frame-Options, CSP, etc.
```

**Build optimizations:**
- `console.*` and `debugger` stripped by esbuild in production
- CSS split per chunk (`cssCodeSplit: true`)
- No source maps in production (`sourcemap: false`)
- Target `esnext` (modern smartphones only)

---

## Security Architecture

### Browser Permissions
- **Geolocation:** Requested only from user gesture (GPS screen button → `GeolocateControl.trigger()`)
- **DeviceOrientation:** iOS 13+ requires explicit `DeviceOrientationEvent.requestPermission()` before adding event listener
- **Permissions-Policy header:** `geolocation=(self), camera=(), microphone=()`

### Content Security Policy
Strict allowlist in `index.html` CSP meta tag:
- Scripts: `'self'`, `'unsafe-inline'` (Vite inline scripts), `blob:` (MapLibre web workers)
- Connect: explicit allowlist of 8 external services
- Images: OSM tiles + ArcGIS only
- Fonts: self + demotiles

### No Authentication
This is a public navigation app — no user login, no sensitive data stored, no session management.

---

## Performance Architecture

### Bundle Loading Strategy
```
Initial page load:
  → index.js (React + App) ~121 KB gzipped
  → App renders GPS permission screen immediately

On map init (user clicks GPS button):
  → maps.js (MapLibre) ~264 KB — dynamic import
  → Map style fetch from OpenFreeMap

On destination select (Welcome screen):
  → supabase.js ~50 KB — lazy proxy initialized

On overlay transitions:
  → animations.js ~30 KB — LazyMotion domAnimation
```

### Runtime Performance
- **Orientation events:** Throttled to max 4 updates/sec, min 3° change
- **Map rotation:** `jumpTo()` instead of `flyTo()` (instant = no animation = less GPU)
- **Route recalculation:** 30m movement threshold + 500ms debounce
- **Map bounds:** `maxBounds` restricts tile loading to village area
- **React Compiler:** Auto-memoization — no manual `useMemo`/`useCallback`

---

## Architecture Decisions

| Decision | Chosen | Rejected | Rationale |
|---|---|---|---|
| Map library | MapLibre GL JS (native) | react-map-gl | No abstraction overhead, direct control |
| Routing | OSRM (free) + ORS + direct | Google Maps API | Cost, privacy, works offline fallback |
| State management | useState | Context, Redux, Zustand | 6 states → no complexity needed |
| Navigation | Conditional rendering | React Router | No URL-based routing needed for GPS app |
| Components | Inline in App.jsx | Separate files | All overlays < 100 LOC each, single concern |
| Geospatial math | Custom Haversine | Turf.js | No dependency for 2 functions |
| Tiles | OpenFreeMap (liberty style) | Google Maps tiles | Free, open, no API key |
| Backend | Supabase | Firebase, custom API | Easy PostGIS for coordinates, free tier |
| Build | Vite + Bun | CRA, webpack | Speed, modern tooling |
| Fonts | Self-hosted woff2 | Google Fonts | Privacy, no external dependency, preloadable |
