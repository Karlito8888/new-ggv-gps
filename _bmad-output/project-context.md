---
project_name: "new-ggv-gps"
user_name: "Charles"
date: "2026-02-19"
sections_completed:
  [
    "technology_stack",
    "language_rules",
    "framework_rules",
    "testing_rules",
    "quality_rules",
    "workflow_rules",
    "anti_patterns",
  ]
status: "complete"
rule_count: 95
optimized_for_llm: true
version: "2.2.3"
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## 🏗️ Technology Stack & Versions

**Core Framework:**

- React 19.2.3
- React DOM 19.2.3
- Vite 7.3.0 (build tool)

**Mapping & Navigation:**

- MapLibre GL 5.15.0 (native API only - NO `react-map-gl` wrapper)
- pmtiles 4.4.0 (optional tile support)
- protomaps-themes-base 4.5.0

**UI & Animation:**

- Framer Motion 12.23.26 (lazy-loaded in `animations` chunk)
- CSS-in-JS: Inline styles + CSS imports

**Backend & Data:**

- Supabase JS 2.88.0 (lazy-loaded in `supabase` chunk, optional)

**Development & Linting:**

- ESLint 9.39.2 (enforced on all commits)
- @eslint/js 9.39.2
- eslint-plugin-react-hooks 7.0.1
- eslint-plugin-react-refresh 0.4.26
- Babel Plugin React Compiler 1.0.0
- Globals 16.5.0

**Runtime Requirements:**

- Node.js >= 20.19.0
- Bun >= 1.0 (package manager & runtime)

---

## 🎯 Critical Implementation Rules

### 1. **Hooks Architecture - MANDATORY**

The project uses **3 essential hooks only**:

- `useMapSetup(containerRef)` - Map initialization + GPS tracking
- `useRouting(map, userLocation, destination)` - Route calculation + deviation detection
- `useNavigation(map, userLocation, destination)` - Turn-by-turn logic + arrival detection

**Rule: Never create new hooks unless absolutely reusable across components.** Inline logic if only used once.

### 2. **MapLibre - Use ONLY Native API**

**FORBIDDEN:**

- ❌ `react-map-gl` (wrapper library)
- ❌ `@turf/turf` (spatial library)
- ❌ MapLibre abstraction layers

**REQUIRED:**

- ✅ Direct `new maplibregl.Map()`
- ✅ Native `map.addSource()`, `map.addLayer()`, `map.setFeatureState()`
- ✅ Native `GeolocateControl` for GPS
- ✅ `map.getSource().setData()` for dynamic updates

**Example (DO THIS):**

```js
const map = new maplibregl.Map({
  container: containerRef.current,
  style: "https://tiles.openfreemap.org/styles/liberty",
  center: [120.95134859887523, 14.347872973134175],
  zoom: 15,
});

map.addSource("route-remaining", { type: "geojson", data: routeGeoJSON });
map.addLayer({
  id: "route-remaining-line",
  type: "line",
  source: "route-remaining",
  paint: { "line-color": "#4285F4", "line-width": 5 },
});

// Update route dynamically
map.getSource("route-remaining").setData(newRouteGeoJSON);
```

### 3. **State Management - Simple useState ONLY**

**FORBIDDEN:**

- ❌ React Router
- ❌ Context API
- ❌ Redux / Zustand / Jotai
- ❌ External state libraries

**REQUIRED:**

- ✅ Simple `useState` in App.jsx
- ✅ Conditional rendering for navigation states (no routing library)
- ✅ Direct prop drilling if needed

**Navigation State Machine (6 states):**

```
gps-permission → welcome → orientation-permission → navigating → arrived → exit-complete
```

Implement as:

```jsx
const [navState, setNavState] = useState('gps-permission');

{navState === 'gps-permission' && <GPSPermissionOverlay onGrant={...} />}
{navState === 'welcome' && <WelcomeOverlay onSelectDestination={...} />}
{navState === 'orientation-permission' && <OrientationPermissionOverlay onGrant={...} />}
{navState === 'navigating' && <NavigationOverlay {...navigationData} />}
{navState === 'arrived' && <ArrivedOverlay onReset={...} />}
{navState === 'exit-complete' && <ExitCompleteOverlay onReset={...} />}
```

### 4. **File Organization - KISS Principle**

**7 Core Files Only:**

```
src/
├── App.jsx (513 LOC) - Main component + 6 inline overlays
├── main.jsx (23 LOC) - Entry point only
├── hooks/
│   ├── useMapSetup.js (213 LOC)
│   ├── useRouting.js (300 LOC)
│   └── useNavigation.js (237 LOC)
├── data/blocks.js - GeoJSON block polygons
└── lib/
    ├── geo.js - Utility functions (distance, projection)
    └── supabase.js - Lazy-loaded Supabase client
```

**Rule: Inline components in App.jsx if used only once.** No separate overlay files - all 6 overlays defined inline.

### 5. **File Extensions & Naming**

**REQUIRED:**

- ✅ All components: `.jsx` extension (not `.js`)
- ✅ Non-component code: `.js` extension
- ✅ Components: `PascalCase` (e.g., `GPSPermissionOverlay`)
- ✅ Functions/hooks: `camelCase` (e.g., `useMapSetup`, `getDistance`)
- ✅ Constants: `UPPER_SNAKE_CASE` (e.g., `VILLAGE_CENTER`)
- ✅ Variables: `camelCase`

**FORBIDDEN:**

- ❌ `.ts` / `.tsx` (TypeScript not used in this project)
- ❌ `kebab-case` for components
- ❌ `snake_case` for functions

### 6. **GeoJSON Coordinates Convention**

**CRITICAL: Coordinates in GeoJSON are `[longitude, latitude]` (NOT reversed):**

```js
// CORRECT (GeoJSON standard)
const VILLAGE_CENTER = [120.95134859887523, 14.347872973134175];
map.setCenter([longitude, latitude]);

// User location object uses GPS standard (latitude, longitude)
userLocation = { latitude: 14.347872973134175, longitude: 120.95134859887523 };
```

**Always convert between formats:**

```js
// GeoJSON coords to GPS format
const gpsFormat = { latitude: coords[1], longitude: coords[0] };

// GPS format to GeoJSON coords
const geoJsonFormat = [gpsFormat.longitude, gpsFormat.latitude];
```

### 7. **Routing & Deviation Detection Thresholds**

**NEVER change these without testing on actual device:**

- **Deviation threshold**: 25 meters (triggers route recalculation)
- **Recalculation debounce**: 10 seconds minimum (prevents spam)
- **Deviation check interval**: 5 seconds
- **Arrival threshold**: 15 meters (< 15m = arrived)

Location: `src/hooks/useRouting.js` and `src/hooks/useNavigation.js`

### 8. **Language & Localization**

**MANDATORY Bilingual UI:**

- Primary: English (all UI text)
- Secondary: Tagalog (translations in parentheses or subtitle)

**Example:**

```jsx
<h1>Enable Location</h1>
<p className="tagalog">(I-enable ang Lokasyon)</p>

// Or inline:
<p>Enable GPS to navigate • I-enable ang GPS para mag-navigate</p>
```

**Target audience:** Filipino residents of Garden Grove Village, Philippines.

### 9. **Build & Production Configuration**

**Vite Build Settings (DO NOT CHANGE):**

- Output directory: `dist/`
- Target: `esnext` (optimize for modern phones)
- Code splitting: Enabled (`cssCodeSplit: true`)
- Lazy-loaded chunks:
  - `vendor` - React/React-DOM (always needed)
  - `maps` - MapLibre GL (lazy)
  - `supabase` - Supabase client (lazy)
  - `animations` - Framer Motion (lazy)
- Console/debugger stripping: Enabled in production
- Sourcemaps: Disabled (`sourcemap: false`)

**Build Command (Netlify):**

```bash
bun run build:netlify  # Runs: bun run lint && vite build
```

### 10. **ESLint Rules & Code Quality**

**Enforced Rules:**

- No unused variables (with exceptions: `^[A-Z_]|^m(otion)?$`)
- React Hooks rules (enforced)
- React Refresh warnings (component-only exports)

**MUST RUN before committing:**

```bash
bun run lint        # Check for violations
bun run lint:fix    # Auto-fix style issues
```

### 11. **Async/State Management Pattern**

**FORBIDDEN:**

- ❌ `setState` in async callbacks without proper cleanup
- ❌ Race conditions from stale state

**REQUIRED:**

```js
// WRONG - can cause race conditions
const handleFetch = async () => {
  const data = await fetch(...);
  setState(data); // Stale closure!
};

// CORRECT - use .then() directly
useEffect(() => {
  supabase.rpc("get_blocks").then(({ data, error }) => {
    if (!error) setState(data);
  });
}, []);
```

### 12. **Components - Hooks Only (No Classes)**

**FORBIDDEN:**

- ❌ Class components
- ❌ `this.state`, `this.props`
- ❌ Component lifecycle methods

**REQUIRED:**

- ✅ Function components with hooks
- ✅ `useEffect` for side effects
- ✅ `useRef` for imperative references (MapLibre, DOM)
- ✅ `useState` for state

### 13. **Comments & Documentation**

**Only add comments for NON-OBVIOUS logic:**

- ✅ Complex algorithms (Haversine formula, projections)
- ✅ Browser compatibility quirks (iOS 13+ permission API)
- ✅ Workarounds for MapLibre/browser limitations
- ❌ No redundant comments explaining obvious code
- ❌ No commented-out code (use git history)
- ❌ No TODO comments without context

**Use JSDoc for hooks:**

```js
/**
 * Hook to initialize MapLibre map with GPS tracking.
 * @param {React.RefObject<HTMLDivElement>} containerRef
 * @returns {{ map: maplibregl.Map | null, userLocation: {...}, isMapReady: boolean }}
 */
export function useMapSetup(containerRef) { ... }
```

### 14. **Development Workflow - MANDATORY**

**Before Starting Work:**

1. Run `bun run lint` to validate existing code
2. Understand `navState` in App.jsx
3. Check if changes affect multiple hooks

**When Making Changes:**

1. Prefer modifying existing symbols over creating new files
2. Keep inline logic if used only once
3. Test on mobile device (iOS Safari + Android Chrome)
4. For routing changes: Verify 25m deviation threshold still works
5. For arrival changes: Test 15m threshold on actual device

**After Changes:**

1. Run `bun run lint:fix` to auto-correct style
2. Test on mobile device (GPS/orientation permissions)
3. Verify map loads without console errors
4. Check both OSM and satellite map styles work

### 15. **Browser Compatibility - Critical Patterns**

**Device Orientation (iOS 13+ requirement):**

```js
// iOS 13+ requires explicit permission
if (typeof DeviceOrientationEvent.requestPermission === "function") {
  const permission = await DeviceOrientationEvent.requestPermission();
}

// Android Chrome - no permission needed
window.addEventListener("deviceorientationabsolute", (e) => {
  setHeading(e.alpha);
});

// iOS Safari fallback
window.addEventListener("deviceorientation", (e) => {
  if (e.webkitCompassHeading) {
    setHeading(e.webkitCompassHeading);
  }
});
```

**CSS Viewport (mobile safe):**

- Primary: `100dvh` (dynamic viewport height)
- Fallback: `100svh`, `-webkit-fill-available`

**Input Zoom Prevention (iOS Safari):**

- Set `font-size: 16px` on all inputs to prevent auto-zoom

### 16. **Performance & Bundle Optimization**

**Target Metrics:**

- Index bundle: ~121 KB gzipped
- Maps chunk: ~264 KB gzipped
- Lazy loading reduces initial load

**DO NOT:**

- ❌ Add inline CSS that could be extracted
- ❌ Create unnecessary dependencies
- ❌ Suppress bundler warnings without investigation
- ❌ Use slow external APIs (use OSRM for routing)

### 17. **Testing - Manual Only (No Automated Tests)**

**Manual Checklist (on real device):**

- [ ] GPS permission flow (iOS + Android)
- [ ] Destination selection (blocks/POIs render)
- [ ] Device orientation + compass updates
- [ ] Route calculation (OSRM API working)
- [ ] Fallback to direct line (simulate OSRM failure)
- [ ] Deviation detection (walk >25m away from route)
- [ ] Arrival detection at <15m threshold
- [ ] Map style toggle (OSM ↔ Satellite)
- [ ] Village exit flow completes
- [ ] GPS tracking follows movement
- [ ] No jank/stutter on interaction
- [ ] Works offline (cached assets load)

---

## 📊 Existing Code Patterns Found

### Pattern 1: Inline Overlays in App.jsx

All 6 navigation overlays (GPSPermissionOverlay, WelcomeOverlay, etc.) are defined INLINE in App.jsx, not in separate files. This is intentional for simplicity.

### Pattern 2: MapLibre Dynamic Layer Updates

Routes and destinations are updated using:

```js
map.getSource("route-remaining").setData(newRouteGeoJSON);
```

Never recreate layers - always reuse sources and update with `.setData()`.

### Pattern 3: useRef for MapLibre & DOM References

```js
const mapContainerRef = useRef(null);
const geolocateRef = useRef(null);

// Used for imperative MapLibre control, not rendering
```

### Pattern 4: Lazy Loading with Dynamic Import

MapLibre is lazy-loaded in the build. Import statements in hooks trigger chunk loading.

### Pattern 5: Feature State for Dynamic Styling

```js
map.setFeatureState({ source: "blocks", id: featureId }, { highlighted: true });
```

Used for highlighting destinations on map.

### Pattern 6: Error Handling with State

Errors stored in state and displayed in overlays:

```js
const [blocksError, setBlocksError] = useState(null);
// Show retry button if error exists
```

### Pattern 7: Geolocation with GeolocateControl

```js
const geolocate = new maplibregl.GeolocateControl({
  positionOptions: { enableHighAccuracy: true },
  trackUserLocation: true,
  showUserHeading: true,
});
map.addControl(geolocate);
```

### Pattern 8: Conditional Device Features

Check for iOS orientation permission API before calling:

```js
if (typeof DeviceOrientationEvent.requestPermission === "function") {
  // iOS 13+ path
}
```

---

## 🚀 Deployment & Release Process

**Version Bumping (with git tags):**

```bash
bun run release:patch    # Bump patch version + push + tag
bun run release:minor    # Bump minor version + push + tag
bun run release:major    # Bump major version + push + tag
```

**Netlify Configuration:**

- Build command: `bun run build:netlify`
- Publish directory: `dist/`
- SPA redirect: All routes → `/index.html`
- Security headers enabled
- Cache busting for assets (1 year for immutable files)

---

## ⚙️ Utility Functions (src/lib/geo.js)

**Available utilities for distance/routing calculations:**

- `getDistance(lat1, lon1, lat2, lon2)` - Haversine formula
- `projectPointOnLine(pointLng, pointLat, lineCoordinates)` - Project point onto line
- `getDistanceAlongRoute(coordinates, targetLng, targetLat)` - Distance along polyline

Use these instead of external libraries (Turf.js).

---

## 📝 Key Files & Their Responsibilities

| File             | Purpose                            | LOC | Critical Details                    |
| ---------------- | ---------------------------------- | --- | ----------------------------------- |
| App.jsx          | Main component + 6 inline overlays | 513 | Navigation state machine here       |
| useMapSetup.js   | Map initialization + GPS           | 213 | Never lazy-load MapLibre here       |
| useRouting.js    | Route calculation + deviation      | 300 | 25m threshold, 10s debounce         |
| useNavigation.js | Turn-by-turn + arrival logic       | 237 | 15m arrival threshold               |
| blocks.js        | GeoJSON block polygons             | N/A | Add/update blocks here              |
| geo.js           | Spatial utility functions          | N/A | Use Haversine, NOT Turf.js          |
| supabase.js      | Supabase client (lazy)             | N/A | Optional, initialized on first call |

---

## 🎓 Architecture Philosophy

**KISS (Keep It Simple, Stupid)** - Applied ruthlessly:

**Prefer:**

- Fewer files > more files with "clean architecture"
- Direct solutions > reusable abstractions
- Inline components > separate files (if small)
- Native MapLibre > wrapper libraries

**Avoid:**

- Premature abstractions
- Unnecessary utility functions
- Over-engineering for hypothetical features
- Complex state management

---

## 📖 Language Conventions

- **Conversation language**: French (Français)
- **Application UI**: English + Tagalog bilingual
- **Code**: English only (variable names, comments, function names)
- **Variable naming**: camelCase, descriptive, English

---

## 📚 Usage Guidelines

### For AI Agents

**Before implementing any code:**

1. ✅ Read this entire project context file
2. ✅ Understand the 6-state navigation machine in App.jsx
3. ✅ Verify technology versions match exactly
4. ✅ Check if changes affect multiple hooks
5. ✅ Test on real iOS/Android devices (not desktop)

**When implementing:**

1. Follow ALL critical rules exactly as documented
2. When in doubt about patterns, refer to existing code in `src/App.jsx` and hooks
3. Run `bun run lint` before committing
4. Test on actual mobile device (iOS Safari + Android Chrome)
5. Update this file if you discover new patterns or edge cases

**Key Principles:**

- KISS (Keep It Simple, Stupid) - Radical simplification is intentional
- MapLibre native API only - No wrappers or abstractions
- Simple `useState` only - No Context/Redux/external state management
- 3 hooks total - Never create new hooks unless absolutely reusable
- Inline overlays - All 6 navigation overlays stay in App.jsx
- Manual testing only - No automated tests, device-based validation required

### For Project Maintainers

**Regular Updates:**

- Review quarterly for outdated rules or patterns
- Remove rules that become obvious over time
- Add new patterns discovered during implementation
- Update technology versions if dependencies change
- Keep file lean and focused on unobvious details

**Maintenance Schedule:**

- When upgrading dependencies: Review and update version constraints
- When adding major features: Assess if new patterns need documentation
- When discovering edge cases: Document in "Critical Don't-Miss Rules"
- When architecture changes: Update corresponding section

**File Optimization:**

- Keep content focused on UNOBVIOUS rules only
- Remove redundant information
- Use specific, actionable language
- Optimize for quick scanning by LLMs

---

## 🎯 Context Quick Reference

**Critical Thresholds (NEVER change without device testing):**

- Deviation detection: 25 meters
- Arrival threshold: 20 meters
- Recalculation debounce: 10 seconds
- Deviation check interval: 5 seconds

**Core Files (MUST understand before coding):**

- `App.jsx` - Navigation state machine + 6 inline overlays
- `useMapSetup.js` - Map initialization + GPS tracking
- `useRouting.js` - Route calculation + deviation detection
- `useNavigation.js` - Turn-by-turn + arrival detection

**Forbidden (NEVER do these):**

- ❌ Add react-map-gl or Turf.js
- ❌ Create new hooks (unless absolutely reusable)
- ❌ Use Context/Redux/state management libraries
- ❌ Externalize inline overlays to separate files
- ❌ Change file extensions to .ts/.tsx
- ❌ Add React Router or routing library
- ❌ Create new directories for "clean architecture"

**Required (ALWAYS do these):**

- ✅ Run `bun run lint` before commits
- ✅ Test on real iOS Safari + Android Chrome
- ✅ Use MapLibre native API only
- ✅ Follow GeoJSON [longitude, latitude] convention
- ✅ Keep bilingual English + Tagalog UI
- ✅ Respect thresholds: 25m deviation, 20m arrival, 10s debounce

---

_Last Updated: 2026-02-19_
_Project Version: 2.2.3_
_Context Status: Complete & Optimized for LLM Consumption_
