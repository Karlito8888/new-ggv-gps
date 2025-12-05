# Tasks: Simplify Architecture

**Change ID**: `simplify-architecture`  
**Status**: Draft  
**Estimated Total Time**: 7-10 hours

## Overview

This task list provides a step-by-step implementation plan for the architecture simplification. Tasks are ordered to deliver user-visible progress incrementally while maintaining a working application throughout the refactor.

## Phase 1: Scaffold New Structure (1-2 hours)

### Task 1.1: Create feature branch
**Estimated time**: 5 minutes  
**Depends on**: None

- Create branch: `git checkout -b refactor/simplify-architecture`
- Push to remote: `git push -u origin refactor/simplify-architecture`

**Validation**:
- [ ] Branch exists locally and on remote
- [ ] Branch is tracking `origin/refactor/simplify-architecture`

---

### Task 1.2: Create new hook files with minimal implementation
**Estimated time**: 30 minutes  
**Depends on**: Task 1.1

- Create `src/hooks/useMapSetup.new.js` with basic map initialization
- Create `src/hooks/useRouting.new.js` with stub implementation
- Create `src/hooks/useNavigation.new.js` with stub implementation
- Import MapLibre GL JS in each hook
- Add basic JSDoc comments for API contracts

**Implementation checklist**:
- [ ] useMapSetup returns `{ map: null, userLocation: null, isMapReady: false, setMapStyle: () => {} }`
- [ ] useRouting returns `{ routeGeoJSON: null, distance: 0, duration: 0, isCalculating: false, error: null }`
- [ ] useNavigation returns `{ bearing: 0, nextTurn: null, distanceRemaining: 0, hasArrived: false }`

**Validation**:
- [ ] All 3 hook files created
- [ ] No TypeScript errors
- [ ] Hooks can be imported without errors

---

### Task 1.3: Create App.new.jsx with basic structure
**Estimated time**: 45 minutes  
**Depends on**: Task 1.2

- Create `src/App.new.jsx` with:
  - Map container ref
  - 5 state variables (navState, destination, userLocation, deviceOrientation, mapStyle)
  - Map container div
  - Import new hooks (don't call yet)
- Add basic CSS for map container (100% width/height)

**Implementation checklist**:
- [ ] `const [navState, setNavState] = useState('gps-permission')`
- [ ] `const [destination, setDestination] = useState(null)`
- [ ] `const mapContainerRef = useRef(null)`
- [ ] Map div with ref: `<div ref={mapContainerRef} className="map" />`

**Validation**:
- [ ] App.new.jsx renders without errors
- [ ] Map container div is in DOM
- [ ] State variables are initialized correctly

---

### Task 1.4: Implement useMapSetup with MapLibre initialization
**Estimated time**: 1 hour  
**Depends on**: Task 1.3

- Initialize MapLibre map in useEffect
- Add GeolocateControl
- Load block polygons from `src/data/blocks.js`
- Add blocks source and layers (fill + outline)
- Handle map style switching (OSM/satellite)
- Return map instance, userLocation, isMapReady

**Implementation checklist**:
- [ ] Map initializes on mount
- [ ] GeolocateControl added and triggers on click
- [ ] Block polygons render on map
- [ ] `userLocation` state updates on GPS events
- [ ] Map cleanup on unmount (`map.remove()`)

**Validation**:
- [ ] Map renders in App.new.jsx
- [ ] Blocks visible on map
- [ ] GPS button appears (from GeolocateControl)
- [ ] Clicking GPS button requests permission
- [ ] User location updates on permission grant
- [ ] No memory leaks (test with React DevTools)

---

## Phase 2: Migrate Core Features (3-4 hours)

### Task 2.1: Add inline overlay components to App.new.jsx
**Estimated time**: 1 hour  
**Depends on**: Task 1.4

- Define GPSPermissionOverlay inline
- Define WelcomeOverlay inline (with destination selection UI)
- Define OrientationPermissionOverlay inline
- Define NavigationOverlay inline (stub for now)
- Define ArrivalOverlay inline
- Add conditional rendering based on navState

**Implementation checklist**:
- [ ] All 5 overlay components defined as functions in App.new.jsx
- [ ] Conditional rendering: `{navState === 'gps-permission' && <GPSPermissionOverlay />}`
- [ ] Each overlay accepts props (onGrant, onSelectDestination, etc.)
- [ ] Basic styling for overlays (fixed position, centered, semi-transparent background)

**Validation**:
- [ ] GPSPermissionOverlay renders initially
- [ ] Clicking "Enable GPS" transitions to WelcomeOverlay
- [ ] WelcomeOverlay shows destination selection UI
- [ ] All overlays render correctly when navState changes manually

---

### Task 2.2: Implement destination selection in WelcomeOverlay
**Estimated time**: 45 minutes  
**Depends on**: Task 2.1

- Import blocks and POIs from `src/data/blocks.js` and `src/data/pois.js`
- Add dropdown/list for block selection
- Add POI markers to map (using `maplibregl.Marker`)
- Handle destination selection
- Transition to `orientation-permission` state on "Navigate" click

**Implementation checklist**:
- [ ] Blocks displayed in dropdown/list
- [ ] POI markers rendered on map
- [ ] Clicking a block or POI marker selects destination
- [ ] "Navigate" button enabled when destination selected
- [ ] `setDestination({ type, coordinates, name })` called on selection
- [ ] `setNavState('orientation-permission')` called on navigate

**Validation**:
- [ ] Destination selection UI works
- [ ] Destination markers visible on map
- [ ] Selecting destination updates state
- [ ] Clicking "Navigate" transitions to orientation permission screen

---

### Task 2.3: Implement useRouting with OSRM integration
**Estimated time**: 1.5 hours  
**Depends on**: Task 2.2

- Implement OSRM route fetching with `fetch()`
- Add route to map as `route-main` source + layer
- Implement direct line fallback if OSRM fails
- Calculate distance and duration from route geometry
- Set isCalculating state during fetch

**Implementation checklist**:
- [ ] OSRM API call: `http://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}`
- [ ] Parse OSRM response to extract route geometry, distance, duration
- [ ] Add `route-main` source: `map.addSource('route-main', { type: 'geojson', data: routeGeoJSON })`
- [ ] Add route layer: blue line, 5px width, rounded caps
- [ ] If OSRM fails: create direct line with `{ type: 'LineString', coordinates: [[lng1, lat1], [lng2, lat2]] }`
- [ ] Update routeGeoJSON state on success

**Validation**:
- [ ] Route appears on map after destination selection
- [ ] Route connects user location to destination
- [ ] Distance and duration calculated correctly
- [ ] Fallback to direct line works when OSRM fails (test by blocking request)
- [ ] Route updates when destination changes

---

### Task 2.4: Implement useNavigation with basic turn-by-turn
**Estimated time**: 1.5 hours  
**Depends on**: Task 2.3

- Calculate bearing to destination using haversine formula
- Calculate distance remaining using `map.project()`
- Implement arrival detection (< 20m threshold)
- Add camera tracking with `map.flyTo()`
- Return navigation data

**Implementation checklist**:
- [ ] Bearing calculated correctly (0-360 degrees)
- [ ] Distance remaining calculated using map.project() + metersPerPixel
- [ ] `hasArrived` set to true when distance < 20m
- [ ] Camera follows user with `map.flyTo({ center, bearing, pitch: 60, zoom: 18 })`
- [ ] Camera updates smoothly on user location changes

**Validation**:
- [ ] Bearing displayed correctly (test by moving on map)
- [ ] Distance remaining updates in real-time
- [ ] Camera follows user smoothly
- [ ] Arrival detection triggers at < 20m
- [ ] hasArrived triggers state transition to 'arrived'

---

### Task 2.5: Implement device orientation for compass
**Estimated time**: 45 minutes  
**Depends on**: Task 2.4

- Add device orientation permission request in OrientationPermissionOverlay
- Add event listeners for `deviceorientationabsolute` (Android) and `deviceorientation` (iOS)
- Update deviceOrientation state with alpha/beta/gamma values
- Display compass in NavigationOverlay

**Implementation checklist**:
- [ ] iOS: `DeviceOrientationEvent.requestPermission()` called on button click
- [ ] Android: Permission granted automatically
- [ ] Event listeners attached after permission granted
- [ ] `deviceOrientation` state updates with heading values
- [ ] Compass UI rotates based on heading

**Validation**:
- [ ] iOS Safari requests permission on button click
- [ ] Android Chrome grants permission automatically
- [ ] Compass heading updates when device rotates
- [ ] Compass UI displays correctly in NavigationOverlay

---

## Phase 3: Polish & Testing (2-3 hours)

### Task 3.1: Complete NavigationOverlay UI
**Estimated time**: 45 minutes  
**Depends on**: Task 2.5

- Display distance remaining prominently
- Display next turn instruction (if available)
- Display compass with bearing rotation
- Add "Cancel Navigation" button
- Style overlay to match Google Maps aesthetic

**Implementation checklist**:
- [ ] Distance displayed in meters (or km if > 1000m)
- [ ] Turn instruction displayed if `nextTurn` is not null
- [ ] Compass arrow rotates based on bearing
- [ ] "Cancel" button transitions back to 'welcome' state
- [ ] Responsive styling for mobile devices

**Validation**:
- [ ] All navigation data visible and updating
- [ ] UI looks polished and professional
- [ ] Cancel button works correctly
- [ ] Mobile responsive (test on iOS + Android)

---

### Task 3.2: Implement route recalculation on deviation
**Estimated time**: 45 minutes  
**Depends on**: Task 2.3

- Add deviation detection in useRouting
- Check distance from user to route every 5 seconds
- If > 25m: trigger recalculation by clearing routeGeoJSON
- Prevent recalculation spam (debounce)

**Implementation checklist**:
- [ ] `setInterval` checks deviation every 5 seconds
- [ ] Calculate distance from user to closest route point
- [ ] If distance > 25m: `setRouteGeoJSON(null)` to trigger recalc
- [ ] Recalculation uses updated user location as origin
- [ ] Interval cleared on unmount

**Validation**:
- [ ] Route recalculates when user deviates > 25m
- [ ] Recalculation doesn't spam (max once per 5s)
- [ ] New route displayed after recalculation
- [ ] No memory leaks from interval

---

### Task 3.3: Add map style toggle (OSM/Satellite)
**Estimated time**: 30 minutes  
**Depends on**: Task 1.4

- Add toggle button to switch between OSM and satellite styles
- Implement style switching with `setMapStyle` from useMapSetup
- Preserve layers and sources when switching styles

**Implementation checklist**:
- [ ] Toggle button added to UI (top-right corner)
- [ ] Clicking button calls `setMapStyle('satellite')` or `setMapStyle('osm')`
- [ ] Map style changes smoothly
- [ ] Block polygons and route remain visible after style change
- [ ] User location marker remains visible

**Validation**:
- [ ] Toggle button works on both styles
- [ ] Satellite imagery loads correctly
- [ ] OSM style loads correctly
- [ ] Layers/sources preserved on style switch

---

### Task 3.4: Test on iOS Safari
**Estimated time**: 1 hour  
**Depends on**: Tasks 3.1, 3.2, 3.3

- Deploy to staging (Netlify preview)
- Test on physical iPhone with Safari
- Verify GPS permission flow
- Verify device orientation permission
- Verify compass heading accuracy
- Fix any iOS-specific bugs

**Testing checklist**:
- [ ] GPS permission prompt appears
- [ ] GPS tracking works accurately
- [ ] Device orientation permission prompt appears (iOS 13+)
- [ ] Compass heading updates correctly
- [ ] No console errors in Safari
- [ ] Touch interactions work smoothly
- [ ] PWA install prompt appears

**Validation**:
- [ ] All features working on iOS Safari
- [ ] No critical bugs
- [ ] Performance acceptable (smooth animations)

---

### Task 3.5: Test on Android Chrome
**Estimated time**: 45 minutes  
**Depends on**: Tasks 3.1, 3.2, 3.3

- Test on physical Android device with Chrome
- Verify GPS permission flow (auto-granted)
- Verify device orientation (no permission needed)
- Verify compass heading accuracy
- Fix any Android-specific bugs

**Testing checklist**:
- [ ] GPS permission prompt appears or auto-granted
- [ ] GPS tracking works accurately
- [ ] Device orientation works without permission
- [ ] Compass heading updates correctly
- [ ] No console errors in Chrome DevTools
- [ ] Touch interactions work smoothly
- [ ] PWA install prompt appears

**Validation**:
- [ ] All features working on Android Chrome
- [ ] No critical bugs
- [ ] Performance acceptable (smooth animations)

---

## Phase 4: Cleanup & Deploy (1-2 hours)

### Task 4.1: Remove old dependencies from package.json
**Estimated time**: 15 minutes  
**Depends on**: Phase 3 complete

- Remove `react-map-gl` dependency
- Remove `@turf/turf` dependency
- Remove `react-router-dom` dependency
- Remove `@tanstack/react-query` if not used elsewhere
- Run `npm install` to update package-lock.json

**Implementation checklist**:
- [ ] Dependencies removed from package.json
- [ ] `npm install` runs successfully
- [ ] No build errors after removal
- [ ] Bundle size reduced (check with `npm run build`)

**Validation**:
- [ ] Build succeeds without removed dependencies
- [ ] Bundle size reduced by ~150KB gzipped
- [ ] No import errors in app

---

### Task 4.2: Delete old files
**Estimated time**: 15 minutes  
**Depends on**: Task 4.1

- Delete `src/hooks/` (old hook files)
- Delete `src/pages/` directory
- Delete `src/layouts/MapLayout.jsx`
- Delete `src/contexts/NavigationContext.jsx`
- Delete `src/router.jsx`
- Rename `App.new.jsx` to `App.jsx` (or integrate into main.jsx)
- Update imports in `main.jsx`

**Implementation checklist**:
- [ ] All old files deleted
- [ ] New hooks in `src/hooks/` (useMapSetup, useRouting, useNavigation)
- [ ] App.jsx is the main component
- [ ] main.jsx imports App.jsx correctly
- [ ] No broken imports

**Validation**:
- [ ] File count < 10 in src/ (excluding data/, styles/)
- [ ] App builds and runs
- [ ] No 404 errors for deleted files

---

### Task 4.3: Update main.jsx to remove wrappers
**Estimated time**: 15 minutes  
**Depends on**: Task 4.2

- Remove `<RouterProvider>` wrapper
- Remove `<NavigationProvider>` wrapper
- Keep `<QueryClientProvider>` only if needed (check Supabase usage)
- Simplify to: `<Theme><App /></Theme>`

**Implementation checklist**:
- [ ] main.jsx simplified to minimal wrappers
- [ ] No Router or Context providers
- [ ] App renders directly

**Validation**:
- [ ] App renders without errors
- [ ] No console warnings about missing providers

---

### Task 4.4: Run Lighthouse audit and optimize
**Estimated time**: 30 minutes  
**Depends on**: Task 4.3

- Build production app: `npm run build`
- Run Lighthouse audit on preview
- Fix any performance issues (< 90 score)
- Optimize bundle chunks if needed

**Implementation checklist**:
- [ ] Production build succeeds
- [ ] Lighthouse performance score ≥ 90
- [ ] Lighthouse accessibility score ≥ 90
- [ ] Lighthouse best practices score ≥ 90
- [ ] Lighthouse SEO score ≥ 90

**Validation**:
- [ ] All Lighthouse scores meet targets
- [ ] Initial load < 3s on 4G
- [ ] No critical performance warnings

---

### Task 4.5: Update CLAUDE.md and openspec docs
**Estimated time**: 30 minutes  
**Depends on**: Phase 4 complete

- Update CLAUDE.md with new architecture
- Update file structure documentation
- Update hook descriptions
- Remove references to removed dependencies
- Archive old specs with openspec

**Implementation checklist**:
- [ ] CLAUDE.md updated with new architecture
- [ ] File structure matches actual codebase
- [ ] Hook documentation accurate
- [ ] No references to removed dependencies

**Validation**:
- [ ] Documentation is accurate and up-to-date
- [ ] New developers can understand architecture from docs

---

### Task 4.6: Merge to main and deploy
**Estimated time**: 30 minutes  
**Depends on**: Tasks 4.4, 4.5

- Create PR: `refactor/simplify-architecture` → `main`
- Review changes in GitHub
- Merge PR
- Verify Netlify deployment succeeds
- Test production deployment on iOS + Android
- Tag release: `v2.0.0` (major version bump for breaking changes)

**Implementation checklist**:
- [ ] PR created with detailed description
- [ ] All CI checks pass (lint, build)
- [ ] PR merged to main
- [ ] Netlify deployment succeeds
- [ ] Production site tested on iOS + Android
- [ ] Git tag created: `git tag v2.0.0 && git push --tags`

**Validation**:
- [ ] Production site live at myggvgps.netlify.app
- [ ] All features working in production
- [ ] No critical bugs reported
- [ ] Release tagged in GitHub

---

## Success Criteria (Final Checklist)

**Quantitative Metrics**:
- [ ] Total files < 10 (excluding data/, styles/)
- [ ] Total LOC < 1500 (check with `cloc src/`)
- [ ] Custom hooks = 3 (useMapSetup, useRouting, useNavigation)
- [ ] Zero usage of react-map-gl (removed from package.json)
- [ ] Zero usage of @turf/turf (removed from package.json)
- [ ] Bundle size reduction > 100KB gzipped (compare main vs new)
- [ ] Lighthouse performance score ≥ 90

**Qualitative Metrics**:
- [ ] All existing navigation features work identically
- [ ] iOS Safari + Android Chrome compatibility verified
- [ ] PWA install works on both platforms
- [ ] Code is simpler and easier to understand
- [ ] No console errors or warnings

**Functional Tests (All Must Pass)**:
- [ ] GPS permission flow works on iOS + Android
- [ ] Destination selection (block/lot/POI) works
- [ ] Device orientation permission + compass works
- [ ] Turn-by-turn navigation provides correct instructions
- [ ] Route recalculation triggers on 25m deviation
- [ ] Arrival detection works within 20m
- [ ] Satellite/OSM toggle works
- [ ] "Navigate Again" resets correctly
- [ ] Map interactions smooth (pan, zoom, rotate)

---

## Risk Mitigation

**Risk**: MapLibre spatial APIs less accurate than Turf.js  
**Mitigation**: Test distance calculations extensively; keep Turf.js as optional dependency if needed

**Risk**: iOS compass heading drift  
**Mitigation**: Implement heading smoothing (moving average over 3-5 readings)

**Risk**: OSRM service downtime  
**Mitigation**: Already have cascading fallbacks (OSRM → MapLibre → ORS → Direct line)

**Risk**: React 19 compatibility issues  
**Mitigation**: Test thoroughly; downgrade to React 18.3 if critical bugs arise

---

## Post-Deployment Tasks

**After successful deployment**:
1. Monitor Sentry/error logs for 48 hours
2. Collect user feedback on performance
3. Archive old `refactor/simplify-architecture` branch
4. Update changelog with v2.0.0 release notes
5. Consider further optimizations (e.g., CSS animations replacing Framer Motion)

---

## Estimated Timeline

**Total**: 7-10 hours

- Phase 1: 1-2 hours
- Phase 2: 3-4 hours
- Phase 3: 2-3 hours
- Phase 4: 1-2 hours

**Recommended schedule**:
- Day 1: Phases 1-2 (4-6 hours)
- Day 2: Phases 3-4 (3-5 hours)

**Continuous deployment**: Merge PR at end of Day 2, monitor for 24 hours before considering complete.
