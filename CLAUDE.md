<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyGGV GPS is a React-based web application for GPS navigation within Garden Grove Village, Philippines. It uses **100% native MapLibre GL JS** (no wrappers) with a radically simplified architecture.

**Architecture Philosophy**: Extreme simplification following KISS principle

- 8 total files (~1,250 LOC core)
- 3 essential hooks
- Direct MapLibre GL JS (no react-map-gl)
- No routing library (conditional rendering)
- No external state management (simple useState)

## Commands

```bash
npm run dev          # Start development server (port 5173)
npm run build        # Production build with Terser minification
npm run build:netlify # Build with lint + Netlify checks
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run preview      # Preview production build
```

## Architecture

### File Structure (8 files total)

```
src/
├── App.jsx (513 LOC)              # Main component with 6 inline overlays
├── main.jsx (23 LOC)              # Entry point (Theme + App only)
├── hooks/
│   ├── useMapSetup.js (213 LOC)   # Map init + GPS + GeolocateControl
│   ├── useRouting.js (300 LOC)    # OSRM routing + deviation detection
│   └── useNavigation.js (237 LOC) # Turn-by-turn + arrival detection
├── data/
│   ├── blocks.js                   # Village block polygons
│   └── public-pois.js              # Points of interest
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

## Environment Variables

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_OPENROUTE_API_KEY=...  # Optional (not used in current fallback chain)
```

## Code Conventions

- **Modern React** (hooks only, no classes)
- **ESLint** with React Hooks plugin enforced
- **100% MapLibre native** - No wrappers (no react-map-gl)
- **No Turf.js** - Use MapLibre spatial APIs where possible
- **GeoJSON coordinates**: `[longitude, latitude]` (GeoJSON standard)
- **User location objects**: `{latitude, longitude}` (GPS standard)

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
- **POIs**: `src/data/public-pois.js`

## Key Dependencies

**Removed** (replaced by native APIs):

- ❌ `react-map-gl` → Direct MapLibre GL JS
- ❌ `@turf/turf` → MapLibre native spatial APIs
- ❌ `react-router-dom` → Conditional rendering
- ❌ `@tanstack/react-query` → Direct Supabase calls

**Kept** (essential):

- ✅ `maplibre-gl` (5.6.0) - Core mapping library
- ✅ `react` (19.1.0) + `react-dom` (19.1.0)
- ✅ `@supabase/supabase-js` (2.50.0) - Backend client (optional)
- ✅ `@radix-ui/*` - UI components (Dialog, Select)
- ✅ `framer-motion` - Smooth animations
- ✅ `tailwindcss` via `daisyui` - Styling

## Performance Metrics

- **Total files**: 8 (7 core + 1 optional Supabase client)
- **Lines of code**: ~1,250 (core architecture)
- **Custom hooks**: 3
- **Bundle size**: ~121 KB gzipped (index), ~264 KB gzipped (maps)
- **Dependencies removed**: ~150 KB gzipped savings

## Common Tasks

### Add a new destination type

1. Update `src/data/blocks.js` or `src/data/public-pois.js`
2. Map markers will auto-render in `useMapSetup.js`

### Modify navigation flow

1. Edit state machine in `App.jsx` (`navState` transitions)
2. Update conditional rendering for new states

### Change map style

1. Use `setMapStyle('osm')` or `setMapStyle('satellite')` from `useMapSetup`
2. Styles defined in `getMapStyle()` function

### Adjust deviation threshold

1. Edit `src/hooks/useRouting.js`
2. Change `if (distanceFromRoute > 25)` to desired threshold

### Modify arrival detection

1. Edit `src/hooks/useNavigation.js`
2. Change `if (distance < 20)` to desired threshold

## Debugging Tips

- **GPS not working**: Check browser permissions in DevTools
- **Route not appearing**: Check Network tab for OSRM API calls
- **Map not loading**: Check MapLibre style URL in console
- **Deviation detection not triggering**: Check console logs for distance values
- **iOS orientation issues**: Verify `DeviceOrientationEvent.requestPermission()` was called

## Testing Checklist

- [ ] GPS permission flow (iOS + Android)
- [ ] Destination selection (blocks/POIs)
- [ ] Device orientation permission + compass
- [ ] Route calculation with OSRM
- [ ] Route fallback to direct line (simulate OSRM failure)
- [ ] Deviation detection triggers recalculation (move >25m from route)
- [ ] Arrival detection (<20m threshold)
- [ ] Map style toggle (OSM ↔ Satellite)
- [ ] Village exit flow
- [ ] PWA install prompt
