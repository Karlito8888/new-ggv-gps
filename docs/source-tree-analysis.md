# Source Tree Analysis — MyGGV GPS

> Generated: 2026-02-24 | Scan: exhaustive | Mode: full_rescan

---

## Annotated Directory Tree

```
new-ggv-gps/                          # Project root
│
├── src/                              # ★ ALL application source code
│   ├── App.jsx                       # ★ ENTRY: Main component (993 LOC)
│   │                                 #   - 6-state navigation state machine
│   │                                 #   - Hook composition (useMapSetup, useRouting, useNavigation)
│   │                                 #   - All 6 inline overlay components
│   │                                 #   - Map + orientation event handlers
│   │
│   ├── main.jsx                      # ★ ENTRY: JS entry point (14 LOC)
│   │                                 #   - Service Worker registration
│   │                                 #   - createRoot().render(<App />)
│   │
│   ├── hooks/                        # Custom React hooks (3 total)
│   │   ├── useMapSetup.js            # ★ Map initialization + GPS (254 LOC)
│   │   │                             #   - Dynamic import of MapLibre GL
│   │   │                             #   - GeolocateControl (GPS tracking)
│   │   │                             #   - Block label layer rendering
│   │   │                             #   - Destination marker management
│   │   ├── useRouting.js             # ★ Route calculation + step parsing (374 LOC)
│   │   │                             #   - OSRM → ORS → Direct line cascade
│   │   │                             #   - Exponential backoff retry (10s/30s/60s)
│   │   │                             #   - OSRM step parsing (turn icons)
│   │   │                             #   - 30m movement threshold + 500ms debounce
│   │   └── useNavigation.js          # Distance/arrival computation (34 LOC)
│   │                                 #   - Pure function: no effects, no state
│   │                                 #   - Haversine distance to destination
│   │                                 #   - Arrival at < 12m threshold
│   │
│   ├── data/
│   │   └── blocks.js                 # Village polygon data (797 LOC)
│   │                                 #   - Static GeoJSON-compatible coords
│   │                                 #   - Used for map labels only (not navigation)
│   │
│   ├── lib/
│   │   ├── geo.js                    # ★ Geospatial utilities (174 LOC)
│   │   │                             #   - getDistance() Haversine formula
│   │   │                             #   - projectPointOnLine() — nearest point on polyline
│   │   │                             #   - getDistanceAlongRoute() — distance to next step
│   │   └── supabase.js               # Supabase lazy-load proxy (59 LOC)
│   │                                 #   - Lazy import on first use
│   │                                 #   - Proxy object: supabase.rpc(), supabase.from()
│   │
│   ├── styles/
│   │   ├── app.css                   # ★ Main stylesheet (1,341 LOC)
│   │   │                             #   - CSS variables, reset, typography
│   │   │                             #   - All overlay/modal styles (mobile-first)
│   │   │                             #   - Navigation overlay, compass, map controls
│   │   │                             #   - Responsive breakpoint at 641px
│   │   ├── fonts.css                 # Self-hosted font declarations
│   │   └── maplibre-gl.css           # MapLibre GL default styles (local copy)
│   │
│   └── assets/
│       ├── default-marker.png        # Destination pin icon (used by MapLibre symbol layer)
│       └── img/
│           └── ggv.png               # GGV logo (top-center of app)
│
├── public/                           # Static assets (served as-is by Vite)
│   ├── manifest.json                 # PWA Web App Manifest
│   ├── sw.js                         # Service Worker (optional PWA caching)
│   ├── robots.txt                    # SEO robots directives
│   ├── sitemap.xml                   # SEO sitemap
│   ├── _headers                      # Netlify headers (redundant with netlify.toml)
│   ├── _redirects                    # Netlify SPA redirect fallback
│   ├── fonts/
│   │   └── madimi-one-latin.woff2    # Self-hosted font (preloaded in index.html)
│   └── icons/                        # PWA icons (multiple sizes)
│       ├── icon-16x16.png
│       ├── icon-32x32.png
│       ├── icon-144x144.png
│       ├── icon-180x180.png
│       └── icon-512x512.png
│
├── docs/                             # ★ AI-readable project documentation
│   ├── index.md                      # Master documentation index
│   ├── technology-stack.md           # Tech stack + architecture pattern
│   ├── code-analysis.md              # API contracts, data models, state, components
│   ├── source-tree-analysis.md       # This file
│   ├── development-guide.md          # Dev setup, commands, workflows
│   ├── architecture.md               # Architecture document
│   ├── project-overview.md           # Executive summary
│   ├── component-inventory.md        # UI component catalog
│   ├── deployment-guide.md           # Netlify deployment guide
│   └── api-contracts.md              # External API reference
│
├── _bmad/                            # BMAD workflow system (AI dev tooling)
│   ├── core/                         # Workflow engine
│   └── bmm/                          # Project-specific BMAD config + workflows
│
├── _bmad-output/                     # BMAD workflow outputs (planning artifacts)
│
├── index.html                        # ★ HTML shell + CSP + PWA meta + preload hints
├── vite.config.js                    # Vite bundler config (chunks, define, plugins)
├── package.json                      # NPM manifest (deps, scripts, engines)
├── netlify.toml                      # ★ Netlify deploy config (build, redirects, headers)
├── eslint.config.js                  # ESLint flat config (v9)
├── .prettierrc.json                  # Prettier config
├── .env.example                      # Environment variable template
├── CLAUDE.md                         # ★ AI dev guide (source of truth for architecture)
├── AGENTS.md                         # AI agent instructions
└── README.md                         # Public project readme
```

---

## Critical Directories

| Directory | Importance | Description |
|---|---|---|
| `src/` | ★★★ | All application logic — start here |
| `src/hooks/` | ★★★ | Core business logic in 3 hooks |
| `src/lib/geo.js` | ★★★ | Spatial math — Haversine + route projection |
| `src/App.jsx` | ★★★ | State machine + all UI overlays |
| `public/` | ★★ | Static PWA assets, SW, icons |
| `docs/` | ★★ | AI-readable documentation (this folder) |
| `netlify.toml` | ★★ | Deployment + security headers |
| `index.html` | ★★ | CSP, PWA meta, resource preloads |
| `_bmad/` | ★ | Dev tooling only (not app code) |

---

## Data Flow Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              App.jsx                     │
                    │  navState machine (6 states)             │
                    │  ┌──────────────────────────────────┐   │
                    │  │ useMapSetup(containerRef)        │   │
                    │  │   → map, userLocation, isMapReady│   │
                    │  └──────────────────────────────────┘   │
                    │  ┌──────────────────────────────────┐   │
                    │  │ useRouting(map, userLoc, dest)   │   │
                    │  │   → routeGeoJSON, steps, source  │   │
                    │  └──────────────────────────────────┘   │
                    │  ┌──────────────────────────────────┐   │
                    │  │ useNavigation(map, userLoc, dest) │   │
                    │  │   → distanceRemaining, hasArrived │   │
                    │  └──────────────────────────────────┘   │
                    └─────────────────────────────────────────┘
                              ↕                    ↕
                    External APIs              Supabase
                    (OSRM, ORS,               (blocks, lots
                    OpenFreeMap)               via RPC)
```

---

## Integration Points

| Integration | File | Direction | Protocol |
|---|---|---|---|
| MapLibre tile server | `useMapSetup.js` | Outbound | HTTPS fetch (style JSON + raster tiles) |
| MapLibre font server | `useMapSetup.js` | Outbound | HTTPS fetch (PBF glyphs) |
| OSRM routing | `useRouting.js` | Outbound | REST GET |
| ORS routing | `useRouting.js` | Outbound | REST GET + API key |
| Supabase get_blocks | `App.jsx` | Outbound | Supabase JS SDK (RPC) |
| Supabase get_lots_by_block | `WelcomeOverlay` | Outbound | Supabase JS SDK (RPC) |
| Device GPS | `useMapSetup.js` | Inbound | Browser Geolocation API via GeolocateControl |
| Device orientation | `App.jsx` | Inbound | `deviceorientation` / `deviceorientationabsolute` events |
| Haptic feedback | `App.jsx` | Outbound | `navigator.vibrate()` (Android only) |
| Service Worker | `main.jsx` | Register | `navigator.serviceWorker.register("/sw.js")` |

---

## File Size Summary

| File | LOC | Role |
|---|---|---|
| `src/App.jsx` | 993 | Main component + all overlays |
| `src/styles/app.css` | 1,341 | Complete stylesheet |
| `src/data/blocks.js` | 797 | Static village data |
| `src/hooks/useRouting.js` | 374 | Route calculation |
| `src/hooks/useMapSetup.js` | 254 | Map initialization |
| `src/lib/geo.js` | 174 | Spatial math |
| `src/lib/supabase.js` | 59 | DB client proxy |
| `src/hooks/useNavigation.js` | 34 | Arrival detection |
| `src/main.jsx` | 14 | App entry point |
| **Total** | **~4,040** | |
