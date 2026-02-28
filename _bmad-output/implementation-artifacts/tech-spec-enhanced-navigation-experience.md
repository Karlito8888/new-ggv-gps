---
title: 'Enhanced Navigation Experience'
slug: 'enhanced-navigation-experience'
created: '2026-02-26'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['maplibre-gl 5.15.0', 'react 19.2.3', 'framer-motion 12.23.26', 'typescript', 'vite']
files_to_modify: ['src/App.tsx', 'src/hooks/useRouting.ts', 'src/hooks/useNavigation.ts', 'src/components/NavigationOverlay.tsx', 'src/hooks/useMapSetup.ts', 'src/lib/geo.ts', 'src/styles/app.css']
code_patterns: ['native MapLibre GL JS (no wrappers)', 'useState state machine (6 states)', 'custom hooks (useMapSetup, useRouting, useNavigation)', 'extracted overlay components', 'React Compiler auto-memoization', 'conditional rendering (no router)', 'CSS design tokens']
test_patterns: ['manual testing on Android Chrome + iOS Safari', 'no automated tests']
---

# Tech-Spec: Enhanced Navigation Experience

**Created:** 2026-02-26

## Overview

### Problem Statement

The current GPS navigation in MyGGV GPS provides basic routing and turn-by-turn instructions, but falls short of the fluid, intuitive experience users expect from modern GPS navigation apps. Key gaps include: jerky compass rotation, no visual feedback on route progress (walked portion stays visible), no off-route detection, plain route line with no depth or directional cues, generic user/destination markers, and a missing dedicated re-center button.

### Solution

Implement 9 targeted improvements to the navigation experience that bring it closer to a real GPS device — while respecting the app's KISS architecture and performance constraints (low-end smartphones, weak cellular data in the Philippines). All changes use native MapLibre GL JS features and browser APIs only, with zero new dependencies.

### Scope

**In Scope:**
- A. Smooth bearing transitions (replace jumpTo with easeTo for compass rotation)
- B. Route trimming (erase walked portion of route in real-time)
- C. Off-route detection with "Recalculating..." feedback + vibration
- D. Route shadow layer (depth effect via double line layer)
- E. Directional chevrons on route line (symbol layer)
- F. Custom user location marker (oriented arrow replacing blue dot)
- G. Custom destination marker (pulsing pin + arrival radius circle)
- H. Total distance to destination display (along-route, not crow-flies)
- I. Fix/add dedicated re-center button during navigation

**Out of Scope:**
- ETA / time estimates (short village trips make this unnecessary)
- Voice guidance / Web Speech API
- Adaptive zoom based on distance
- Multiple upcoming turns list (single next step is sufficient)
- Route gradient coloring
- Route alternatives
- Offline routing
- 3D terrain

## Context for Development

### Codebase Patterns

- 100% native MapLibre GL JS — no react-map-gl, no Turf.js
- Simple useState state machine in App.tsx (6 navigation states)
- Custom hooks: useMapSetup, useRouting, useNavigation
- Extracted overlay components in src/components/
- TypeScript throughout (migrated in Story 2.2)
- CSS design tokens in src/styles/app.css (--ggv-* prefix)
- Framer Motion for overlay animations (spring damping:25, stiffness:300)
- React Compiler handles memoization automatically
- Performance-critical: target low-end Android devices with weak data

### Files to Reference

| File | Purpose | Key Anchor Points |
| ---- | ------- | ----------------- |
| `src/App.tsx` (~370 LOC) | State machine, camera effects, compass heading, user interaction tracking | **Effect L172-272**: compass heading with `jumpTo()` → change to `easeTo()`. **Effect L274-289**: centering with `setCenter()`. **Effect L291-305**: initial nav view. **Refs**: `userInteractionTimeRef`, `recenterTimeoutRef`, `isNavigatingRef`, `heading` state (L40) |
| `src/hooks/useRouting.ts` (~370 LOC) | Route calculation, 3-tier fallback, map route visualization | **`updateMapRoute()` L422-435**: single `"route-line"` layer (blue #4285F4, width 5) → add shadow layer + chevrons + lineMetrics. **Recalc**: 30m threshold (L223), 500ms debounce (L217). **Route geometry**: `RouteGeometry { type: "LineString" \| "MultiLineString" }` |
| `src/hooks/useNavigation.ts` (47 LOC) | Pure computation: distance + arrival check | **`ARRIVAL_THRESHOLD_M = 12`** (L11). `distanceRemaining` uses Haversine crow-flies (L38) → needs along-route distance option. Returns `{ distanceRemaining, hasArrived, arrivedAt }` |
| `src/components/NavigationOverlay.tsx` (165 LOC) | Navigation UI pills, turn instructions, zoom buttons | **Props**: L7-17. **currentStep** computation: L42-71 uses `getDistanceAlongRoute()`. **Distance display**: L118-120 shows next-turn OR remaining. **Bottom strip**: L130-147 shows dest name + compass/distance. **No re-center button** currently. CSS classes: `nav-top-pill`, `nav-bottom-strip`, `nav-map-controls`, `nav-cancel-btn` |
| `src/hooks/useMapSetup.ts` (296 LOC) | Map init, GeolocateControl, blocks layer, destination marker | **GeolocateControl**: L173-176 (`enableHighAccuracy: true`, `trackUserLocation: true`). **Blue dot**: implicit via `trackUserLocation: true`. **Dest marker**: L239-295 as symbol layer with PNG icon. Map center: `[120.951, 14.348]`, zoom: 15, maxBounds set |
| `src/lib/geo.ts` (176 LOC) | Geospatial utilities | **`getDistance()`** L9-17: Haversine. **`projectPointOnLine()`** L29-80: returns `{ projectedPoint, segmentIndex, progressOnSegment, deviationDistance }` — KEY for trimming + off-route. NOT exported currently. **`getDistanceAlongRoute()`** L86-175: distance along polyline, returns -1 if target behind user |
| `src/styles/app.css` | Design tokens + navigation styles | `--ggv-*` CSS custom properties. Navigation pill/strip styles |

### Technical Decisions

**A. Smooth Bearing (App.tsx L252-255)**
- Current: `map.jumpTo({ bearing: heading, pitch: 45 })` — instant, causes jerkiness
- Change to: `map.easeTo({ bearing: heading, pitch: 45, duration: 150 })` — 150ms smooth transition
- MapLibre `easeTo()` cancels previous animation when called again — no queue buildup
- Keep the existing 250ms throttle + 3° delta guard unchanged

**B. Route Trimming (useRouting.ts + geo.ts)**
- Export `projectPointOnLine()` from geo.ts
- On each GPS update, project user onto route → slice coordinates from projected point forward
- Update `"route"` source data with trimmed GeoJSON
- Flatten MultiLineString → flat coordinate array before trimming (pattern from NavigationOverlay L46-48)
- Add `lineMetrics: true` on source for future-proofing

**C. Off-Route Detection (useRouting.ts)**
- `projectPointOnLine()` returns `deviationDistance` — check against 25m threshold
- Force immediate route recalculation (bypass 30m/500ms debounce)
- Add `isRecalculating` state to useRouting return value
- Vibration: `navigator.vibrate(200)` — single pulse, graceful fallback

**D. Route Shadow Layer (useRouting.ts `updateMapRoute()`)**
- Add `"route-outline"` layer BEFORE `"route-line"` on same `"route"` source
- Darker blue (#1a56c4), width 8, same cap/join — minimal GPU cost

**E. Directional Chevrons (useRouting.ts `updateMapRoute()`)**
- Canvas-drawn arrow registered via `map.addImage("route-arrow", canvas)`
- `"route-arrows"` symbol layer: `symbol-placement: "line"`, spacing 100px
- Small white chevron (~12×12px), auto-rotated along line direction

**F. Custom User Marker (useMapSetup.ts + App.tsx)**
- GeolocateControl: add `showUserLocation: false` — GPS tracking continues, blue dot hidden
- New `maplibregl.Marker({ element, rotationAlignment: "map" })` — CSS arrow shape
- Position updated on GPS events, rotation updated on heading changes from App.tsx

**G. Custom Destination Marker (useMapSetup.ts)**
- Replace symbol layer + PNG with HTML Marker using CSS pin + pulse animation
- Add `"arrival-zone"` circle layer (12m radius, semi-transparent blue fill)

**H. Total Distance Display (NavigationOverlay.tsx)**
- Compute along-route distance to destination using `getDistanceAlongRoute()`
- Always show total remaining in bottom strip (replaces compass bearing when heading is null)
- Keep next-turn distance in main pill

**I. Re-center Button (NavigationOverlay.tsx + App.tsx)**
- New button in `nav-map-controls` — crosshair/locate icon
- Visible only when auto-centering is paused (user panned away)
- New props: `isOffCenter: boolean`, `onRecenter: () => void`
- Re-center animates to user position with nav camera (pitch 45, zoom 20, bearing from heading)

## Implementation Plan

### Tasks

Tasks are ordered by dependency — lowest-level changes first, then integrations.

#### Phase 1: Foundation (geo utilities + route visualization)

- [x] **Task 1: Export `projectPointOnLine()` from geo.ts**
  - File: `src/lib/geo.ts`
  - Action: Add `export` keyword to the `projectPointOnLine` function declaration at L29. Also export the `PointProjection` interface at L19.
  - Notes: Currently used only internally by `getDistanceAlongRoute()`. Route trimming and off-route detection both need direct access.

- [x] **Task 2: Add a coordinate flattening utility to geo.ts**
  - File: `src/lib/geo.ts`
  - Action: Add an exported `flattenCoordinates(geometry: RouteGeometry): [number, number][]` function that handles both LineString (returns as-is) and MultiLineString (flattens).
  - Notes: This pattern already exists inline in NavigationOverlay L46-48. Extract it once for reuse in useRouting.ts and NavigationOverlay.tsx.

- [x] **Task 3: Enhance route visualization — shadow layer + chevrons**
  - File: `src/hooks/useRouting.ts`
  - Action: Modify `updateMapRoute()` (L422-435):
    1. Add `lineMetrics: true` to the GeoJSON source options (for future line-gradient support)
    2. Add `"route-outline"` line layer BEFORE `"route-line"`:
       - `line-color: "#1a56c4"`, `line-width: 8`, `line-cap: "round"`, `line-join: "round"`, `line-opacity: 0.5`
    3. Register a canvas-drawn arrow image via `map.addImage("route-arrow", canvas)` (white chevron, ~12×12px, drawn on a small OffscreenCanvas or regular Canvas)
    4. Add `"route-arrows"` symbol layer ABOVE `"route-line"`:
       - `symbol-placement: "line"`, `symbol-spacing: 100`, `icon-image: "route-arrow"`, `icon-size: 0.6`, `icon-allow-overlap: true`
    5. On source update (setData), all three layers auto-update (same source)
  - Notes: Layer order matters — outline → line → arrows. All share source `"route"`. The arrow image only needs to be registered once (guard with `map.hasImage("route-arrow")`). For the canvas arrow: draw a simple triangle pointing right (→) — MapLibre auto-rotates it along the line.

- [x] **Task 4: Smooth bearing transitions**
  - File: `src/App.tsx`
  - Action: In Effect 2 (compass heading, L172-272), change `map.jumpTo()` at ~L252-255 to:
    ```typescript
    map.easeTo({
      bearing: heading,
      pitch: 45,
      duration: 150,
    });
    ```
  - Notes: Keep the existing 250ms throttle (THROTTLE_MS) and 3° minimum delta (MIN_DELTA) unchanged. MapLibre `easeTo()` cancels the previous in-flight animation when called again, so no overlap issues. This single change eliminates the jerky rotation feel.

#### Phase 2: Route intelligence (trimming + off-route)

- [x] **Task 5: Implement route trimming in useRouting**
  - File: `src/hooks/useRouting.ts`
  - Action: Add a new function `trimRouteToUser(routeGeometry, userLocation)` and integrate it:
    1. Import `projectPointOnLine` and `flattenCoordinates` from `geo.ts`
    2. Create function: takes full route geometry + user [lng, lat] → returns trimmed GeoJSON (LineString from user's projected position to destination)
    3. In the main effect, after route is calculated and stored, also compute and store a `trimmedRouteGeoJSON` state
    4. Update `trimmedRouteGeoJSON` on every `userLocation` change (not just on route recalc)
    5. Pass trimmed geometry to `updateMapRoute()` instead of the full route
    6. Keep the full (untrimmed) `routeGeoJSON` in state for distance calculations and step finding
  - Notes: Trimming algorithm: use `projectPointOnLine(userLng, userLat, flatCoords)` → get `segmentIndex` + `progressOnSegment` → build new coords array starting from `projectedPoint` then `coords[segmentIndex+1]` through end. Ensure the trimmed geometry is still a valid GeoJSON LineString. Do NOT trim if projection deviation is > 50m (user might be off-route, don't corrupt the display).

- [x] **Task 6: Implement off-route detection**
  - File: `src/hooks/useRouting.ts`
  - Action:
    1. Add constant `const OFF_ROUTE_THRESHOLD_M = 25;`
    2. In the trimming logic (Task 5), check `deviationDistance` from `projectPointOnLine()` result
    3. If `deviationDistance > OFF_ROUTE_THRESHOLD_M`:
       - Set new state `isRecalculating = true`
       - Trigger immediate route recalculation (call `fetchRoute()` directly, bypassing debounce and 30m threshold)
       - Call `navigator.vibrate?.(200)` (optional chaining for unsupported browsers)
    4. After successful recalculation, set `isRecalculating = false`
    5. Add `isRecalculating` to the hook's return value
  - Notes: The deviation check naturally happens during trimming (same `projectPointOnLine` call). Use a ref to debounce vibrations (max once per 5 seconds to avoid annoyance). When off-route, skip trimming (show full new route until user is back on track).

- [x] **Task 7: Show "Recalculating..." state in NavigationOverlay**
  - File: `src/components/NavigationOverlay.tsx`
  - Action:
    1. Add `isRecalculating: boolean` to the props interface
    2. When `isRecalculating === true`, replace the turn instruction text in the top pill with "Recalculating..." (Tagalog: "Kinakalkula muli...") and a loading-style icon (spinning ↻ or pulsing dot)
    3. While recalculating, hide the distance-to-next-turn display (show "..." or empty)
  - Notes: Use CSS animation for the loading icon — no Framer Motion needed for a simple spin. The recalculating state is transient (typically 1-3 seconds until API responds).

#### Phase 3: Custom markers

- [x] **Task 8: Custom user location marker**
  - Files: `src/hooks/useMapSetup.ts`, `src/App.tsx`, `src/styles/app.css`
  - Action in useMapSetup.ts:
    1. Add `showUserLocation: false` to GeolocateControl options (L173-176) — keeps GPS tracking, hides native blue dot
    2. Create a custom HTML element for the user marker: a CSS-styled arrow/chevron pointing upward, colored `#4285F4`, ~24px
    3. Create a `maplibregl.Marker({ element, rotationAlignment: "map" })` and store in a ref
    4. Add the marker to the map (initially hidden or at [0,0])
    5. Update marker position in the existing `geolocate` event handler (L182-186) — call `marker.setLngLat([lng, lat])`
    6. Export a `setUserMarkerRotation(bearing: number)` function or expose the marker ref
  - Action in App.tsx:
    1. In the compass heading handler (Effect 2, ~L248), after `setHeading(heading)`, also rotate the user marker: call `userMarkerRef.setRotation(heading)` or the exposed function
  - Action in app.css:
    1. Add `.user-location-arrow` styles: CSS triangle/arrow shape via `clip-path` or borders, `#4285F4` fill, `width: 24px`, `height: 24px`, with a subtle white border for visibility
  - Notes: The marker must be rotated separately from the map bearing. When heading is not available (no compass permission), show the marker without rotation (or as a circle instead of arrow). Hide the native GeolocateControl button during navigation via CSS: `.maplibregl-ctrl-geolocate { display: none; }` when in `navigating` state.

- [x] **Task 9: Custom destination marker with pulse + arrival zone**
  - Files: `src/hooks/useMapSetup.ts`, `src/styles/app.css`
  - Action in useMapSetup.ts:
    1. Replace the current `updateDestinationMarker()` function (L239-295) which uses a symbol layer + PNG
    2. Create a custom HTML element: CSS-styled pin with a pulsing ring animation
    3. Use `new maplibregl.Marker({ element, anchor: "bottom" })` instead of the symbol layer approach
    4. Remove the old symbol layer source (`"destination-marker"`) and layer (`"destination-marker-layer"`)
    5. Add an `"arrival-zone"` source + circle layer when destination is set:
       - Source: GeoJSON Point at destination coordinates
       - Layer type: `"circle"`, `circle-radius` calculated as meters-to-pixels at the destination's latitude (at zoom 20, ~12m ≈ ~70px — use a `["interpolate", ["exponential", 2], ["zoom"], ...]` expression for zoom-dependent sizing)
       - Paint: `circle-color: "rgba(66,133,244,0.15)"`, `circle-stroke-color: "#4285F4"`, `circle-stroke-width: 1`
    6. Clean up: remove the arrival zone source/layer when destination is cleared
  - Action in app.css:
    1. Add `.dest-marker-pin` styles: Colored pin shape via CSS (drop shape using `border-radius` + `transform: rotate(45deg)`), red or branded color
    2. Add `.dest-marker-pulse` animation: `@keyframes pulse-ring` — expanding ring from center that fades out, infinite loop, 2s duration
  - Notes: The circle-radius in meters needs a zoom-dependent expression because MapLibre circle-radius is in pixels by default. Use `circle-pitch-alignment: "map"` so the circle stays flat on the map surface. At the village's latitude (~14.35°N), 1° longitude ≈ 107,550m.

#### Phase 4: UI enhancements

- [x] **Task 10: Show total distance to destination in bottom strip**
  - File: `src/components/NavigationOverlay.tsx`
  - Action:
    1. Import `getDistanceAlongRoute` from `geo.ts`
    2. Compute `totalDistanceRemaining` using `getDistanceAlongRoute(userLng, userLat, destLng, destLat, routeCoords)` — use the full (untrimmed) route coordinates
    3. Modify the bottom strip (L130-147): replace the compass bearing / crow-flies distance with the along-route `totalDistanceRemaining` formatted via `formatDistance()`
    4. Layout: left side = 📍 + destination name (unchanged), right side = total remaining distance (e.g., "450 m" or "1.2 km")
  - Notes: The `distanceRemaining` prop from useNavigation is Haversine (crow-flies). The along-route distance will always be ≥ crow-flies. When `routeGeoJSON` is null (no route yet), fall back to the Haversine `distanceRemaining` value. For `routeSource === "direct"` (straight line fallback), along-route = crow-flies anyway, so no special handling.

- [x] **Task 11: Add re-center button to NavigationOverlay**
  - Files: `src/components/NavigationOverlay.tsx`, `src/App.tsx`, `src/styles/app.css`
  - Action in App.tsx:
    1. Add state: `const [isOffCenter, setIsOffCenter] = useState(false)`
    2. In the interaction tracking (Effect 2 onInteractionStart): also `setIsOffCenter(true)`
    3. In the 5-second auto-recenter timeout (Effect 2 onInteractionEnd): also `setIsOffCenter(false)`
    4. Create `handleRecenter` callback:
       ```typescript
       const handleRecenter = () => {
         if (!map || !userLocation) return;
         userInteractionTimeRef.current = null;
         setIsOffCenter(false);
         map.easeTo({
           center: [userLocation.longitude, userLocation.latitude],
           bearing: heading ?? 0,
           pitch: 45,
           zoom: 20,
           duration: 500,
         });
       };
       ```
    5. Pass `isOffCenter` and `onRecenter={handleRecenter}` props to NavigationOverlay
  - Action in NavigationOverlay.tsx:
    1. Add props: `isOffCenter: boolean`, `onRecenter: () => void`
    2. In `nav-map-controls` div, add a re-center button (crosshair icon) ABOVE the zoom buttons
    3. Show the button only when `isOffCenter === true` (conditional rendering)
    4. On click: call `onRecenter()`
  - Action in app.css:
    1. Style `.map-control-btn.recenter-btn` — same size as zoom buttons, crosshair SVG icon, subtle blue accent when visible
    2. Add entrance animation: fade-in when appearing
  - Notes: The re-center button should be the most prominent control when visible (user needs to find it quickly after panning). Use a crosshair/target icon (⊕) or a GPS arrow icon to make its purpose obvious.

### Acceptance Criteria

#### A. Smooth Bearing

- [x] AC-1: Given the user is in navigation mode with compass permission granted, when the device rotates, then the map bearing updates smoothly (no visible snapping/jumping) with a 150ms transition.
- [x] AC-2: Given the user rotates the device rapidly, when multiple heading updates fire, then each new `easeTo()` cancels the previous — no animation pile-up, map stays responsive.

#### B. Route Trimming

- [x] AC-3: Given a route is displayed and the user walks along it, when the GPS position updates, then the portion of the route behind the user is removed and only the remaining route is visible.
- [x] AC-4: Given the user is at the middle of a route segment, when the route is trimmed, then the trimmed route starts exactly at the user's projected position (not at the nearest waypoint).
- [x] AC-5: Given the user's GPS is inaccurate (projection deviation > 50m), when trimming would occur, then the route is NOT trimmed (full route remains visible) to avoid visual corruption.

#### C. Off-Route Detection

- [x] AC-6: Given the user deviates more than 25m from the route line, when the deviation is detected, then "Recalculating..." is displayed in the top pill, the device vibrates once (200ms), and a new route is calculated immediately.
- [x] AC-7: Given the user's browser does not support the Vibration API, when off-route is detected, then the visual "Recalculating..." feedback still appears without vibration (no error thrown).
- [x] AC-8: Given the user is off-route and a new route is successfully calculated, when the new route arrives, then the "Recalculating..." text is replaced by the new turn instruction and the route line updates.

#### D. Route Shadow Layer

- [x] AC-9: Given a route is displayed, when the user views the map, then the route line has a visible darker shadow/outline underneath it, giving a 3D depth effect.
- [x] AC-10: Given the route is trimmed, when the walked portion is removed, then the shadow layer is also trimmed (shares the same source).

#### E. Directional Chevrons

- [x] AC-11: Given a route is displayed, when the user views the map, then white directional chevron arrows are visible along the route line, pointing in the direction of travel.
- [x] AC-12: Given the route is trimmed, when the walked portion is removed, then the chevrons on the trimmed portion are also removed.

#### F. Custom User Marker

- [x] AC-13: Given navigation mode is active, when the user's GPS position updates, then a blue arrow marker (not the default blue dot) is displayed at the user's position, oriented in the direction of the device heading.
- [x] AC-14: Given the compass permission is NOT granted, when the user marker is displayed, then it shows as a circle (no directional arrow) since heading is unavailable.
- [x] AC-15: Given the user is NOT in navigation mode, when viewing the map, then the default MapLibre GeolocateControl dot is still visible (custom marker only replaces it during navigation).

#### G. Custom Destination Marker

- [x] AC-16: Given a destination is selected, when the marker is displayed, then it shows as a custom CSS pin with a pulsing ring animation (not the default PNG icon).
- [x] AC-17: Given a destination is selected and the user is navigating, when the map is viewed, then a semi-transparent blue circle representing the 12m arrival zone is visible around the destination marker.

#### H. Total Distance Display

- [x] AC-18: Given the user is navigating with a computed route, when the bottom strip is displayed, then it shows the total remaining distance to destination measured along the route (not crow-flies).
- [x] AC-19: Given the route source is "direct" (straight line fallback), when the bottom strip is displayed, then the distance shown matches the crow-flies distance (since the route IS a straight line).
- [x] AC-20: Given a next turn exists ahead, when the top pill is displayed, then it shows the distance to the next turn AND the bottom strip shows the total remaining — both visible simultaneously.

#### I. Re-center Button

- [x] AC-21: Given the user pans or zooms the map during navigation, when the map moves away from the user position, then a re-center button appears in the map controls area.
- [x] AC-22: Given the re-center button is visible, when the user taps it, then the map animates back to center on the user's position with the navigation camera (pitch 45°, zoom 20, bearing from heading), and the button disappears.
- [x] AC-23: Given the user has NOT interacted with the map, when navigation is active, then the re-center button is NOT visible (auto-centering is active).

#### Cross-cutting

- [x] AC-24: Given all enhancements are implemented, when testing on a Samsung Galaxy A-series (or equivalent budget Android), then navigation runs without visible frame drops or lag.
- [x] AC-25: Given all enhancements are implemented, when the app is built with `bun run build`, then the build succeeds with zero errors and `bun run lint` passes.

## Additional Context

### Dependencies

No new npm dependencies. Uses only:
- MapLibre GL JS existing features (line layers, symbol layers, Marker API, easeTo, addImage)
- Browser Vibration API (`navigator.vibrate`) — optional chaining for graceful fallback
- Existing `geo.ts` utility functions (`projectPointOnLine`, `getDistanceAlongRoute`, `getDistance`)
- OffscreenCanvas or Canvas for chevron arrow image generation (universally supported)

### Testing Strategy

Manual testing on real devices (no automated tests exist):
- **Android Chrome** (primary — ~80% users): Samsung Galaxy A-series or similar budget phone
- **iOS Safari 13+** (secondary): iPhone SE or similar

**Test scenarios:**
1. **Straight route**: Verify smooth bearing rotation, route trimming visible, chevrons displayed, shadow visible
2. **Route with multiple turns**: Verify trimming works at turn points, step distance updates correctly, chevrons follow turns
3. **Deliberate off-route (>25m deviation)**: Verify "Recalculating..." appears, device vibrates, new route replaces old one
4. **Pan away from position**: Verify re-center button appears after pan, tap re-centers with animation, button disappears
5. **Destination approach**: Verify arrival zone circle visible at zoom 15-20, custom dest pin with pulse animation
6. **No compass permission**: Verify user marker shows as circle (not arrow), bearing defaults to 0
7. **Battery/performance**: Run for 10 minutes of continuous navigation — no visible lag, acceptable battery drain

### Notes

**High-risk items:**
- Route trimming with ORS MultiLineString geometry — ensure flattening works correctly before slicing
- Off-route detection false positives at GPS accuracy drops (tunnel, buildings) — the 25m threshold and 50m trim guard should handle this
- Custom marker rotation synchronization with map bearing — test on both iOS and Android for compass accuracy

**Known limitations:**
- Circle arrival zone uses pixel-based radius with zoom interpolation — may not be pixel-perfect at all zoom levels
- Vibration API not supported on iOS Safari — visual feedback only on iPhone
- Canvas-drawn chevron arrow is static (white) — won't adapt to dark mode (not a concern since no dark mode planned)

**Future considerations (out of scope):**
- Voice guidance via Web Speech API (can reuse the step instruction text)
- Speed-based ETA computation (trivial to add: `distance / walkingSpeed`)
- Animated route drawing on first display (initial route appears instantly)
- Turn preview mini-map (zoomed detail of upcoming intersection)

## Review Notes
- Adversarial review completed with 12 findings
- Findings: 12 total, 6 fixed (F1, F2, F3, F4, F7, F9), 6 skipped (noise/undecided)
- Resolution approach: auto-fix (real findings only)
- Fixed: dest marker race condition, fullRoute stale state guard, off-route recalc cooldown, dead import cleanup, route layer cleanup on nav end, dest pin anchor offset
