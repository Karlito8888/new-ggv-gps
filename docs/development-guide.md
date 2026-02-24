# Development Guide — MyGGV GPS

> Generated: 2026-02-24 | Scan: exhaustive | Mode: full_rescan

---

## Prerequisites

| Requirement | Version | Install |
|---|---|---|
| **Bun** | ≥ 1.0 | https://bun.sh |
| **Node.js** | ≥ 20.19.0 | https://nodejs.org |
| **Git** | any | https://git-scm.com |

> Bun is the primary package manager. Node.js is required for runtime compatibility.

---

## Initial Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd new-ggv-gps

# 2. Install dependencies
bun install

# 3. Configure environment
cp .env.example .env
# Edit .env with your actual Supabase credentials

# 4. Start development server
bun run dev
# → http://localhost:5173 (also accessible on local network)
```

---

## Environment Variables

Create `.env` at project root (never commit this file):

```bash
# REQUIRED
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key

# OPTIONAL — ORS routing fallback (level 2)
VITE_OPENROUTE_API_KEY=your_openroute_api_key
```

> Variables are `VITE_`-prefixed and inlined at build time by Vite. They are NOT available at runtime (no `process.env`).

---

## Available Commands

| Command | Description |
|---|---|
| `bun run dev` | Start dev server on port 5173 (LAN accessible via `--host`) |
| `bun run build` | Production build → `dist/` |
| `bun run build:netlify` | Production build with ESLint pre-check (used by Netlify CI) |
| `bun run lint` | Run ESLint validation |
| `bun run lint:fix` | Run ESLint with auto-fix |
| `bun run format` | Run Prettier on all files |
| `bun run format:check` | Check Prettier formatting (no write) |
| `bun run preview` | Preview production build on port 5173 |
| `bun run serve` | Alternative preview on port 3000 |
| `bun run release:patch` | Bump patch version + git tag + push |
| `bun run release:minor` | Bump minor version + git tag + push |
| `bun run release:major` | Bump major version + git tag + push |

---

## Development Workflow

### Before Starting Work
1. Run `bun run lint` to validate existing code
2. Understand the state machine in `App.jsx` (`navState` values)
3. Check if your changes affect multiple hooks (coordinate accordingly)

### Making Changes

**Adding a new overlay/screen:**
1. Add a new `navState` string value
2. Add the state transition in the relevant event handler
3. Add `{navState === "new-state" && <NewOverlay ... />}` in the JSX render
4. Define `function NewOverlay({...})` inline in `App.jsx`
5. Add CSS for the new overlay in `src/styles/app.css`

**Modifying routing behavior:**
- Route calculation: `src/hooks/useRouting.js`
- Arrival threshold (currently 12m): `src/hooks/useNavigation.js` → `const isArrived = dist < 12`
- Route recalc threshold (currently 30m): `src/hooks/useRouting.js` → `if (movedDistance < 30)`
- OSRM retry delays: `const RETRY_DELAYS = [10000, 30000, 60000]`
- Request timeout: `const REQUEST_TIMEOUT_MS = 3000`

**Modifying map appearance:**
- Map style: `useMapSetup.js` → `initMap()` → `style` object
- Block label colors/sizes: `addBlocksLayer()` in `useMapSetup.js`
- Destination marker: `updateDestinationMarker()` in `useMapSetup.js`
- Route line color/width: `updateMapRoute()` in `useRouting.js`
- Initial navigation view: App.jsx effect with `map.easeTo({ pitch: 45, zoom: 20 })`

**Modifying GPS/compass behavior:**
- GPS tracking setup: `useMapSetup.js` → `GeolocateControl` config
- Compass rotation throttle: App.jsx → `THROTTLE_MS = 250`, `MIN_DELTA = 3`
- Auto-recenter delay: App.jsx → `setTimeout(..., 5000)` in interaction end handler

### After Making Changes
1. `bun run lint:fix` — auto-correct style issues
2. Test on real mobile device (GPS/orientation don't work on desktop)
3. Test iOS Safari + Android Chrome separately (different orientation APIs)
4. Verify map loads without console errors
5. If changing MapLibre setup: test both style load scenarios

---

## Testing

**No automated tests exist.** All testing is manual/device-based.

### Mobile Testing Checklist

- [ ] GPS permission flow (iOS Safari + Android Chrome)
- [ ] Destination selection (block + lot dropdowns load from Supabase)
- [ ] Device orientation permission + compass heading updates during navigation
- [ ] Route calculation (OSRM response in Network tab)
- [ ] Route fallback to ORS (block OSRM in DevTools → Network → block URL)
- [ ] Route fallback to direct line (block both OSRM + ORS)
- [ ] User movement triggers route recalc (move > 30m)
- [ ] Arrival detection triggers at < 12m from destination
- [ ] "Exit Village" flow: sets exit coordinates, navigates, shows exit-complete
- [ ] Map style loads correctly (no missing glyph errors in console)
- [ ] App version displays correctly on GPS permission screen

### Desktop Debugging
```js
// GPS position simulation (paste in DevTools console)
// Note: Map won't show real GPS on desktop

// Force test arrival modal (mock destination near mock position)
// - Open DevTools → Sources → Override GPS in Sensors tab
```

### Network Tab Debugging
- OSRM call: `router.project-osrm.org/route/v1/foot/...`
- ORS call: `api.openrouteservice.org/v2/directions/...` (only if OSRM fails)
- Supabase calls: `wlrrruemchacgyypexsu.supabase.co/rest/v1/rpc/get_blocks`
- Map style: `tiles.openfreemap.org/styles/liberty`
- Fonts: `demotiles.maplibre.org/font/...`

---

## Project Structure Conventions

### Adding a new utility function
- **One-time use:** Keep it inline where it's used (KISS principle)
- **Reusable across hooks:** Add to `src/lib/geo.js` (spatial) or create `src/lib/<name>.js`

### Adding a new data source
- **Static village data:** Add to `src/data/blocks.js`
- **Dynamic data:** Add Supabase RPC call via `supabase.rpc("function_name", args)`

### CSS Conventions
- Mobile-first: base styles target mobile, `@media (min-width: 641px)` for desktop
- CSS variables: defined in `:root` in `app.css` — use for colors, shadows, transitions
- New overlay: add `.{name}-overlay`, `.{name}-modal`, `.{name}-icon-wrapper`, `.{name}-title`, `.{name}-tagalog`, `.{name}-btn` classes

### Import conventions
```js
// React hooks (always from react)
import { useState, useEffect, useRef, startTransition } from "react";

// Framer Motion (always use m.* instead of motion.*)
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";

// Local paths (no @ alias in .js files — use relative)
import { getDistance } from "../lib/geo";

// Assets (Vite handles URL resolution)
import destinationMarkerImg from "../assets/default-marker.png";
```

---

## Common Pitfalls

| Pitfall | Solution |
|---|---|
| Map not visible on iOS | Check `-webkit-fill-available` fallback in CSS |
| GPS permission denied silently | Verify `GeolocateControl.trigger()` called from user gesture |
| Compass not working on iOS | Confirm `DeviceOrientationEvent.requestPermission()` was called |
| Route not appearing | Check OSRM call in Network tab, verify both lat/lng are non-null |
| Map labels missing | Check `demotiles.maplibre.org` connection (glyphs server) |
| `__APP_VERSION__` undefined | Only injected by Vite build — not available in raw HTML/tests |
| Supabase 401 error | Check `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` env var |
| Blank screen on deploy | Check CSP in `index.html` allows all required origins |
| Animation jank | Verify `MotionConfig reducedMotion="user"` is wrapping overlays |

---

## Code Quality

### ESLint (enforced on every commit via `build:netlify`)
- React hooks rules (`eslint-plugin-react-hooks`)
- React refresh compatibility (`eslint-plugin-react-refresh`)
- Run: `bun run lint` / auto-fix: `bun run lint:fix`

### Prettier
- Run: `bun run format` / check: `bun run format:check`
- Config: `.prettierrc.json`

### React Compiler (babel-plugin-react-compiler)
- Auto-memoizes components and hooks (React 19 feature)
- **Do NOT manually add `useMemo`, `useCallback`, `React.memo`** — the compiler handles this
- If compiler complains: check for side effects in render path

---

## Versioning & Releases

Version follows semver (`package.json` → `version`):
- `bun run release:patch` → 2.2.3 → 2.2.4 (bug fixes)
- `bun run release:minor` → 2.2.3 → 2.3.0 (new features)
- `bun run release:major` → 2.2.3 → 3.0.0 (breaking changes)

Each release command: `npm version <type> && git push && git push --tags`

The version string is injected into the GPS permission overlay via `__APP_VERSION__` (Vite define).
