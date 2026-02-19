# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Conventions

**Conversation language**: French (Français) - Claude and the developer exchange in French.

**Application language**: English + Tagalog

- All UI text must be in **English** (primary)
- Each text should include a **brief Tagalog translation** in parentheses or as subtitle
- Target audience: Filipino residents of Garden Grove Village

**Example format**:

```jsx
<h1>Enable Location</h1>
<p className="tagalog">(I-enable ang Lokasyon)</p>
```

Or inline:

```jsx
<p>Enable GPS to navigate • I-enable ang GPS para mag-navigate</p>
```

## Project Overview

MyGGV GPS is a React-based web application for GPS navigation within Garden Grove Village, Philippines. It uses **100% native MapLibre GL JS** (no wrappers) with a radically simplified architecture.

**Architecture Philosophy**: Extreme simplification following KISS principle

- 7 total files (~1,250 LOC core)
- 3 essential hooks
- Direct MapLibre GL JS (no react-map-gl)
- Conditional rendering (no routing library)
- Simple useState state management (no Context/Redux)

## Requirements

- **Bun** (>= 1.0) - Install from https://bun.sh
- **Node.js** (>= 20.19.0) - For runtime compatibility

## Commands

```bash
bun run dev              # Start development server (port 5173, accessible from local network)
bun run build            # Production build (output to dist/)
bun run build:netlify    # Build with lint check (used by Netlify deployment)
bun run lint             # ESLint validation
bun run lint:fix         # ESLint auto-fix
bun run preview          # Preview production build locally (port 5173)
bun run serve            # Alternative preview on port 3000
bun run release:patch    # Bump version (patch), push to git with tag
bun run release:minor    # Bump version (minor), push to git with tag
bun run release:major    # Bump version (major), push to git with tag
```

## Architecture

### File Structure (7 files total)

```
src/
├── App.jsx (513 LOC)              # Main component with 6 inline overlays
├── main.jsx (23 LOC)              # Entry point (Theme + App only)
├── hooks/
│   ├── useMapSetup.js (213 LOC)   # Map init + GPS + GeolocateControl
│   ├── useRouting.js (300 LOC)    # OSRM routing + deviation detection
│   └── useNavigation.js (237 LOC) # Turn-by-turn + arrival detection
├── data/
│   └── blocks.js                   # Village block polygons
└── lib/
    └── supabase.js                 # Supabase client (optional)
```

### Navigation State Machine (6 states)

Simple `useState` in `App.jsx` - no React Router, no Context:

```
gps-permission → welcome → orientation-permission → navigating → arrived → exit-complete
```

**Implementation**:

```jsx
const [navState, setNavState] = useState('gps-permission');

// Conditional rendering
{navState === 'gps-permission' && <GPSPermissionOverlay onGrant={...} />}
{navState === 'welcome' && <WelcomeOverlay onSelectDestination={...} />}
{navState === 'orientation-permission' && <OrientationPermissionOverlay onGrant={...} />}
{navState === 'navigating' && <NavigationOverlay {...navigationData} />}
{navState === 'arrived' && <ArrivedOverlay onReset={...} />}
{navState === 'exit-complete' && <ExitCompleteOverlay onReset={...} />}
```

### Hook Architecture (3 hooks)

#### 1. useMapSetup(containerRef, options)

**Purpose**: Initialize MapLibre map with GPS tracking

**Returns**:

```js
{
  (map, // maplibregl.Map instance
    userLocation, // {latitude, longitude, accuracy, heading}
    isMapReady, // boolean
    setMapStyle); // (style: 'osm' | 'satellite') => void
}
```

**Key Features**:

- Direct `new maplibregl.Map()` initialization
- Native `GeolocateControl` for GPS tracking
- Block polygons loaded as GeoJSON source + layers
- Map style switching (OSM/satellite)

#### 2. useRouting(map, origin, destination)

**Purpose**: Calculate routes with cascading fallback + deviation detection

**Returns**:

```js
{
  (routeGeoJSON, // GeoJSON LineString or null
    distance, // meters
    duration, // seconds
    isCalculating, // boolean
    error); // Error or null
}
```

**Key Features**:

- Cascading fallback: OSRM → Direct line
- **Automatic recalculation on deviation** (>25m threshold, checks every 5s)
- Route visualization: Single blue line (`route-remaining` source)
- Native `map.addSource()` and `map.getSource().setData()` usage

#### 3. useNavigation(map, userLocation, routeGeoJSON, destination)

**Purpose**: Turn-by-turn navigation logic and arrival detection

**Returns**:

```js
{
  (bearing, // degrees (0-360) to destination
    nextTurn, // {instruction, distance} or null
    distanceRemaining, // meters
    hasArrived); // boolean (< 20m threshold)
}
```

**Key Features**:

- Bearing calculation using Haversine formula
- Distance remaining calculation
- Arrival detection (< 20m threshold)
- Camera control with `map.flyTo()` (bearing, pitch, zoom)

### Inline Overlay Components (in App.jsx)

All UI overlays are defined inline (no separate files):

1. **GPSPermissionOverlay** - Request GPS access
2. **WelcomeOverlay** - Destination selection (blocks/POIs)
3. **OrientationPermissionOverlay** - Request device orientation (iOS/Android)
4. **NavigationOverlay** - Turn-by-turn display with compass
5. **ArrivedOverlay** - Arrival confirmation
6. **ExitCompleteOverlay** - Exit village flow

**Benefits**: Fewer files, simpler navigation, no prop drilling

### MapLibre Native API Usage

**100% Native MapLibre** - No react-map-gl wrapper, no Turf.js library:

```js
// Map initialization
const map = new maplibregl.Map({
  container: containerRef.current,
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: [120.9513, 14.3479],
  zoom: 15,
});

// GPS tracking with GeolocateControl
const geolocate = new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showUserHeading: true,
});
map.addControl(geolocate);

// Route visualization
map.addSource("route-remaining", {
  type: "geojson",
  data: routeGeoJSON,
});

map.addLayer({
  id: "route-remaining-line",
  type: "line",
  source: "route-remaining",
  paint: {
    "line-color": "#4285F4",
    "line-width": 5,
  },
});

// Update route dynamically
map.getSource("route-remaining").setData(newRouteGeoJSON);
```

### Routing Logic

**Cascading Fallback** (in `useRouting.js`):

1. **OSRM** (router.project-osrm.org) - Free, fast routing
2. **Direct line** - Last resort fallback

**Deviation Detection**:

- Checks every 5 seconds if user is > 25m from route
- Prevents recalculation spam (minimum 10 seconds between recalcs)
- Automatically triggers route recalculation by clearing `routeGeoJSON`

### Data Flow

```
main.jsx
  └── <Theme><App /></Theme>

App.jsx
  ├── useMapSetup(containerRef) → map, userLocation, setMapStyle
  ├── useRouting(map, userLocation, destination) → routeGeoJSON, distance, duration
  ├── useNavigation(map, userLocation, routeGeoJSON, destination) → bearing, distanceRemaining, hasArrived
  └── Conditional overlays based on navState
```

**No React Router** - Simple conditional rendering based on `navState`
**No Context** - Props passed directly to inline components
**No Redux/Zustand** - Simple `useState` for all state

## Deployment

**Netlify Configuration** (netlify.toml):

- Build command: `bun run build:netlify` (runs lint + build)
- Publish directory: `dist/` (output of Vite build)
- SPA redirect: All routes redirect to `/index.html`
- Security headers: Frame, XSS, and Content-Type protections enabled
- Geolocation permission: Restricted to `self` only
- Cache busting: Assets (icons, markers, /assets/\*) cached for 1 year (immutable)

**Build Process**:

1. ESLint validates all `.js` and `.jsx` files
2. Vite builds with code splitting:
   - `vendor` chunk: React + React DOM
   - `maps` chunk: MapLibre GL (lazy-loaded)
   - `supabase` chunk: Supabase client (lazy-loaded)
   - `animations` chunk: Framer Motion (lazy-loaded)
3. CSS is split for better caching (cssCodeSplit: true)
4. Console logs and debugger statements are stripped in production
5. Bundle is minified and optimized for ES2020+

## Environment Variables

```bash
# Required
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
VITE_OPENROUTE_API_KEY=...  # For OpenRoute Services (not currently used in fallback chain)
```

**Note**: These variables are Vite-specific (prefixed with `VITE_`) and are inlined during build time, not available at runtime.

## Code Conventions

**Style & Structure**:

- **Modern React** - Hooks only, no classes
- **ESLint** enforced on all commits (`bun run lint`)
- **JSX**: All components use `.jsx` extension
- **100% MapLibre native** - No wrappers (no react-map-gl)
- **No Turf.js** - Use MapLibre spatial APIs where possible
- **GeoJSON coordinates**: `[longitude, latitude]` (GeoJSON standard)
- **User location objects**: `{latitude, longitude}` (GPS standard)

**Variable & Function Naming**:

- Descriptive, English names only (application UI uses English + Tagalog)
- React state/props: camelCase
- Constants: UPPER_SNAKE_CASE
- Components: PascalCase
- Hook functions: camelCase (e.g., `useMapSetup`)

**Comments**:

- Only add comments for non-obvious logic (complex algorithms, workarounds for browser quirks)
- No commented-out code (use git history instead)
- No TODOs without context (if added, should explain why)

## Development Workflow

**Before starting work**:

1. Run `bun run lint` to validate existing code
2. Understand the current state machine in `App.jsx` (navState)
3. Check if modifications affect multiple hooks (may require coordination)

**When making changes**:

1. Prefer modifying existing symbols over creating new files
2. Keep inline logic if only used once (App.jsx inline overlays are intentional)
3. If adding a hook: ensure it's reusable across components
4. If modifying routing: test deviation detection still works (25m threshold)
5. If modifying arrival detection: test 20m threshold works on actual device

**After changes**:

1. Run `bun run lint:fix` to auto-correct style issues
2. Test on mobile device (iOS Safari + Android Chrome) for GPS/orientation permissions
3. Verify map loads without errors in console
4. If changing MapLibre setup: test with both OSM and satellite styles

## Development Philosophy

**KISS (Keep It Simple, Stupid)**: Radical simplification applied ruthlessly.

- ✅ **Inline logic** if only used once
- ✅ **Direct MapLibre calls** instead of wrapper abstractions
- ✅ **Conditional rendering** instead of React Router
- ✅ **Simple useState** instead of Context/Redux
- ✅ **Inline components** instead of separate files (if small)
- ❌ **No utils/helpers** for one-time operations
- ❌ **No unnecessary abstractions** or premature optimization

**Prefer**:

- Fewer files > more files with "clean architecture"
- Direct solutions > reusable abstractions
- Native APIs > wrapper libraries

## Browser Compatibility

**Target browsers: Google Chrome (Android) and Safari (iOS)**

Critical compatibility patterns implemented:

### Device Orientation

```js
// iOS 13+ requires permission
if (typeof DeviceOrientationEvent.requestPermission === "function") {
  const permission = await DeviceOrientationEvent.requestPermission();
}

// Android Chrome
window.addEventListener("deviceorientationabsolute", (e) => {
  setHeading(e.alpha);
});

// iOS Safari
window.addEventListener("deviceorientation", (e) => {
  if (e.webkitCompassHeading) {
    setHeading(e.webkitCompassHeading);
  }
});
```

### CSS Viewport

- Primary: `100dvh` (dynamic viewport height)
- Fallbacks: `100svh`, `-webkit-fill-available`

### Input Zoom Prevention (iOS Safari)

- `font-size: 16px` on all inputs

## Village Data

- **Default center**: `[120.95134859887523, 14.347872973134175]`
- **Village exit**: `[120.951863, 14.35098]`
- **Block polygons**: `src/data/blocks.js`

## Key Dependencies

**Runtime**:

- ✅ `maplibre-gl` (5.15.0) - Core mapping library with native spatial APIs
- ✅ `react` (19.2.3) + `react-dom` (19.2.3) - UI framework
- ✅ `@supabase/supabase-js` (2.88.0) - Backend client (optional, not currently used)
- ✅ `framer-motion` (12.23.26) - Smooth animations for overlays
- ✅ `pmtiles` (4.4.0) + `protomaps-themes-base` (4.5.0) - Optional tile support for offline maps

**Build & Lint**:

- ✅ `vite` (7.3.0) - Build tool
- ✅ `eslint` + `@eslint/js` - Code linting
- ✅ `eslint-plugin-react-hooks` - React Hooks validation
- ✅ `babel-plugin-react-compiler` - React 19 compiler optimization
- ✅ `@vitejs/plugin-react` - React JSX support for Vite

**Architectural Decisions**:

- 🚫 **No** `react-map-gl` → Use native MapLibre GL JS instead
- 🚫 **No** `@turf/turf` → Use MapLibre spatial APIs (more performant)
- 🚫 **No** `react-router-dom` → Use conditional rendering in App.jsx
- 🚫 **No** `Context` / `Redux` / `Zustand` → Use simple useState

## Performance Metrics

- **Total files**: 7 (6 core + 1 optional Supabase client)
- **Lines of code**: ~1,250 (core architecture)
- **Custom hooks**: 3
- **Bundle size**: ~121 KB gzipped (index), ~264 KB gzipped (maps)
- **Dependencies removed**: ~150 KB gzipped savings

## Utility Libraries

**`src/lib/geo.js`**:

- `getDistance(lat1, lon1, lat2, lon2)` - Haversine formula for distance calculation
- `projectPointOnLine(pointLng, pointLat, lineCoordinates)` - Project point onto line segment
- `getDistanceAlongRoute(coordinates, targetLng, targetLat)` - Distance along polyline to a point

**`src/lib/supabase.js`**:

- `getSupabaseClient()` - Lazy-loaded Supabase client (initialized on first call)
- Optional for future data sync (blocks updates, POI changes, analytics)
- Currently not actively used in core navigation flow

## Common Tasks

### Add a new destination (block or POI)

1. Update `src/data/blocks.js` with new feature in GeoJSON format
2. Add to appropriate feature collection (blocks, schools, churches, etc.)
3. Markers auto-render in `useMapSetup.js` via `addBlocksLayer()`
4. Navigation will automatically detect if destination exists

### Modify navigation state machine

1. Edit `navState` in `App.jsx` (currently: gps-permission → welcome → orientation-permission → navigating → arrived → exit-complete)
2. Add new state if needed
3. Add conditional rendering for new overlay
4. Update state transition logic in event handlers

### Adjust geolocation thresholds

1. **Deviation threshold** (route recalculation): `src/hooks/useRouting.js` line with `if (distanceFromRoute > 25)`
2. **Arrival threshold**: `src/hooks/useNavigation.js` line with `if (distance < 20)`
3. **Recalculation debounce**: `src/hooks/useRouting.js` constant `DEBOUNCE_MS`

### Change map appearance

1. **Styles**: Modify `getMapStyle()` function in `useMapSetup.js`
2. **Layer colors/sizes**: Edit paint properties in `addBlocksLayer()` or layer definitions
3. **Feature state**: Use `map.setFeatureState()` in App.jsx overlays for dynamic styling
4. **Camera behavior**: Modify `map.flyTo()` options for zoom/bearing/pitch animations

### Debug offline/connectivity issues

1. Check DevTools Network tab for failed requests to OSRM/OpenRoute APIs
2. Verify `navigator.onLine` status in console
3. Check Service Worker status in Application tab
4. Netlify caching headers may cause stale responses (clear browser cache)

## Important Notes

**About README.md vs CLAUDE.md**:

The README.md contains marketing-style descriptions and mentions directories/features that don't exist in the current codebase (e.g., `components/`, `utils/`, `tests/`). This CLAUDE.md reflects the actual implementation:

- **Actual**: 7 files, 1 hook per feature, inline overlays
- **README claims**: Modular structure, test suites, utility functions

Use this CLAUDE.md as the source of truth for architecture and implementation details.

## Debugging Tips

- **GPS not working**: Check iOS/Android browser permissions in Settings
- **Route not appearing**: Check Network tab for OSRM/OpenRoute API calls and responses
- **Map not loading**: Check console for MapLibre style URL errors or CORS issues
- **Deviation detection not triggering**: Add console.log in `useRouting.js` to verify distance calculation
- **iOS orientation issues**: Verify `DeviceOrientationEvent.requestPermission()` was called (iOS 13+ requirement)
- **Map jank/stutter**: Profile with Chrome DevTools; check for excessive `map.flyTo()` calls
- **Offline mode**: Verify Netlify cache headers in Network tab; Service Worker should cache key assets
- **Performance on low-end device**: Check bundle size split (maps chunk should lazy-load); disable console logs in build

## Testing & Validation

**Current State**: No automated tests exist. Testing is manual/device-based.

**Manual Testing Checklist** (use on real device):

- [ ] GPS permission flow (iOS + Android)
- [ ] Destination selection (blocks/POIs render correctly)
- [ ] Device orientation permission + compass heading updates
- [ ] Route calculation with OSRM API
- [ ] Route fallback to direct line (simulate OSRM failure by blocking API)
- [ ] Deviation detection triggers recalculation (walk >25m away from route)
- [ ] Arrival detection at <20m threshold
- [ ] Map style toggle (OSM ↔ Satellite works smoothly)
- [ ] Village exit flow completes
- [ ] GPS tracking follows user movement
- [ ] Performance: Map responds smoothly with no jank
- [ ] Network: App works offline (cached assets load)

**Browser Console Debugging**:

- GPS position updates: Check `useMapSetup` console logs for coordinates
- Route calculation: Check OSRM fetch calls in Network tab
- Deviation detection: Manually call deviation check logic to verify math
- Map events: MapLibre fires events for move, click, style load

**ESLint Validation**:

Always run `bun run lint` before committing. The CI/CD will run `bun run build:netlify` which includes linting.
