# Proposal: Simplify Architecture

**Change ID**: `simplify-architecture`  
**Status**: Draft  
**Author**: AI Assistant  
**Date**: 2025-12-05

## Problem Statement

The current MyGGV GPS codebase has grown overly complex with 44+ files, ~6200 lines of code, 10+ hooks, and mixed dependencies (react-map-gl wrapper + Turf.js + MapLibre native). This complexity:

1. **Increases maintenance burden** - Too many abstractions and indirections
2. **Reduces performance** - Wrapper libraries add overhead vs. native MapLibre APIs
3. **Complicates debugging** - Multiple state machines and contexts
4. **Violates KISS principle** - Over-engineered for a simple navigation app

**Current metrics:**

- 44 JSX/JS files across 8 directories
- ~6248 total lines of code
- 10 custom hooks (useNavigationState, useRouteManager, useMapTransitions, useMapConfig, useAdaptivePitch, useDeviceOrientation, useBlockPolygons, useLocations, useSymbolLayerInteractions, useNavigation)
- Dependencies: react-map-gl (wrapper), @turf/turf (geographic calculations)
- NavigationContext + React Router with 5 separate page components
- Complex state machine with multiple transition paths

## Proposed Solution

**Radical simplification: Cut complexity by 60-70% while preserving all core functionality.**

### Target Metrics

| Metric            | Current             | Target          | Reduction             |
| ----------------- | ------------------- | --------------- | --------------------- |
| Files             | 44                  | < 10            | 77%                   |
| Lines of code     | 6248                | < 1500          | 76%                   |
| Custom hooks      | 10                  | 3               | 70%                   |
| Dependencies      | react-map-gl + turf | MapLibre only   | 100% wrapper removal  |
| Navigation states | Complex router      | 5 simple states | Simpler state machine |

### Core Philosophy

**100% MapLibre Native** - Remove ALL wrapper libraries and abstractions:

- ❌ Remove `react-map-gl` wrapper → ✅ Direct MapLibre GL JS
- ❌ Remove `@turf/turf` library → ✅ MapLibre native spatial APIs
- ❌ Remove NavigationContext → ✅ Simple useState in main component
- ❌ Remove React Router pages → ✅ Conditional rendering by state

**KISS Principle Applied Ruthlessly:**

- Inline logic instead of creating reusable utilities (if used once)
- Direct MapLibre API calls instead of abstraction hooks
- Single App.jsx component instead of page-per-route architecture
- Minimal file structure: 1 main component, 3 hooks, 2 data files

### Simplified Architecture

**New File Structure (< 10 files):**

```
src/
├── main.jsx                    # Entry point (unchanged)
├── App.jsx                     # Main component with state machine
├── hooks/
│   ├── useMapSetup.js         # Map initialization + GeolocateControl
│   ├── useRouting.js          # Route calculation + recalculation
│   └── useNavigation.js       # Turn-by-turn logic + arrival detection
├── data/
│   ├── blocks.js              # Village block polygons (unchanged)
│   └── pois.js                # Points of interest (unchanged)
└── styles/
    └── app.css                # Tailwind + custom styles
```

**3 Essential Hooks:**

1. **useMapSetup(containerRef)** - Map initialization
   - Creates MapLibre map instance
   - Adds GeolocateControl (native GPS tracking)
   - Loads block polygons + POI markers
   - Returns: `{ map, userLocation, isMapReady }`

2. **useRouting(map, origin, destination)** - Route management
   - Calculates routes with cascading fallback (OSRM → MapLibre Directions → OpenRouteService)
   - Detects deviation (25m threshold) → recalculates
   - Updates route sources (main/traveled/remaining) using MapLibre addSource/setData
   - Returns: `{ routeGeoJSON, distance, duration, isCalculating }`

3. **useNavigation(map, userLocation, routeGeoJSON)** - Navigation logic
   - Calculates bearing, distance to next turn (using MapLibre project() API)
   - Detects arrival (< 20m from destination)
   - Controls map camera (flyTo/easeTo for smooth transitions)
   - Returns: `{ bearing, nextTurn, distanceRemaining, hasArrived }`

**5-State State Machine (in App.jsx):**

```
'gps-permission' → 'welcome' → 'orientation-permission' → 'navigating' → 'arrived'
```

Implemented with simple `useState('gps-permission')` and conditional rendering:

```jsx
{
  navState === "gps-permission" && <GPSPermissionScreen />;
}
{
  navState === "welcome" && <WelcomeScreen />;
}
{
  navState === "navigating" && <NavigationScreen />;
}
{
  navState === "arrived" && <ArrivedScreen />;
}
```

### Preserved Functionality

✅ **All existing features retained:**

- GPS navigation with turn-by-turn guidance
- Block/lot/POI destination selection
- Device orientation (compass heading)
- Satellite/OSM map toggle
- Route recalculation on deviation
- Arrival detection
- Village exit flow
- PWA installability (iOS/Android)

✅ **Browser compatibility maintained:**

- Chrome Android + Safari iOS support
- Device orientation: `deviceorientationabsolute` + `webkitCompassHeading`
- iOS permission: `DeviceOrientationEvent.requestPermission()`
- CSS viewport: `100dvh` with fallbacks

### Technical Implementation Details

**MapLibre Native APIs (replacing Turf.js):**

- `map.project(lngLat)` - Convert coordinates to pixels (replaces turf.distance)
- `map.unproject(point)` - Convert pixels to coordinates
- `map.queryRenderedFeatures(point)` - Spatial queries (replaces turf.booleanPointInPolygon)
- `map.getSource(id).setData(geojson)` - Update route geometry
- `map.setFeatureState()` - Dynamic styling without re-rendering

**Direct MapLibre GL JS (removing react-map-gl):**

```js
// Before (react-map-gl wrapper)
<Map
  ref={mapRef}
  mapLib={maplibregl}
  onMove={handleMove}
  style={...}
/>

// After (native MapLibre)
const map = new maplibregl.Map({
  container: containerRef.current,
  style: mapStyle,
  center: [120.9513, 14.3479],
  zoom: 15
});
```

**State Management Simplification:**

```js
// Before: NavigationContext + React Router + multiple useState in pages
<NavigationProvider>
  <RouterProvider router={router} />
</NavigationProvider>;

// After: Single useState in App.jsx
const [navState, setNavState] = useState("gps-permission");
const [destination, setDestination] = useState(null);
const [userLocation, setUserLocation] = useState(null);
```

## Scope & Boundaries

### In Scope

- Complete rewrite of component architecture (App.jsx as single main component)
- Remove react-map-gl dependency → migrate to native MapLibre
- Remove @turf/turf dependency → use MapLibre native spatial APIs
- Consolidate 10 hooks into 3 essential hooks
- Replace React Router with conditional rendering based on state
- Simplify file structure from 44 files to < 10 files
- Reduce total LOC from 6248 to < 1500 lines

### Out of Scope

- ❌ Backend/Supabase integration changes (keep as-is)
- ❌ Data files (blocks.js, pois.js remain unchanged)
- ❌ Routing API fallback logic (OSRM → MapLibre → OpenRouteService preserved)
- ❌ Browser compatibility code (iOS/Android support remains unchanged)
- ❌ PWA manifest and service worker (keep existing setup)
- ❌ Build configuration (Vite, Netlify configs unchanged)
- ❌ UI/UX changes (visual design remains identical)

### Dependencies Updated

**Removed:**

- `react-map-gl` (8.0.4) - Wrapper no longer needed
- `@turf/turf` (7.2.0) - Replaced by MapLibre native APIs
- `react-router-dom` (7.10.1) - Replaced by conditional rendering
- `@tanstack/react-query` (5.86.0) - Not used for core navigation (can remove if only used for non-essential features)

**Kept:**

- `maplibre-gl` (5.6.0) - Primary mapping library
- `react` (19.1.0) + `react-dom` (19.1.0)
- `@supabase/supabase-js` (2.50.0) - Backend client
- `@radix-ui/*` - UI components (Dialog, Select)
- `tailwindcss` via daisyui - Styling
- All devDependencies unchanged

## Impact Assessment

### Benefits

1. **76% code reduction** - Easier to understand and maintain
2. **Performance improvement** - No wrapper overhead, direct MapLibre calls
3. **Simpler debugging** - Fewer abstractions and indirections
4. **Faster onboarding** - New developers can grasp architecture in < 1 hour
5. **Reduced bundle size** - Removing react-map-gl + turf saves ~150KB gzipped

### Risks

1. **Major refactor risk** - Complete rewrite means potential for bugs
   - _Mitigation_: Test all navigation flows on iOS + Android before deployment
2. **Breaking changes** - No backward compatibility with current component structure
   - _Mitigation_: This is a greenfield rewrite, acceptable for project goals
3. **Learning curve** - Team must learn native MapLibre APIs
   - _Mitigation_: MapLibre docs excellent, simpler than react-map-gl abstractions

### Migration Strategy

**Big Bang Approach (Recommended):**

- Create new branch `refactor/simplify-architecture`
- Complete rewrite in parallel to main branch
- Thorough testing on iOS + Android
- Single merge when feature-complete
- No incremental migration needed (small codebase allows this)

## Success Criteria

**Quantitative Metrics:**

- [ ] Total files < 10 (currently 44)
- [ ] Total LOC < 1500 (currently 6248)
- [ ] Custom hooks = 3 (currently 10)
- [ ] Zero usage of react-map-gl (remove dependency)
- [ ] Zero usage of @turf/turf (remove dependency)
- [ ] Bundle size reduction > 100KB gzipped

**Qualitative Metrics:**

- [ ] All existing navigation features work identically
- [ ] iOS Safari + Android Chrome compatibility verified
- [ ] Lighthouse performance score ≥ 90
- [ ] Code review: "much simpler to understand" consensus

**Functional Tests (All Must Pass):**

- [ ] GPS permission flow works on iOS + Android
- [ ] Destination selection (block/lot/POI) works
- [ ] Device orientation permission + compass heading works
- [ ] Turn-by-turn navigation provides correct instructions
- [ ] Route recalculation triggers on 25m deviation
- [ ] Arrival detection works within 20m
- [ ] Satellite/OSM toggle works
- [ ] Village exit flow completes successfully
- [ ] PWA install prompt appears on mobile

## Related Work

**Existing Specs:**

- `navigation-routing` - Will require MODIFIED requirements to reflect native MapLibre APIs
- `ui-styling` - Mostly unchanged, but simplification means fewer component-specific styles

**New Specs Required:**

- `maplibre-integration` - Native MapLibre usage patterns (NEW)
- `state-management` - Simplified state machine in App.jsx (NEW)
- `hooks-architecture` - 3-hook design (NEW)

## Decisions Made

1. **React Query**: ✅ REMOVE - Supabase SDK is sufficient
   - Remove `@tanstack/react-query` from dependencies
   - Use direct Supabase client calls where needed

2. **Framer Motion**: ✅ KEEP - Keep for smooth animations
   - Preserve existing animations
   - Don't replace with CSS (acceptable overhead)

3. **Radix UI components**: ✅ KEEP - Good accessibility, minimal overhead
   - Keep Dialog + Select components
   - Maintain accessible UI patterns

4. **Exit village flow**: ✅ KEEP and SIMPLIFY if needed
   - Important feature to preserve
   - Keep as 6th state: `exit-complete` (after `arrived`)
   - Simplify implementation but maintain functionality

5. **Route visualization**: ✅ SINGLE BLUE LINE (remaining route only)
   - Show only `route-remaining` (from user to destination)
   - NO `route-traveled` behind user
   - Simpler visual, easier implementation

6. **Supabase**: ✅ KEEP as-is - Already configured correctly
   - Use existing Supabase setup
   - No changes to backend integration

## Next Steps

1. **Create detailed design document** (`design.md`) - Architecture diagrams, API contracts
2. **Draft spec deltas** for modified capabilities:
   - `maplibre-integration` - Native API usage patterns
   - `state-management` - 5-state machine specification
   - `hooks-architecture` - 3-hook contracts
3. **Create implementation task list** (`tasks.md`) - Ordered, verifiable work items
4. **Get stakeholder approval** - Review with team before starting implementation
5. **Create feature branch** - `refactor/simplify-architecture`
6. **Implement + test** - Follow task list, test each component
7. **Deploy to staging** - Full iOS + Android testing
8. **Merge to main** - Single big-bang merge after verification

## References

- **MapLibre GL JS Docs**: https://maplibre.org/maplibre-gl-js/docs/
- **Current project.md**: `/openspec/project.md`
- **Existing specs**: `navigation-routing`, `ui-styling`
- **CLAUDE.md philosophy**: KISS principle, avoid over-engineering
