# Code Analysis — MyGGV GPS

> Generated: 2026-02-24 | Scan: exhaustive | Mode: full_rescan

---

## 1. API Contracts

### 1.1 Routing APIs

#### OSRM (Primary)
- **Endpoint:** `https://router.project-osrm.org/route/v1/foot/{originLng},{originLat};{destLng},{destLat}`
- **Params:** `overview=full&geometries=geojson&steps=true`
- **Method:** GET
- **Auth:** None (public API)
- **Timeout:** 3 seconds (`REQUEST_TIMEOUT_MS`)
- **Response:** `{ code: "Ok", routes: [{ geometry: GeoJSON, distance: number, legs: [{ steps: [...] }] }] }`
- **Used in:** `src/hooks/useRouting.js` → `fetchOSRM()`
- **Step parsing:** Each leg step's `maneuver` is parsed via `parseManeuver()` → `{ type, icon, modifier, distance, isSignificant, location: [lng, lat] }`

#### OpenRouteService (Fallback level 2)
- **Endpoint:** `https://api.openrouteservice.org/v2/directions/foot-walking`
- **Params:** `api_key={VITE_OPENROUTE_API_KEY}&start={lng},{lat}&end={lng},{lat}`
- **Method:** GET
- **Auth:** `VITE_OPENROUTE_API_KEY` env var (optional — disabled if absent)
- **Timeout:** 3 seconds
- **Response:** `{ features: [{ geometry: GeoJSON, properties: { summary: { distance: number } } }] }`
- **Used in:** `src/hooks/useRouting.js` → `fetchORS()`
- **Note:** Does NOT return navigation steps in this format — steps set to `[]`

#### Direct Line (Fallback level 3)
- **No external call** — computes straight-line GeoJSON from current position to destination
- **Distance:** Haversine formula via `getDistance()` from `src/lib/geo.js`
- **Steps:** Single `{ type: "straight", icon: "↑", distance }` step
- **OSRM retry:** Exponential backoff scheduled (10s, 30s, 60s) via `RETRY_DELAYS`

### 1.2 Supabase RPC Calls

#### `get_blocks`
- **Call:** `supabase.rpc("get_blocks")`
- **Returns:** `[{ name: string }]` — list of block names
- **Used in:** `App.jsx` → initial `useEffect` on mount + `retryLoadBlocks()`
- **Timing:** Pre-loaded during GPS permission screen (before user interaction)

#### `get_lots_by_block`
- **Call:** `supabase.rpc("get_lots_by_block", { block_name: string })`
- **Returns:** `[{ lot: string, coordinates: { type: "Point", coordinates: [lng, lat] } }]`
- **Used in:** `WelcomeOverlay` → `useEffect` triggered when `selectedBlock` changes
- **Note:** Coordinates returned as PostGIS GeoJSON Point

### 1.3 Map Tile Services
- **Style:** `https://tiles.openfreemap.org/styles/liberty` (preloaded via `<link rel="preload">`)
- **Glyphs:** `https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf` (overrides OpenFreeMap default that returns 404)
- **Tiles:** OpenStreetMap CDN (a/b/c.tile.openstreetmap.org), ArcGIS satellite

---

## 2. Data Models

### 2.1 Supabase Schema (inferred from RPC usage)

#### Table: blocks (via `get_blocks` RPC)
| Column | Type | Notes |
|---|---|---|
| `name` | text | Block identifier (e.g. "1", "2", "3A") |

#### Table: lots (via `get_lots_by_block` RPC)
| Column | Type | Notes |
|---|---|---|
| `lot` | text | Lot number within block |
| `coordinates` | PostGIS Point (geography) | `{ type: "Point", coordinates: [lng, lat] }` |
| `block_name` | text | Foreign key to blocks.name |

### 2.2 Local Data: Village Block Polygons (`src/data/blocks.js`)

```js
// Structure
export const blocks = [
  {
    name: string,           // Block label displayed on map
    coords: [lng, lat][]    // Polygon vertices (GeoJSON order: [longitude, latitude])
  }
]
```
- **Count:** ~30+ blocks (797 LOC file)
- **Usage:** Map labels rendered via `addBlocksLayer()` in `useMapSetup.js`
- **Note:** These are for map display only. Navigation destinations come from Supabase.

### 2.3 In-Memory State Objects

#### `destination` (App.jsx state)
```js
{
  type: "lot" | "exit",
  coordinates: [longitude, latitude],  // GeoJSON order
  name: string                         // Display name
}
```

#### `userLocation` (from GeolocateControl)
```js
{
  latitude: number,
  longitude: number
}
```

#### Navigation step (from OSRM parsing)
```js
{
  type: string,           // "turn" | "arrive" | "roundabout" | "straight" | etc.
  icon: string,           // Unicode arrow/emoji
  modifier: string|null,  // "left" | "right" | "slight left" | etc.
  distance: number,       // meters to this step
  isSignificant: boolean, // false for straight/continue
  location: [lng, lat]    // Position of this maneuver
}
```

---

## 3. State Management

### 3.1 Navigation State Machine

**Implementation:** `useState` in `App.jsx` — no Context, no Redux, no Router.

```
navState transitions:
  "gps-permission"         → "welcome"                (GPS granted)
  "welcome"                → "navigating"             (destination selected + already has orientation)
  "welcome"                → "orientation-permission" (destination selected + no orientation yet)
  "orientation-permission" → "navigating"             (compass permission granted)
  "navigating"             → "welcome"                (user cancels)
  "navigating"             → "arrived"                (dist < 12m, non-exit destination)
  "navigating"             → "exit-complete"          (dist < 12m, exit destination)
  "arrived"                → "welcome"                (navigate again)
  "arrived"                → "navigating"             (exit village → sets exit destination)
```

**Key state variables in App.jsx:**
| Variable | Type | Purpose |
|---|---|---|
| `navState` | string | Current navigation state (6 values) |
| `destination` | object\|null | Selected destination with coordinates |
| `hasOrientationPermission` | boolean | Tracks if compass permission was granted |
| `blocks` | array | Block list from Supabase |
| `isLoadingBlocks` | boolean | Loading state for Supabase RPC |
| `blocksError` | string\|null | Error message from Supabase |

### 3.2 Hook State (internal, not shared)

**useMapSetup:**
- `map` — MapLibre instance
- `userLocation` — latest GPS position
- `isMapReady` — map load complete
- `geolocateRef` — ref to GeolocateControl

**useRouting:**
- `routeGeoJSON` — LineString geometry
- `distance` — total route distance (meters)
- `steps` — parsed turn-by-turn steps array
- `routeSource` — "osrm" | "ors" | "direct"
- Internal refs: `abortRef`, `lastOriginRef`, `debounceTimerRef`, `retryTimerRef`, `retryCountRef`, `lastDestRef`

**useNavigation:** Pure computation — no state, no effects.

### 3.3 Refs Used for Performance

| Ref | Location | Purpose |
|---|---|---|
| `mapContainerRef` | App.jsx | MapLibre DOM mount point |
| `arrivedDestinationRef` | App.jsx | Prevents double-firing arrival modal |
| `lastDestinationKeyRef` | App.jsx | Detects destination change for arrival reset |
| `isNavigatingRef` | App.jsx | Avoids stale closure in orientation effect |
| `userInteractionTimeRef` | App.jsx | Auto-recenter after 5s of no interaction |
| `recenterTimeoutRef` | App.jsx | Cleanup handle for recenter timer |
| `geolocateRef` | useMapSetup.js | Reference to GeolocateControl instance |
| `abortRef` | useRouting.js | AbortController for in-flight requests |
| `lastOriginRef` | useRouting.js | Skip recalc if moved < 30m |
| `debounceTimerRef` | useRouting.js | 500ms debounce on GPS position updates |
| `retryTimerRef` | useRouting.js | Exponential backoff timer handle |
| `retryCountRef` | useRouting.js | Current retry attempt count (max 3) |
| `lastDestRef` | useRouting.js | Detect destination change for immediate recalc |

---

## 4. UI Component Inventory

### 4.1 Inline Overlay Components (in App.jsx)

All 6 overlays are defined inline in `src/App.jsx`. They use Framer Motion for enter/exit animations via `AnimatePresence` with `mode="wait"`.

#### `GPSPermissionOverlay`
- **State:** `isRequesting`, `error`
- **Behavior:** Calls `triggerGeolocate()` → native GPS permission dialog → `onGrant()` on success
- **Loading state:** Button disabled + spinner while `!isMapReady`
- **Error state:** Displays "Please, try again" on failure
- **Displays:** `__APP_VERSION__` (injected by Vite define)

#### `WelcomeOverlay`
- **State:** `selectedBlock`, `selectedLot`, `lots`, `isLoadingLots`
- **Data flow:** Block list from Supabase (`blocks` prop) → select block → fetch lots via `get_lots_by_block` → select lot → navigate
- **Error handling:** Retry button on Supabase failure
- **Cascading selects:** Block → Lot (lot disabled until block selected)

#### `OrientationPermissionOverlay`
- **State:** `isRequesting`, `error`
- **Platform detection:** iOS 13+ requires `DeviceOrientationEvent.requestPermission()` → Android skips permission, calls `onGrant()` directly
- **Error state:** Shows permission denied message

#### `NavigationOverlay`
- **Props:** `map`, `distanceRemaining`, `destination`, `steps`, `routeSource`, `routeGeoJSON`, `userLocation`, `onCancel`
- **Layout:** Fixed top bar (not full-screen overlay) — map visible beneath
- **Turn instruction:** Computed inline via `getDistanceAlongRoute()` — finds next significant step ahead of user on route
- **Map controls:** Inline zoom +/- buttons (fixed right-center)
- **Format:** `distanceRemaining` formatted as "X m" or "X.X km"

#### `ArrivedOverlay`
- **Props:** `destination`, `onNavigateAgain`, `onExitVillage`
- **Actions:** "Navigate Somewhere Else" (resets to welcome) or "Exit Village" (sets exit coordinates as destination)
- **Animation:** Success bounce on icon

#### `ExitCompleteOverlay`
- **Props:** None
- **Content:** "Safe Travels!" / "Ingat sa byahe!" — terminal state, no action buttons

### 4.2 Animation System

```js
// Shared animation variants
const overlayVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
const modalVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: { type: "spring", damping: 25 } },
  exit: { scale: 0.8, opacity: 0 }
}
```

- **Container:** `LazyMotion` with `domAnimation` features (code-split)
- **Reduced motion:** `MotionConfig reducedMotion="user"` respects OS preference
- **Transitions:** `AnimatePresence mode="wait"` — exit animation completes before next enters

---

## 5. Configuration Analysis

### 5.1 Vite Config (`vite.config.js`)
- **`__APP_VERSION__`:** Injected from `package.json` at build time
- **`esbuild.drop`:** Removes `console.*` and `debugger` in production builds
- **Manual chunks:** `vendor` (React), `maps` (MapLibre), `supabase`, `animations` (Framer)
- **Target:** `esnext` — optimized for modern smartphones (no legacy polyfills)
- **`cssCodeSplit: true`** — CSS split per chunk for better cache utilization
- **`modulePreload.polyfill: false`** — modern browsers handle this natively
- **Alias:** `@` → `./src`

### 5.2 ESLint Config (`eslint.config.js`)
- **Flat config** format (ESLint 9+)
- **Plugins:** `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- **Rules enforced:** React hooks rules, fast-refresh compatibility

### 5.3 Content Security Policy (`index.html`)
Allowed origins in CSP:
- **Scripts:** `'self'`, `'unsafe-inline'`, `blob:` (MapLibre workers)
- **Connect:** Supabase, OSRM, ORS, OpenFreeMap, OSM tiles, ArcGIS
- **Images:** OSM tiles, ArcGIS, OpenFreeMap
- **Fonts:** `'self'`, demotiles.maplibre.org

---

## 6. Entry Points

| Entry Point | Path | Purpose |
|---|---|---|
| HTML shell | `index.html` | PWA meta, CSP, preload hints, `<div id="root">` |
| JS entry | `src/main.jsx` | Service Worker registration, `createRoot().render(<App />)` |
| Main component | `src/App.jsx` | State machine, hook composition, inline overlays |
| Map hook | `src/hooks/useMapSetup.js` | MapLibre init, GeolocateControl, block labels |
| Routing hook | `src/hooks/useRouting.js` | OSRM/ORS/direct route + turn parsing |
| Navigation hook | `src/hooks/useNavigation.js` | Distance/arrival computation (pure) |
| Geo utilities | `src/lib/geo.js` | `getDistance`, `projectPointOnLine`, `getDistanceAlongRoute` |
| Supabase client | `src/lib/supabase.js` | Lazy-loaded proxy for `rpc()` and `from()` |
| Village data | `src/data/blocks.js` | Static block polygon coordinates for map labels |

---

## 7. Security & Permissions

### Browser Permissions Requested
| Permission | When | How |
|---|---|---|
| Geolocation | GPS permission screen | Via `GeolocateControl.trigger()` (native browser dialog) |
| DeviceOrientation | Orientation permission screen (iOS only) | Via `DeviceOrientationEvent.requestPermission()` |

### Security Headers (Netlify)
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(self), camera=(), microphone=()`

### Notes
- No user authentication — public app
- No sensitive data stored client-side
- Environment variables inlined at build time (not runtime secrets)
- `.env` with real credentials must never be committed (`.gitignore`)

---

## 8. Internationalization (i18n)

**Pattern:** Bilingual inline text (not a dedicated i18n library).

```jsx
// Primary text (English) + translation (Tagalog) inline
<h1>Enable Location</h1>
<p className="gps-tagalog">(I-enable ang Lokasyon)</p>

// Or inline span
<p>
  MyGGV GPS needs your location...
  <span className="tagalog-inline">Kailangan ng MyGGV GPS...</span>
</p>
```

**CSS classes for translations:**
- `.gps-tagalog`, `.welcome-tagalog`, `.orientation-tagalog`, `.arrived-tagalog`, `.exit-tagalog` — block-level italic green text
- `.tagalog-inline` — inline block italic green span

**Coverage:** All 6 overlay screens have English + Tagalog text.

---

## 9. Performance Optimizations

| Optimization | Implementation |
|---|---|
| MapLibre lazy load | Dynamic `import("maplibre-gl")` in `useMapSetup` |
| Supabase lazy load | Proxy object, lazy `import("@supabase/supabase-js")` on first call |
| Framer Motion code-split | `LazyMotion features={domAnimation}` |
| Map tile preload | `<link rel="preload" href="...tiles.openfreemap.org/styles/liberty">` |
| Font preload | Self-hosted Madimi One woff2 with `<link rel="preload">` |
| Route debounce | 500ms debounce on GPS position changes (avoids API spam) |
| Route recalc threshold | Skip recalc if moved < 30m from last calculated origin |
| Map rotation throttle | Max 4 updates/sec, min 3° delta change |
| `map.jumpTo()` vs `flyTo()` | Used for compass rotation (instant = less GPU) |
| maxBounds on map | Restricts tile loading to village area only |
| Production console strip | `esbuild.drop: ["console", "debugger"]` |
| CSS code split | `cssCodeSplit: true` in Vite |
| Service Worker | Optional PWA caching (`sw.js`, silent fail if unavailable) |

---

## 10. Key Algorithms

### Haversine Distance (`geo.js:getDistance`)
Calculates great-circle distance between two lat/lng points. Used for:
- Arrival detection (< 12m threshold)
- Route recalculation trigger (moved > 30m)
- Direct-line fallback distance
- Distance-along-route calculation

### Point-on-Line Projection (`geo.js:projectPointOnLine`)
Projects a GPS point onto the nearest segment of the route polyline. Used for:
- Determining which turn step the user is approaching
- Calculating exact distance-along-route to next maneuver

### Turn Step Detection (`NavigationOverlay`)
```
For each significant step in steps[]:
  project user onto route
  get distance along route to step location
  if distance >= 0 (step is ahead):
    return { ...step, distanceToStep }  ← first upcoming step
```

### Compass Orientation (`App.jsx` deviceorientation handler)
```
if iOS: heading = e.webkitCompassHeading      // 0=North, clockwise
if Android: heading = (360 - e.alpha) % 360   // invert counter-clockwise
throttle: max 4/sec, min 3° change
map.jumpTo({ bearing: heading, pitch: 45 })
```
