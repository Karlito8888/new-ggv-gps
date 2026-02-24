# Technology Stack — MyGGV GPS

> Generated: 2026-02-24 | Scan: exhaustive | Mode: full_rescan

## Summary

| Attribute | Value |
|---|---|
| **Project** | MyGGV GPS (new-ggv-gps) |
| **Version** | 2.2.3 |
| **Type** | Web SPA (Single Page Application) |
| **Architecture** | State Machine + Hook Composition |
| **Language** | JavaScript/JSX (ES2020+) |
| **Runtime** | Browser (Chrome Android + Safari iOS) |

---

## Technology Table

### Core Runtime

| Category | Technology | Version | Justification |
|---|---|---|---|
| UI Framework | React | 19.2.3 | Component model, hooks, `startTransition` for concurrent rendering |
| DOM Renderer | react-dom | 19.2.3 | Required React runtime renderer |
| Mapping | MapLibre GL JS | 5.15.0 | Native map rendering, GeoJSON, GPS tracking via GeolocateControl |
| Animation | Framer Motion | 12.23.26 | Overlay transitions (LazyMotion for code-split animations) |
| Backend | @supabase/supabase-js | 2.88.0 | Blocks/lots data via RPC (lazy-loaded proxy) |
| Tile support | pmtiles + protomaps-themes-base | 4.4.0 / 4.5.0 | Optional offline tile support |

### Build & Tooling

| Category | Technology | Version | Justification |
|---|---|---|---|
| Bundler | Vite | 7.3.0 | Fast HMR, code splitting, chunk optimization |
| Package manager | Bun | ≥ 1.0 | Faster installs, `bun run` scripts |
| JSX Transform | @vitejs/plugin-react | 5.1.2 | React JSX + Babel integration |
| Compiler | babel-plugin-react-compiler | 1.0.0 | React 19 auto-memoization (replaces useMemo/useCallback) |
| Linter | ESLint | 9.39.2 | Flat config, react-hooks + react-refresh plugins |
| Formatter | Prettier | 3.4.2 | Consistent code style |
| TypeScript types | @types/react + @types/react-dom | 19.2.7 / 19.2.3 | IDE support only (no TS compilation) |

### External Services

| Service | Purpose | Endpoint | Fallback |
|---|---|---|---|
| OpenFreeMap | Map tiles + style | `tiles.openfreemap.org/styles/liberty` | None (required) |
| MapLibre demotiles | Font glyphs (PBF) | `demotiles.maplibre.org/font/...` | None (map labels fail) |
| OSRM | Walking route calculation | `router.project-osrm.org/route/v1/foot/...` | ORS → Direct line |
| OpenRouteService | Routing fallback level 2 | `api.openrouteservice.org/v2/directions/...` | Direct line |
| Supabase | Blocks/lots data via RPC | `VITE_SUPABASE_URL` env var | Static `blocks.js` (labels only) |

### Deployment

| Category | Technology | Config |
|---|---|---|
| Hosting | Netlify | `netlify.toml` |
| Build command | `bun run build:netlify` | ESLint + Vite build |
| Output | `dist/` | Vite build output |
| SPA routing | Netlify redirects | `/* → /index.html` (status 200) |
| CDN caching | Netlify headers | `/assets/*`, `/icons/*`, `/markers/*` → 1 year immutable |
| PWA | Service Worker (`sw.js`) | Registered in `main.jsx`, optional enhancement |

---

## Architecture Pattern

**State Machine SPA** — A radically simplified single-file architecture following the KISS principle:

```
Navigation States (navState):
  gps-permission
       ↓ GPS granted
    welcome
       ↓ destination selected
  orientation-permission
       ↓ compass granted (or skipped on Android)
    navigating ←── route recalc (moved > 30m)
       ↓ < 12m from destination
    arrived   ─── Exit Village ──→ navigating (exit coords)
       ↓ (exit type destination)
  exit-complete
```

**Hook composition model:**

```
App.jsx (state machine)
  ├── useMapSetup()     → map instance, GPS tracking, GeolocateControl
  ├── useRouting()      → OSRM/ORS/direct route + step parsing
  └── useNavigation()   → distance remaining, arrival detection (pure computation)
```

---

## Code Metrics

| Metric | Value |
|---|---|
| Total source files | 13 (excl. assets) |
| Core LOC | ~2,800 |
| App.jsx | 993 LOC (main component + 6 inline overlays) |
| useMapSetup.js | 254 LOC |
| useRouting.js | 374 LOC |
| useNavigation.js | 34 LOC (pure computation, no effects) |
| geo.js | 174 LOC (Haversine, route projection) |
| blocks.js | 797 LOC (village polygon data) |
| app.css | 1,341 LOC |

---

## Bundle Chunks (Production)

| Chunk | Libraries | Est. size (gzipped) |
|---|---|---|
| `index` | React entry + App + hooks | ~121 KB |
| `vendor` | react + react-dom | included in index |
| `maps` | maplibre-gl (lazy) | ~264 KB |
| `supabase` | @supabase/supabase-js (lazy) | ~50 KB |
| `animations` | framer-motion (lazy) | ~30 KB |

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Yes | Supabase anon/publishable key |
| `VITE_OPENROUTE_API_KEY` | No | ORS routing fallback (level 2) |

> Variables are Vite-specific (prefixed `VITE_`), inlined at build time.

---

## Browser Compatibility

| Browser | Support | Notes |
|---|---|---|
| Chrome (Android) | Primary | `deviceorientationabsolute` event, standard geolocation |
| Safari (iOS 13+) | Primary | `DeviceOrientationEvent.requestPermission()` required, `webkitCompassHeading` |
| Desktop Chrome/Firefox | Partial | No GPS/compass (development use only) |

**Critical compatibility patterns implemented:**
- `100dvh` / `100svh` / `-webkit-fill-available` viewport height cascade
- `font-size: 16px !important` on inputs (prevents iOS Safari zoom-on-focus)
- Platform detection for orientation: iOS → `deviceorientation` + `webkitCompassHeading`, Android → `deviceorientationabsolute` + `(360 - alpha)`
- `maxBounds` on MapLibre to restrict tile loading to village area
