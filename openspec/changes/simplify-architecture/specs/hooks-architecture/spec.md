# Spec: 3-Hook Architecture

**Capability**: `hooks-architecture`  
**Status**: Draft  
**Change**: `simplify-architecture`

## Overview

This spec defines the simplified hook architecture, consolidating 10 existing hooks into 3 essential hooks that encapsulate map setup, routing, and navigation logic with clear responsibilities and minimal interdependencies.

## ADDED Requirements

### Requirement: Three Essential Hooks Only
**ID**: `HA-001`  
**Priority**: Critical

The application MUST implement exactly 3 custom hooks for core functionality, eliminating all other hooks.

#### Scenario: Hook file structure
**Given** the simplified architecture  
**When** organizing hook files  
**Then** exactly these 3 hook files MUST exist in `src/hooks/`:
1. `useMapSetup.js` - Map initialization and GPS tracking
2. `useRouting.js` - Route calculation and recalculation
3. `useNavigation.js` - Turn-by-turn logic and arrival detection

**And** ALL other hook files MUST be deleted:
- ❌ `useNavigationState.js` (replaced by useState in App.jsx)
- ❌ `useMapConfig.js` (merged into useMapSetup)
- ❌ `useMapTransitions.js` (merged into useNavigation)
- ❌ `useRouteManager.js` (replaced by useRouting)
- ❌ `useAdaptivePitch.js` (inline in useNavigation if needed)
- ❌ `useDeviceOrientation.js` (inline in App.jsx)
- ❌ `useBlockPolygons.js` (inline in useMapSetup)
- ❌ `useLocations.js` (Supabase queries inline in WelcomeOverlay)
- ❌ `useSymbolLayerInteractions.js` (inline in useMapSetup if needed)

### Requirement: useMapSetup Hook Contract
**ID**: `HA-002`  
**Priority**: Critical

The `useMapSetup` hook MUST initialize the MapLibre map instance and handle GPS tracking with a clear, minimal API.

#### Scenario: Hook signature and return values
**Given** App.jsx needs to initialize a map  
**When** calling useMapSetup  
**Then** the hook MUST have this signature:
```js
function useMapSetup(containerRef, options = {})
```

**And** MUST return an object with exactly these properties:
```js
{
  map: maplibregl.Map | null,        // MapLibre instance
  userLocation: {                     // User GPS location
    latitude: number,
    longitude: number,
    accuracy: number,
    heading: number | null
  } | null,
  isMapReady: boolean,                // Map loaded and ready
  setMapStyle: (style: 'osm' | 'satellite') => void  // Style switcher
}
```

**And** NO additional return values SHOULD be added

#### Scenario: Map initialization with options
**Given** a map container ref and optional configuration  
**When** useMapSetup is called  
**Then** the hook MUST create a MapLibre map with:
- `container: containerRef.current`
- `center: options.center || [120.95134859887523, 14.347872973134175]`
- `zoom: options.zoom || 15`
- `pitch: options.pitch || 0`
- `bearing: options.bearing || 0`
- `style: getMapStyle('osm')` (default to OSM)

**And** the map MUST be stored in state and returned

#### Scenario: GeolocateControl integration
**Given** the map has loaded (`load` event fired)  
**When** setting up GPS tracking  
**Then** a GeolocateControl MUST be created with:
```js
new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showUserHeading: true
})
```

**And** MUST be added to map with `map.addControl(geolocate)`

**And** MUST listen to `geolocate` events to update `userLocation` state

#### Scenario: Block polygons loaded on map ready
**Given** the map has loaded  
**When** initializing map layers  
**Then** block polygons MUST be added as:
```js
map.addSource('blocks', { type: 'geojson', data: blocksGeoJSON });
map.addLayer({
  id: 'blocks-fill',
  type: 'fill',
  source: 'blocks',
  paint: { 'fill-color': '#627BC1', 'fill-opacity': 0.2 }
});
map.addLayer({
  id: 'blocks-outline',
  type: 'line',
  source: 'blocks',
  paint: { 'line-color': '#627BC1', 'line-width': 2 }
});
```

**And** blocks data MUST be imported from `src/data/blocks.js`

#### Scenario: Map cleanup on unmount
**Given** the component using useMapSetup unmounts  
**When** cleanup occurs  
**Then** `map.remove()` MUST be called in useEffect cleanup function

**And** all event listeners MUST be detached

### Requirement: useRouting Hook Contract
**ID**: `HA-003`  
**Priority**: Critical

The `useRouting` hook MUST handle route calculation with cascading fallbacks and recalculation on deviation.

#### Scenario: Hook signature and return values
**Given** App.jsx needs to calculate a route  
**When** calling useRouting  
**Then** the hook MUST have this signature:
```js
function useRouting(map, origin, destination)
```

**Parameters**:
- `map`: MapLibre map instance (from useMapSetup)
- `origin`: `{ latitude, longitude }` (user location)
- `destination`: `{ coordinates: [lng, lat], type, name }` (selected destination)

**And** MUST return an object with exactly these properties:
```js
{
  routeGeoJSON: GeoJSON.LineString | null,  // Route geometry
  distance: number,                          // Meters to destination
  duration: number,                          // Estimated seconds
  isCalculating: boolean,                    // Loading state
  error: Error | null                        // Calculation errors
}
```

#### Scenario: Cascading route calculation fallbacks
**Given** origin and destination coordinates are provided  
**When** calculating a route  
**Then** the hook MUST attempt route services in this order:
1. **OSRM** (http://router.project-osrm.org) - Free, fast
2. **MapLibre Directions** (@maplibre/maplibre-gl-directions) - Fallback
3. **OpenRouteService** (if `VITE_OPENROUTE_API_KEY` provided) - Fallback
4. **Direct line** (straight line GeoJSON) - Last resort

**And** each service MUST timeout after 5 seconds before trying next

**And** if all services fail, direct line MUST always succeed

#### Scenario: Add route to map on calculation success
**Given** a route is successfully calculated  
**When** route GeoJSON is available  
**Then** the hook MUST:
1. Check if `route-main` source exists with `map.getSource('route-main')`
2. If exists: update with `map.getSource('route-main').setData(routeGeoJSON)`
3. If NOT exists: create source and layer:
```js
map.addSource('route-main', { type: 'geojson', data: routeGeoJSON });
map.addLayer({
  id: 'route-main-line',
  type: 'line',
  source: 'route-main',
  paint: { 'line-color': '#4285F4', 'line-width': 5, 'line-cap': 'round' }
});
```

**And** the route layer MUST render above block polygons but below markers

#### Scenario: Deviation detection triggers recalculation
**Given** an active route exists  
**And** user location is updating  
**When** checking for deviation every 5 seconds  
**Then** the hook MUST:
1. Calculate distance from user to closest point on route
2. If distance > 25 meters: trigger recalculation
3. Clear old route: `setRouteGeoJSON(null)`
4. Restart calculation with new origin (current user location)

**And** deviation check MUST use `setInterval` with 5000ms delay

**And** interval MUST be cleared on unmount

### Requirement: useNavigation Hook Contract
**ID**: `HA-004`  
**Priority**: Critical

The `useNavigation` hook MUST provide turn-by-turn navigation logic and arrival detection.

#### Scenario: Hook signature and return values
**Given** App.jsx is in `navigating` state  
**When** calling useNavigation  
**Then** the hook MUST have this signature:
```js
function useNavigation(map, userLocation, routeGeoJSON, destination)
```

**Parameters**:
- `map`: MapLibre map instance
- `userLocation`: `{ latitude, longitude, heading }` (from useMapSetup)
- `routeGeoJSON`: Route geometry (from useRouting)
- `destination`: Destination object with coordinates

**And** MUST return an object with exactly these properties:
```js
{
  bearing: number,                          // Degrees (0-360) to destination
  nextTurn: {                               // Next turn instruction
    instruction: string,                    // e.g., "Turn left on Main St"
    distance: number                        // Meters to turn
  } | null,
  distanceRemaining: number,                // Meters to destination
  hasArrived: boolean                       // Arrival flag (< 20m)
}
```

#### Scenario: Calculate bearing to destination
**Given** user location and destination coordinates  
**When** updating navigation data  
**Then** bearing MUST be calculated using haversine formula:
```js
const [lon1, lat1] = [userLocation.longitude, userLocation.latitude];
const [lon2, lat2] = destination.coordinates;
const dLon = (lon2 - lon1) * Math.PI / 180;
const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
          Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
```

**And** bearing MUST be returned as a number between 0-360 degrees

#### Scenario: Calculate distance remaining using map.project()
**Given** user location and destination coordinates  
**When** calculating distance to destination  
**Then** the hook MUST:
1. Convert to pixels: `const userPx = map.project([userLng, userLat])`
2. Convert destination: `const destPx = map.project(destination.coordinates)`
3. Calculate pixel distance: `Math.hypot(destPx.x - userPx.x, destPx.y - userPx.y)`
4. Convert to meters: `pixelDistance * getMetersPerPixel(map, userLat)`

**Where** `getMetersPerPixel` is:
```js
function getMetersPerPixel(map, latitude) {
  const zoom = map.getZoom();
  return 156543.03392 * Math.cos(latitude * Math.PI / 180) / Math.pow(2, zoom);
}
```

**And** distance MUST be returned in meters (not kilometers)

#### Scenario: Arrival detection within 20 meters
**Given** distance remaining is calculated  
**When** checking arrival condition  
**Then** `hasArrived` MUST be set to `true` if distance < 20 meters

**And** `hasArrived` MUST remain `true` until navigation is reset

**And** when `hasArrived` becomes `true`, App.jsx MUST transition to `arrived` state

#### Scenario: Camera follows user with bearing
**Given** user location updates during navigation  
**When** updating camera position  
**Then** the hook MUST call:
```js
map.flyTo({
  center: [userLocation.longitude, userLocation.latitude],
  bearing: calculatedBearing,
  pitch: 60,
  zoom: 18,
  duration: 1000,
  essential: true
});
```

**And** camera updates MUST occur on every user location change

**And** `essential: true` ensures animation completes even during interruptions

#### Scenario: Find next turn from route geometry
**Given** a route GeoJSON with multiple coordinate points  
**When** determining next turn instruction  
**Then** the hook MUST:
1. Find the closest upcoming point on route (ahead of user)
2. Calculate angle change at that point
3. If angle change > 15 degrees: generate turn instruction
4. Return `{ instruction: "Turn right", distance: metersToTurn }`

**And** if no significant turns ahead: return `null`

**And** turn instructions SHOULD be simple: "Turn left", "Turn right", "Continue straight"

## REMOVED Requirements

### Requirement: useNavigationState Hook
**ID**: `HA-OLD-001` (hypothetical)  
**Reason**: State machine simplified to useState in App.jsx

**Removed functionality**:
- State machine management with useReducer
- Transition validation
- State history tracking

**Replacement**: Direct `useState('gps-permission')` in App.jsx

### Requirement: useMapConfig Hook
**ID**: `HA-OLD-002` (hypothetical)  
**Reason**: Merged into useMapSetup

**Removed functionality**:
- Separate hook for map style configuration
- Style loading logic
- Map initialization options

**Replacement**: Style management in useMapSetup with `setMapStyle` function

### Requirement: useMapTransitions Hook
**ID**: `HA-OLD-003` (hypothetical)  
**Reason**: Merged into useNavigation

**Removed functionality**:
- Separate hook for camera transitions
- Animation timing configuration
- Transition state management

**Replacement**: Camera `flyTo` calls inline in useNavigation

### Requirement: useRouteManager Hook
**ID**: `HA-OLD-004` (hypothetical)  
**Reason**: Replaced by useRouting

**Removed functionality**:
- Complex route state management
- Traveled/remaining route tracking
- Multiple route sources management

**Replacement**: Simpler useRouting hook with single route source (traveled/remaining can be added if needed, but start simple)

### Requirement: useAdaptivePitch Hook
**ID**: `HA-OLD-005` (hypothetical)  
**Reason**: Inline logic in useNavigation

**Removed functionality**:
- Automatic pitch adjustment based on zoom
- Pitch transition smoothing

**Replacement**: Fixed pitch of 60° during navigation (inline in useNavigation flyTo call)

### Requirement: useDeviceOrientation Hook
**ID**: `HA-OLD-006` (hypothetical)  
**Reason**: Inline event listeners in App.jsx

**Removed functionality**:
- Custom hook for device orientation events
- iOS/Android compatibility abstraction
- Heading smoothing logic

**Replacement**: Direct event listeners in App.jsx OrientationPermissionOverlay component:
```js
window.addEventListener('deviceorientationabsolute', handleOrientation);
window.addEventListener('deviceorientation', handleOrientation);
```

### Requirement: useBlockPolygons Hook
**ID**: `HA-OLD-007` (hypothetical)  
**Reason**: Inline in useMapSetup

**Removed functionality**:
- Separate hook for loading block data
- Dynamic block loading
- Block state management

**Replacement**: Direct import from `src/data/blocks.js` and inline addSource/addLayer in useMapSetup

### Requirement: useLocations Hook
**ID**: `HA-OLD-008` (hypothetical)  
**Reason**: Supabase queries inline in WelcomeOverlay

**Removed functionality**:
- Custom hook for Supabase location queries
- React Query integration for caching

**Replacement**: Direct `supabase.from('locations').select()` calls in WelcomeOverlay if needed (or use static data from pois.js)

### Requirement: useSymbolLayerInteractions Hook
**ID**: `HA-OLD-009` (hypothetical)  
**Reason**: Inline click handlers in useMapSetup

**Removed functionality**:
- Custom hook for map symbol click events
- Hover state management

**Replacement**: Direct `map.on('click', layerId, handler)` in useMapSetup if needed

## Implementation Notes

### Hook Dependency Graph
```
App.jsx
├── useMapSetup(containerRef) → { map, userLocation, isMapReady, setMapStyle }
├── useRouting(map, userLocation, destination) → { routeGeoJSON, distance, duration, ... }
└── useNavigation(map, userLocation, routeGeoJSON, destination) → { bearing, nextTurn, distanceRemaining, hasArrived }
```

**Dependency flow**:
1. `useMapSetup` has NO dependencies on other hooks
2. `useRouting` depends on `map` from useMapSetup
3. `useNavigation` depends on `map` from useMapSetup AND `routeGeoJSON` from useRouting

### Hook Size Estimates
- `useMapSetup.js`: ~200-250 LOC (map init + GPS + block polygons)
- `useRouting.js`: ~250-300 LOC (cascading fallbacks + deviation detection)
- `useNavigation.js`: ~200-250 LOC (bearing + distance + arrival + camera)

**Total: ~650-800 LOC for all 3 hooks**

### Code Reduction from Consolidation
**Old hooks total**: ~2000 LOC across 10 files  
**New hooks total**: ~700 LOC across 3 files  
**Reduction**: ~1300 LOC (65% reduction)

### Performance Considerations
- Fewer useEffect cleanup cycles (3 hooks vs 10)
- No hook dependency chains (each hook is independent)
- Minimal state updates (only essential values returned)

## Related Specs

- `maplibre-integration` - Hooks use native MapLibre APIs
- `state-management` - Hooks integrate with App.jsx state
- `navigation-routing` - useRouting implements routing spec

## References

- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)
- [useEffect Cleanup](https://react.dev/reference/react/useEffect#cleanup-function)
- [Custom Hooks Best Practices](https://react.dev/learn/reusing-logic-with-custom-hooks)
