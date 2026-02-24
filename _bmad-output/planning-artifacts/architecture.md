---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/project-context.md
  - docs/index.md
  - docs/technology-stack.md
  - docs/code-analysis.md
  - docs/source-tree-analysis.md
  - docs/development-guide.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-02-20'
project_name: 'new-ggv-gps'
user_name: 'Charles'
date: '2026-02-19'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
40 FRs across 8 categories:
- Map Display & Interaction (FR1-FR7): Interactive MapLibre map with GPS, heading, block/lot visualization
- Destination Selection (FR8-FR11): Block → lot drill-down, data store loading
- Navigation & Routing (FR12-FR19): OSRM routing, deviation detection (>25m), arrival detection (<15m), cascading fallback
- Device Permissions (FR20-FR22): GPS + iOS orientation permission flows with retry/re-enable
- Offline & Performance — NEW Phase 1 (FR23-FR29): Workbox SW precaching, self-hosted style/fonts, tile precaching, stale-while-revalidate data
- PWA Experience — NEW Phase 1 (FR30-FR32): Add to Home Screen, standalone display, auto-update cache
- Village Exit (FR33-FR34): Exit navigation to village gate
- Analytics — NEW Phase 3 (FR35-FR37): Anonymous session recording, admin usage views
- Admin & Data Management (FR38-FR40): Block/lot CRUD via admin interface

**Non-Functional Requirements:**
21 NFRs across 3 categories:
- Performance (NFR1-NFR9): First paint <3s, interactive map <5s (3G), <2s (cached), <1.5s (installed PWA), route calc <3s, main bundle <150KB, maps chunk <300KB, memory <150MB
- Reliability & Offline (NFR10-NFR15): Full offline map after first visit, offline navigation with cached route, SW update resilience, data freshness via stale-while-revalidate, crash recovery to GPS permission flow
- Integration Resilience (NFR16-NFR21): Graceful degradation for OSRM, Supabase, tile server, font server, style server, and total network loss

**Scale & Complexity:**
- Primary domain: PWA mobile-first with cartography and GPS
- Complexity level: Low-Medium (no auth, no compliance, no multi-tenancy, but hard performance and offline constraints)
- Estimated architectural components: ~15 (SW, map style hosting, font hosting, tile caching, 6 overlay components, 3 hooks, routing service, analytics service, build pipeline, deployment config)

### Technical Constraints & Dependencies

**Brownfield constraints (existing production app v2.2.3):**
- 1,000+ active users — zero-downtime migration required
- Each phase must ship independently and leave app in working state
- Current architecture: 7 files, 3 hooks, inline overlays, native MapLibre, simple useState
- No React Router, no Context/Redux, no Turf.js — KISS philosophy must be preserved

**External service dependencies:**
- OSRM (router.project-osrm.org) — free routing, public API, no auth, 3s timeout
- Supabase — block/lot data via RPC, anonymous analytics storage
- OpenFreeMap — map tile source (to be self-hosted in Phase 1)
- MapLibre GL — core mapping library (native API, no wrappers)

**Target device constraints:**
- Budget Android smartphones (Vivo, Samsung A-series), 3G cellular
- Chrome Android primary (~80%), Safari iOS 13+ secondary (~15%)
- Low RAM, slow CPU, intermittent connectivity
- Portrait-locked, one-handed touch operation

**Hosting migration:**
- Current: Netlify free tier (CDN, SPA redirect, security headers)
- Target: Hostinger paid plan (requires manual configuration of equivalent features)

### Cross-Cutting Concerns Identified

1. **Caching strategy (Workbox SW)** — Affects all static assets, map resources, API responses, and data freshness. Must coordinate CacheFirst, NetworkFirst, and StaleWhileRevalidate strategies across different asset types.

2. **Network resilience & fallback cascade** — Every external dependency must have a fallback: OSRM → direct line, Supabase → cached blocks, tiles → cached tiles, fonts → cached fonts. Architecture must make fallback behavior transparent and testable.

3. **Self-hosted map assets** — Style.json, fonts (.pbf glyphs), and village tiles must be served locally. Impacts build pipeline (asset bundling/copying), deployment (file hosting), and cache strategy (precache at SW install).

4. **Performance budget enforcement** — Every architectural decision must be evaluated against NFR targets (<150KB main, <300KB maps, <5s 3G first load). Bundle splitting, lazy loading, and tree-shaking are architectural requirements, not optimizations.

5. **Bilingual UI (English + Tagalog)** — All user-facing text in both languages. Affects every overlay component. Must be maintainable without a full i18n library (inline translations by convention).

6. **Phase isolation** — Each of the 4 phases must be independently deployable. Architecture decisions in Phase 1 must not create dependencies that block Phase 2+ or require Phase 2 to be complete.

## Starter Template Evaluation

### Primary Technology Domain

PWA mobile-first with cartography and GPS — brownfield refactoring of an existing React/Vite production app.

### Starter Options Considered

**Option A: Incremental Enhancement (Selected)**
Keep existing project structure. Add tools per phase via `bun add`. Zero scaffold, zero migration risk.

**Option B: Vite React-TS Scaffold as Reference**
Create reference project for config patterns. Not a replacement — reference only.

**Option C: Full Scaffold Migration (Rejected)**
Create new Vite project and migrate code. Too risky for production brownfield with 1,000+ users. Contradicts KISS philosophy.

### Selected Approach: Incremental Enhancement

**Rationale:**
- Brownfield project with 1,000+ active users — zero-disruption is mandatory
- KISS philosophy requires minimal structural changes
- Each phase adds exactly the dependencies it needs
- Every addition is independently deployable and reversible
- No scaffold provides value over the existing 7-file architecture

**Phase 1 Additions:**
```bash
bun add -d vite-plugin-pwa
```

**Phase 2 Additions:**
```bash
bun add -d typescript@5.9.3 @types/react @types/react-dom
```

**Phase 3 Additions:**
```bash
bun add -d vitest @testing-library/react @testing-library/jest-dom
```

### Architectural Decisions from Approach

**Language & Runtime:**
- Phase 1: JavaScript (JSX) — no changes
- Phase 2: TypeScript 5.9.3 strict mode, rename .js→.ts, .jsx→.tsx, add tsconfig.json
- Build target: esnext (existing Vite config)

**PWA & Service Worker:**
- vite-plugin-pwa 1.2.0 with Workbox 7.4.0
- Strategy: `injectManifest` mode (custom SW required for complex caching strategies per asset type)
- Precaching: All Vite-built assets + self-hosted map style + fonts
- Runtime caching: OSRM (NetworkFirst), Supabase (StaleWhileRevalidate), tiles (CacheFirst)

**Styling Solution:**
- No change — CSS custom properties (design tokens) + native CSS
- Zero CSS framework dependencies

**Build Tooling:**
- Vite 7.3.0 (existing) — no change
- vite-plugin-pwa integrates directly into vite.config.js
- Bun as package manager and script runner

**Testing Framework (Phase 3):**
- Vitest 4.0.x — Vite-native, shares Vite config, zero additional bundler setup
- @testing-library/react for component testing
- Focus: pure functions (geo.ts) and critical hook behavior

**Code Organization:**
- Phase 1: 7 files + SW source file (8 files total)
- Phase 2: 7 files restructured to ~12 files (6 extracted overlays + reduced App.tsx)
- Hooks, lib, data directories unchanged

**Development Experience:**
- Existing: Vite HMR, ESLint, Bun scripts
- Phase 1 adds: PWA dev mode (vite-plugin-pwa dev support)
- Phase 2 adds: TypeScript type-checking in IDE and build
- Phase 3 adds: `bun run test` via Vitest

**Note:** No project initialization command needed — this is a brownfield enhancement, not a new project creation.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Workbox caching strategy per asset type (Phase 1 blocker)
- PMTiles for self-hosted village tiles (Phase 1 blocker)
- Overlay component extraction pattern (Phase 2 blocker)
- Hostinger hosting configuration (Phase 1 blocker)

**Important Decisions (Shape Architecture):**
- Service Worker source file location and structure
- Navigation overlay refactor to floating pills (Phase 2)
- CI/CD pipeline design (Phase 3)
- Security header replication on Hostinger

**Deferred Decisions (Post-MVP):**
- Analytics storage schema (Phase 3)
- Admin interface architecture (Phase 4)
- Scaling strategy (not needed at current scale)

### Data Architecture

**Decision 1.1: Block/Lot Data Sourcing — Keep Dual Approach (No Change)**
- **Decision:** Maintain current dual-source architecture
- **Rationale:** Supabase RPC and `blocks.js` serve fundamentally different purposes:
  - `blocks.js` — GeoJSON polygons for rendering block numbers on the map (visual display layer)
  - Supabase RPC — Block/lot selection data for the welcome form drill-down (data interaction layer)
- **Affects:** No components — this is an explicit no-change decision
- **Version:** Supabase JS 2.88.0 (existing)

**Decision 1.2: Self-Hosted Village Tiles — PMTiles**
- **Decision:** Single PMTiles archive for village tiles (z12–z18)
- **Rationale:** Single file is simpler to deploy, cache, and version than z/x/y directory structure. PMTiles 4.4.0 already in dependencies. HTTP range requests allow efficient tile extraction without server-side processing.
- **Affects:** Build pipeline (tile generation), SW precaching, Hostinger deployment
- **Version:** pmtiles 4.4.0 + protomaps-themes-base 4.5.0 (existing)
- **Implementation:**
  - Village PMTiles file served as static asset from `/tiles/ggv.pmtiles`
  - Style.json references PMTiles source via `pmtiles://` protocol
  - SW precaches the entire PMTiles file at install time (~5–15 MB for z12–z18 of village area)

**Decision 1.3: Workbox Caching Strategy Matrix**
- **Decision:** Five-tier caching strategy aligned to asset lifecycle:

| Asset Type | Strategy | Rationale |
|---|---|---|
| Vite build assets (`/assets/*`) | **Precache** (SW install) | Content-hashed, immutable, must be available offline |
| Map style.json + fonts (.pbf) | **CacheFirst** (24h expiry) | Rarely change, critical for offline map rendering |
| Village PMTiles | **CacheFirst** (7d expiry) | Large file, changes only on village data update |
| Supabase RPC responses | **StaleWhileRevalidate** (1h) | Block/lot data needs freshness but offline fallback |
| OSRM routing API | **NetworkFirst** (3s timeout) | Real-time routing must use network when available, fall back to cached route |
| Analytics (Supabase insert) | **NetworkOnly + BackgroundSync** | Fire-and-forget, queue offline, retry when online |

- **Affects:** SW source file, vite-plugin-pwa config, all external service interactions
- **Version:** Workbox 7.4.0 via vite-plugin-pwa 1.2.0

### Authentication & Security

**Decision 2.1: No Authentication — Confirmed**
- **Decision:** No user authentication. App is a public navigation tool.
- **Rationale:** Zero auth complexity aligns with KISS philosophy. No user data stored. Analytics are anonymous.
- **Affects:** All phases — simplifies every architectural decision

**Decision 2.2: Supabase Anonymous Key — Client-Side**
- **Decision:** Keep `VITE_SUPABASE_ANON_KEY` as client-side env variable inlined at build time
- **Rationale:** Anon key is designed for client-side use with Row Level Security (RLS). No secrets to protect. Supabase RLS policies restrict operations to read-only for public data.
- **Affects:** Build pipeline (env var injection), Supabase RLS configuration

**Decision 2.3: Security Headers — Replicate Netlify Configuration**
- **Decision:** Replicate existing Netlify security headers on Hostinger via `.htaccess` or server config:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `X-XSS-Protection: 1; mode=block`
  - `Permissions-Policy: geolocation=(self)` — critical for GPS functionality
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **Rationale:** Maintain security posture during hosting migration. These headers are currently enforced by `netlify.toml`.
- **Affects:** Hostinger server configuration (Phase 1)

### API & Communication Patterns

**Decision 3.1: OSRM Public API — Keep Current**
- **Decision:** Continue using `router.project-osrm.org` public API
- **Rationale:** Free, fast, no auth required. 3s timeout with direct-line fallback provides resilience. Self-hosting OSRM is unnecessary complexity for current scale.
- **Affects:** useRouting hook, SW caching (NetworkFirst strategy)
- **Fallback chain:** OSRM API → cached route → direct line to destination

**Decision 3.2: Supabase RPC — Keep Current**
- **Decision:** Continue using Supabase RPC for block/lot selection data
- **Rationale:** Existing pattern works. StaleWhileRevalidate caching ensures offline availability with background freshness checks.
- **Affects:** Welcome overlay data loading, SW caching

**Decision 3.3: Analytics via Supabase Insert**
- **Decision:** Anonymous analytics stored via `supabase.from('analytics').insert()` calls
- **Rationale:** Reuses existing Supabase infrastructure. No additional service needed. NetworkOnly + BackgroundSync ensures no data loss during offline sessions.
- **Affects:** Phase 3 implementation, Supabase table schema, SW BackgroundSync configuration

### Frontend Architecture

**Decision 4.1: Component Extraction — One File Per Overlay**
- **Decision:** Extract 6 inline overlays from App.jsx into individual files in `src/components/`:

```
src/components/
├── GpsPermissionOverlay.jsx    → .tsx in Phase 2
├── WelcomeOverlay.jsx          → .tsx in Phase 2
├── OrientationOverlay.jsx      → .tsx in Phase 2
├── NavigationOverlay.jsx       → .tsx in Phase 2
├── ArrivedOverlay.jsx          → .tsx in Phase 2
└── ExitCompleteOverlay.jsx     → .tsx in Phase 2
```

- **Rationale:** Reduces App.jsx from ~1,055 LOC to ~200 LOC (state machine + conditional rendering only). Each overlay is self-contained with its own bilingual text, animations, and event handlers. Simplifies TypeScript migration in Phase 2 (type one file at a time).
- **Phase:** Phase 2 (component extraction happens during TypeScript migration)
- **Affects:** App.jsx, build output (6 new chunks or tree-shaken into existing)

**Decision 4.2: Service Worker Source File**
- **Decision:** SW source at `src/sw.js` (Phase 1), renamed to `src/sw.ts` (Phase 2)
- **Rationale:** Co-located with app source. `injectManifest` mode requires a custom SW source that Workbox enhances with precache manifest injection. Single file contains all caching strategy registrations.
- **Affects:** vite-plugin-pwa config (`swSrc` option), build pipeline

**Decision 4.3: Navigation Overlay Refactor — Phase 2 Floating Pills**
- **Decision:** Refactor NavigationOverlay from full-screen modal to floating pill components in Phase 2:
  - `NavTopPill` — Bearing/distance indicator with glass-morphism (top of screen)
  - `NavBottomStrip` — Next turn instruction + arrival info (bottom of screen)
- **Rationale:** UX Design Specification Direction 3 (Floating Navigation Elements) provides better map visibility during active navigation. Full-screen overlay from Direction 1 reserved for gate screens (permission, welcome, arrived, exit). This hybrid approach uses the best pattern for each screen type.
- **Phase:** Phase 2 (requires component extraction first)
- **Affects:** NavigationOverlay component, CSS design tokens, App.jsx rendering logic

### Infrastructure & Deployment

**Decision 5.1: Hostinger Hosting**
- **Decision:** Migrate from Netlify free tier to Hostinger paid hosting
- **Requirements for Hostinger plan:**
  - Static file serving with SPA redirect (`index.html` fallback for all routes)
  - Custom `.htaccess` support for security headers and cache control
  - HTTP/2 support for PMTiles range requests
  - SSL/TLS certificate (Let's Encrypt or included)
  - Sufficient storage for PMTiles asset (~5–15 MB) + build output
- **Rationale:** Netlify free tier has bandwidth/build limits. Hostinger provides cost-effective hosting with manual configuration.
- **Affects:** Deployment workflow, security headers, cache configuration, SPA redirect

**Decision 5.2: Deployment Method — GitHub Actions**
- **Decision:** Automated deployment via GitHub Actions (Phase 3)
  - Phase 1: Manual deployment (FTP/SSH upload of `dist/` folder)
  - Phase 3: GitHub Actions CI/CD pipeline
- **Rationale:** Manual deployment is acceptable for Phase 1 (low frequency). GitHub Actions automates the full pipeline once tests exist (Phase 3).
- **Pipeline (Phase 3):**
  ```
  push to main → lint → typecheck → test → build → deploy to Hostinger
  ```
- **Affects:** `.github/workflows/` configuration, Hostinger deployment credentials as GitHub secrets

**Decision 5.3: Environment Configuration**
- **Decision:** Continue using Vite env variables (`VITE_` prefix) inlined at build time
- **Rationale:** No server-side runtime. All config is build-time. Netlify → Hostinger migration doesn't change this pattern.
- **Affects:** Build pipeline only

### Decision Impact Analysis

**Implementation Sequence:**
1. Workbox caching strategy + SW source file (Phase 1 — enables offline)
2. PMTiles self-hosting + style/font hosting (Phase 1 — enables offline map)
3. Hostinger migration + security headers (Phase 1 — new hosting)
4. Component extraction (Phase 2 — enables TypeScript per-file migration)
5. Navigation overlay refactor to floating pills (Phase 2 — UX improvement)
6. TypeScript migration (Phase 2 — type safety)
7. CI/CD pipeline (Phase 3 — automation)
8. Analytics implementation (Phase 3 — data collection)

**Cross-Component Dependencies:**
- SW caching strategy ↔ PMTiles hosting: CacheFirst strategy must be configured for the PMTiles URL pattern
- Component extraction ↔ TypeScript: Extraction creates the file boundaries needed for incremental .tsx migration
- Navigation refactor ↔ Component extraction: Floating pills require NavigationOverlay to be its own component first
- CI/CD pipeline ↔ Hostinger: GitHub Actions needs deployment credentials and target configuration
- Security headers ↔ Hostinger: Must be configured before DNS cutover from Netlify

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
12 areas where AI agents could make different implementation choices, grouped into 5 categories relevant to this PWA navigation app.

### Naming Patterns

**File & Directory Naming:**
- Component files: `PascalCase.jsx` / `PascalCase.tsx` (e.g., `WelcomeOverlay.jsx`)
- Hook files: `camelCase.js` / `camelCase.ts` (e.g., `useRouting.js`)
- Utility files: `camelCase.js` / `camelCase.ts` (e.g., `geo.js`)
- Data files: `camelCase.js` / `camelCase.ts` (e.g., `blocks.js`)
- CSS files: `kebab-case.css` (e.g., `design-tokens.css`)
- Static assets: `kebab-case` (e.g., `ggv-village.pmtiles`, `marker-block.svg`)
- Test files: `*.test.ts` / `*.test.tsx` co-located with source (Phase 3)

**Component & Function Naming:**
- React components: `PascalCase` (e.g., `GpsPermissionOverlay`, `NavTopPill`)
- Hooks: `use` + `PascalCase` (e.g., `useMapSetup`, `useRouting`, `useNavigation`)
- Event handlers in JSX: `on` + `Action` (e.g., `onGrant`, `onSelectDestination`, `onReset`)
- Handler functions: `handle` + `Action` (e.g., `handleGpsGrant`, `handleBlockSelect`)
- Boolean state: `is` / `has` prefix (e.g., `isMapReady`, `hasArrived`, `isCalculating`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEVIATION_THRESHOLD_M`, `ARRIVAL_THRESHOLD_M`)

**MapLibre Source & Layer IDs:**
- Source IDs: `kebab-case` (e.g., `route-remaining`, `block-polygons`, `lot-markers`)
- Layer IDs: `{source}-{type}` pattern (e.g., `route-remaining-line`, `block-polygons-fill`, `block-polygons-outline`)
- No numeric suffixes or generated IDs — all MapLibre sources/layers must have human-readable, stable IDs
- Marker class names: `marker-{type}` (e.g., `marker-block`, `marker-destination`)

**CSS Custom Properties (Design Tokens):**
- Namespace: `--ggv-{category}-{name}` (e.g., `--ggv-color-primary`, `--ggv-spacing-md`, `--ggv-radius-pill`)
- Categories: `color`, `spacing`, `radius`, `font`, `shadow`, `z`, `timing`
- No raw values in component CSS — always reference tokens
- Glass-morphism token: `--ggv-glass-bg` for backdrop-filter panels

### Structure Patterns

**Project Organization (Target Phase 2):**

```
src/
├── App.tsx                        # State machine + conditional rendering (~200 LOC)
├── main.tsx                       # Entry point (Theme + App only)
├── sw.ts                          # Service Worker source (Workbox strategies)
├── components/
│   ├── GpsPermissionOverlay.tsx   # Gate screen overlay
│   ├── WelcomeOverlay.tsx         # Gate screen overlay
│   ├── OrientationOverlay.tsx     # Gate screen overlay
│   ├── NavigationOverlay.tsx      # Floating pills container
│   ├── ArrivedOverlay.tsx         # Gate screen overlay
│   └── ExitCompleteOverlay.tsx    # Gate screen overlay
├── hooks/
│   ├── useMapSetup.ts             # Map init + GPS + GeolocateControl
│   ├── useRouting.ts              # OSRM routing + deviation detection
│   └── useNavigation.ts           # Turn-by-turn + arrival detection
├── data/
│   └── blocks.ts                  # Village block polygons (GeoJSON)
├── lib/
│   ├── geo.ts                     # Spatial utility functions
│   └── supabase.ts                # Supabase client (lazy-loaded)
└── __tests__/                     # Phase 3: test files
    ├── geo.test.ts                # Pure function tests
    ├── useRouting.test.ts         # Hook behavior tests
    └── useNavigation.test.ts      # Hook behavior tests
```

**Rules:**
- Components go in `src/components/` — one file per overlay, no subdirectories
- Hooks stay in `src/hooks/` — one file per hook
- No `utils/`, `helpers/`, `services/` directories — if a utility is needed, add it to `src/lib/`
- No barrel files (`index.ts`) — direct imports only
- Test files in `src/__tests__/` (not co-located) to keep source directory clean
- Static map assets in `public/` directory: `public/tiles/`, `public/fonts/`, `public/style/`

**Static Asset Organization:**

```
public/
├── tiles/
│   └── ggv.pmtiles              # Village PMTiles archive
├── fonts/
│   └── {font-family}/           # Self-hosted .pbf glyph files
├── style/
│   └── style.json               # Self-hosted map style
├── icons/                       # PWA icons (existing)
└── markers/                     # Map marker SVGs (existing)
```

### Format Patterns

**Coordinate Conventions (Critical — Most Common Bug Source):**
- GeoJSON: `[longitude, latitude]` — always. This is the GeoJSON standard.
- User location objects from GPS: `{latitude, longitude}` — the Web Geolocation API standard.
- When converting: always use explicit variable names `lng` / `lat`, never `x` / `y`
- Function signatures: always document parameter order in JSDoc/TSDoc

```typescript
// ✅ CORRECT — explicit naming
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number

// ✅ CORRECT — GeoJSON coordinate
const destination: [number, number] = [120.9513, 14.3479] // [lng, lat]

// ❌ WRONG — ambiguous naming
function getDistance(p1x: number, p1y: number, p2x: number, p2y: number): number
```

**Navigation State Machine Values:**
- State values are lowercase kebab-case strings: `'gps-permission'`, `'welcome'`, `'orientation-permission'`, `'navigating'`, `'arrived'`, `'exit-complete'`
- New states (if ever added) must follow the same pattern
- State transitions are explicit — no implicit state changes via side effects

**Bilingual Text Pattern:**
- Primary language: English (always first)
- Secondary: Tagalog in parentheses or as subtitle
- Pattern A (inline): `"Enable GPS to navigate • I-enable ang GPS para mag-navigate"`
- Pattern B (subtitle): `<h1>Enable Location</h1><p className="tagalog">(I-enable ang Lokasyon)</p>`
- All user-facing text must have both languages — no English-only strings in overlays
- Error messages: English only (technical, not user-facing in overlays)

**Distance & Threshold Values:**
- All distances in meters (never kilometers in code)
- All thresholds defined as named constants, never magic numbers:

```typescript
const DEVIATION_THRESHOLD_M = 25    // Route deviation triggers recalculation
const ARRIVAL_THRESHOLD_M = 15      // Close enough to destination
const RECALC_DEBOUNCE_MS = 10_000   // Minimum time between route recalculations
const OSRM_TIMEOUT_MS = 3_000       // OSRM API request timeout
const DEVIATION_CHECK_INTERVAL_MS = 5_000  // How often to check deviation
```

### Communication Patterns

**Hook Return Shape Convention:**
- All hooks return a single object (not positional array)
- Object shape is documented in JSDoc/TSDoc above the hook
- Boolean flags: `is` prefix for ongoing states, `has` prefix for completed states

```typescript
// ✅ CORRECT — object return with named properties
const { map, userLocation, isMapReady, setMapStyle } = useMapSetup(containerRef)

// ❌ WRONG — positional array return
const [map, userLocation, isMapReady] = useMapSetup(containerRef)
```

**MapLibre API Usage:**
- Always use native `map.addSource()`, `map.addLayer()`, `map.getSource().setData()`
- Never wrap MapLibre in a React component abstraction
- Always check `map.isStyleLoaded()` before adding sources/layers
- Use `map.once('load', ...)` for initialization, not `map.on('load', ...)`
- Camera control: always use `map.flyTo()` with explicit options (bearing, pitch, zoom, duration)

**State Updates in App.jsx:**
- `navState` is the single source of truth for which overlay is visible
- All state transitions go through `setNavState('new-state')`
- Props flow down from App.jsx to overlays — no context, no callbacks modifying parent state except via passed handlers
- No overlay should import or access another overlay's state

### Process Patterns

**Error Handling:**
- External API errors (OSRM, Supabase): catch silently, fall back to cached/fallback, log to console in dev
- GPS errors: show user-facing message in bilingual format via the permission overlay
- MapLibre errors: catch in hook, set error state, render fallback UI
- Never throw unhandled promises — all async operations must have `.catch()` or try/catch
- No global error boundary needed (simple app, errors are localized per hook)

```typescript
// ✅ CORRECT — graceful fallback
try {
  const route = await fetchOSRMRoute(origin, destination)
  setRouteGeoJSON(route)
} catch {
  console.warn('OSRM failed, falling back to direct line')
  setRouteGeoJSON(createDirectLine(origin, destination))
}

// ❌ WRONG — error thrown to user
const route = await fetchOSRMRoute(origin, destination) // unhandled rejection
```

**Loading States:**
- Use boolean flags in hook return objects: `isCalculating`, `isMapReady`, `isLoading`
- Show loading indicators in the overlay that owns the operation
- Map loading: show nothing until `isMapReady` is true (map container handles its own loading)
- Route loading: `isCalculating` flag in useRouting prevents UI interaction during calculation

**Offline Behavior:**
- Offline detection: `navigator.onLine` + `online`/`offline` events
- Behavior: app continues to work with cached data — no "you are offline" modal
- Route recalculation when offline: use cached route or direct line — no error to user
- Supabase RPC when offline: SW returns cached response (StaleWhileRevalidate) — transparent to app code
- The app should never show a "connection lost" message — offline is the expected state

**Service Worker Patterns:**
- SW source file uses Workbox `registerRoute()` for each strategy
- Precache manifest injected by vite-plugin-pwa (do not manually list files)
- Runtime caching routes use URL pattern matching (RegExp or string)
- BackgroundSync for analytics: queue name `analytics-queue`
- SW update: `skipWaiting()` + `clientsClaim()` for immediate activation

### Enforcement Guidelines

**All AI Agents MUST:**
1. Follow coordinate convention: `[lng, lat]` for GeoJSON, `{latitude, longitude}` for GPS objects — verify every coordinate usage
2. Use named constants for all thresholds — zero magic numbers
3. Return objects from hooks, never arrays
4. Include bilingual text (EN + Tagalog) for all user-facing strings
5. Use native MapLibre API only — no wrapper abstractions
6. Handle all async errors with fallback behavior — no unhandled rejections
7. Use `--ggv-*` CSS custom properties — no raw color/spacing values
8. Keep all overlay components self-contained — no cross-overlay imports or state sharing
9. Follow file naming exactly: `PascalCase` for components, `camelCase` for hooks/libs
10. Test on real mobile device before considering any GPS/orientation feature complete

**Pattern Verification (Phase 3):**
- ESLint rules enforce naming conventions
- TypeScript strict mode catches type mismatches (Phase 2+)
- Vitest tests verify hook return shapes and threshold values (Phase 3)
- PR review checklist includes bilingual text check and coordinate convention check

### Pattern Examples

**Good Examples:**

```typescript
// Hook with correct return shape, named constants, error handling
const DEVIATION_THRESHOLD_M = 25

export function useRouting(map, origin, destination) {
  const [routeGeoJSON, setRouteGeoJSON] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // GeoJSON coordinates: [lng, lat]
  const originCoord = [origin.longitude, origin.latitude]

  return { routeGeoJSON, distance, duration, isCalculating, error }
}
```

```jsx
// Bilingual overlay text
<div className="overlay-content">
  <h2>You have arrived!</h2>
  <p className="tagalog">(Nakarating ka na!)</p>
</div>
```

```css
/* Design tokens usage */
.nav-pill {
  background: var(--ggv-glass-bg);
  border-radius: var(--ggv-radius-pill);
  padding: var(--ggv-spacing-sm) var(--ggv-spacing-md);
  box-shadow: var(--ggv-shadow-pill);
}
```

**Anti-Patterns:**

```typescript
// ❌ Magic numbers
if (distance > 25) recalculate()  // What is 25? Meters? Feet?

// ❌ Wrong coordinate order
map.flyTo({ center: [14.3479, 120.9513] })  // lat,lng instead of lng,lat!

// ❌ Array return from hook
return [map, location, true]  // What is true? No way to know without reading source

// ❌ English-only user text
<p>Enable GPS</p>  // Missing Tagalog translation

// ❌ Raw CSS values
.button { color: #4285F4; padding: 12px; }  // Should use tokens

// ❌ Swallowed error without fallback
try { await fetchRoute() } catch {}  // Error silently ignored, no fallback
```

## Project Structure & Boundaries

### Complete Project Directory Structure

**Current State (v2.2.3) → Phase-by-Phase Evolution:**

Annotations: `[existing]` = already exists, `[P1]` = added in Phase 1, `[P2]` = added in Phase 2, `[P3]` = added in Phase 3

```
new-ggv-gps/
├── .env                                    [existing] Supabase keys (build-time only)
├── .env.example                            [existing] Template for env vars
├── .gitignore                              [existing]
├── bun.lock                                [existing]
├── CLAUDE.md                               [existing] AI agent instructions
├── eslint.config.js → .ts [P2]            [existing] ESLint flat config
├── index.html                              [existing] SPA entry point
├── netlify.toml                            [existing] Remove after Hostinger migration [P1]
├── package.json                            [existing] Scripts + dependencies
├── README.md                               [existing]
├── tsconfig.json                           [P2]      TypeScript strict config
├── vite.config.js → .ts [P2]              [existing] Vite + PWA plugin config
│
├── .github/
│   └── workflows/
│       └── deploy.yml                      [P3]      CI/CD: lint → typecheck → test → build → deploy
│
├── public/
│   ├── _headers                            [existing] Netlify headers → remove [P1]
│   ├── _redirects                          [existing] Netlify redirects → remove [P1]
│   ├── manifest.json                       [existing] PWA manifest (update icons/theme) [P1]
│   ├── robots.txt                          [existing]
│   ├── sitemap.xml                         [existing]
│   ├── .htaccess                           [P1]      Hostinger: SPA redirect + security headers + cache
│   ├── fonts/
│   │   ├── madimi-one-latin.woff2          [existing] App UI font
│   │   └── madimi-one-latin-ext.woff2      [existing] App UI font
│   ├── icons/
│   │   ├── icon-{size}.png                 [existing] PWA icons (16→512px)
│   │   └── icon-{size}.webp                [existing] PWA icons (16→512px)
│   ├── map-fonts/                          [P1]      Self-hosted .pbf glyph files
│   │   └── {font-stack}/
│   │       └── {range}.pbf                 [P1]      e.g., 0-255.pbf, 256-511.pbf
│   ├── style/
│   │   └── style.json                      [P1]      Self-hosted map style
│   └── tiles/
│       └── ggv.pmtiles                     [P1]      Village tile archive (z12–z18)
│
├── src/
│   ├── App.jsx → .tsx [P2]                 [existing] State machine (~200 LOC after P2 extraction)
│   ├── main.jsx → .tsx [P2]               [existing] Entry point (Theme + App)
│   ├── sw.js → .ts [P2]                   [P1]      Workbox SW source (injectManifest)
│   │
│   ├── assets/
│   │   ├── default-marker.png              [existing] Map marker image
│   │   └── img/
│   │       └── ggv.png                     [existing] Village logo
│   │
│   ├── components/                         [P2]      Extracted overlay components
│   │   ├── GpsPermissionOverlay.tsx        [P2]      GPS permission gate screen
│   │   ├── WelcomeOverlay.tsx              [P2]      Destination selection gate screen
│   │   ├── OrientationOverlay.tsx          [P2]      Device orientation gate screen
│   │   ├── NavigationOverlay.tsx           [P2]      Active navigation (floating pills)
│   │   ├── ArrivedOverlay.tsx              [P2]      Arrival confirmation gate screen
│   │   └── ExitCompleteOverlay.tsx         [P2]      Village exit gate screen
│   │
│   ├── data/
│   │   └── blocks.js → .ts [P2]           [existing] Village block GeoJSON polygons
│   │
│   ├── hooks/
│   │   ├── useMapSetup.js → .ts [P2]      [existing] Map init + GPS + GeolocateControl
│   │   ├── useRouting.js → .ts [P2]       [existing] OSRM routing + deviation detection
│   │   └── useNavigation.js → .ts [P2]    [existing] Turn-by-turn + arrival detection
│   │
│   ├── lib/
│   │   ├── geo.js → .ts [P2]              [existing] Spatial utility functions (Haversine, etc.)
│   │   └── supabase.js → .ts [P2]         [existing] Supabase client (lazy-loaded)
│   │
│   ├── styles/
│   │   ├── app.css                         [existing] Main app styles
│   │   ├── design-tokens.css               [P2]      CSS custom properties (--ggv-*)
│   │   ├── fonts.css                       [existing] @font-face declarations
│   │   └── maplibre-gl.css                 [existing] MapLibre GL styles
│   │
│   └── __tests__/                          [P3]      Test suite
│       ├── geo.test.ts                     [P3]      Pure function tests (distances, projections)
│       ├── useRouting.test.ts              [P3]      Routing hook behavior tests
│       └── useNavigation.test.ts           [P3]      Navigation hook behavior tests
│
└── dist/                                   [build]   Vite production output (not committed)
    ├── index.html
    ├── sw.js                               [P1]      Compiled Service Worker
    ├── assets/
    │   ├── index-{hash}.js                            Main bundle (<150KB gzipped)
    │   ├── maps-{hash}.js                             MapLibre chunk (<300KB gzipped, lazy)
    │   ├── supabase-{hash}.js                         Supabase chunk (lazy)
    │   ├── animations-{hash}.js                       Framer Motion chunk (lazy)
    │   └── *.css                                      CSS chunks
    └── [public/ files copied as-is]
```

**File Count Evolution:**

| Phase | JS/TS Source | CSS | Config | Public Assets | Tests | Total Source |
|-------|-------------|-----|--------|---------------|-------|-------------|
| Current (v2.2.3) | 7 | 3 | 4 | ~26 | 0 | 10 |
| Phase 1 | 8 (+sw.js) | 3 | 4 | ~30 (+tiles, style, map-fonts) | 0 | 11 |
| Phase 2 | 14 (+6 components) | 4 (+tokens) | 5 (+tsconfig) | ~30 | 0 | 18 |
| Phase 3 | 14 | 4 | 6 (+deploy.yml) | ~30 | 3 | 21 |

### Architectural Boundaries

**API Boundaries (External Services):**

```
┌─────────────────────────────────────────────────┐
│                   Browser (PWA)                  │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │useRouting│  │  App.jsx  │  │  useMapSetup │  │
│  │          │  │(Supabase) │  │              │  │
│  └────┬─────┘  └─────┬────┘  └──────┬───────┘  │
│       │              │               │           │
│  ─────┼──────────────┼───────────────┼───────── │
│  SW   │              │               │    SW     │
│  Layer│ NetworkFirst  │ StaleWhile    │ CacheFirst│
│       │              │ Revalidate    │           │
└───────┼──────────────┼───────────────┼───────────┘
        │              │               │
        ▼              ▼               ▼
   ┌─────────┐   ┌──────────┐   ┌───────────┐
   │  OSRM   │   │ Supabase │   │ Self-hosted│
   │  Public  │   │   RPC    │   │ Tiles/Style│
   │   API    │   │          │   │  /Fonts    │
   └─────────┘   └──────────┘   └───────────┘
   3s timeout     Anon key        /public/*
   → direct line  → cached data   → precached
```

| Boundary | Source File | External Service | SW Strategy | Fallback |
|----------|------------|-----------------|-------------|----------|
| Routing | `useRouting.ts` | `router.project-osrm.org/route/v1/` | NetworkFirst (3s) | Cached route → direct line |
| Block/Lot data | `App.tsx` (WelcomeOverlay) | Supabase RPC | StaleWhileRevalidate (1h) | Cached response |
| Map tiles | `useMapSetup.ts` | Self-hosted `/tiles/ggv.pmtiles` | CacheFirst (7d) | Cached tiles |
| Map style | `useMapSetup.ts` | Self-hosted `/style/style.json` | CacheFirst (24h) | Cached style |
| Map fonts | `useMapSetup.ts` | Self-hosted `/map-fonts/*/` | CacheFirst (24h) | Cached glyphs |
| Analytics | `App.tsx` | Supabase insert | NetworkOnly + BackgroundSync | Queued offline |

**Component Boundaries:**

```
App.tsx (State Machine Owner)
│
├── navState: 'gps-permission'
│   └── <GpsPermissionOverlay onGrant={handleGpsGrant} />
│       Props IN: onGrant callback
│       Props OUT: none (calls onGrant when GPS granted)
│
├── navState: 'welcome'
│   └── <WelcomeOverlay onSelectDestination={handleSelectDest} />
│       Props IN: onSelectDestination callback, block/lot data
│       Props OUT: none (calls onSelectDestination with {block, lot, coords})
│
├── navState: 'orientation-permission'
│   └── <OrientationOverlay onGrant={handleOrientationGrant} />
│       Props IN: onGrant callback
│       Props OUT: none (calls onGrant when orientation granted)
│
├── navState: 'navigating'
│   └── <NavigationOverlay bearing={...} distance={...} nextTurn={...} />
│       Props IN: bearing, distanceRemaining, nextTurn, onCancel, onExit
│       Props OUT: none (reads only)
│
├── navState: 'arrived'
│   └── <ArrivedOverlay onReset={handleReset} destination={...} />
│       Props IN: onReset callback, destination info
│       Props OUT: none (calls onReset)
│
└── navState: 'exit-complete'
    └── <ExitCompleteOverlay onReset={handleReset} />
        Props IN: onReset callback
        Props OUT: none (calls onReset)
```

**Rules:**
- App.tsx is the only component that manages `navState`
- Overlays receive data via props — no hook calls inside overlays for shared state
- Each overlay can have its own local `useState` for UI state (animations, form inputs)
- Hooks are called only in App.tsx — overlays are pure display + callback components
- No overlay imports another overlay

**Data Boundaries:**

| Data Source | Access Point | Scope | Mutability |
|------------|-------------|-------|-----------|
| `blocks.ts` | `useMapSetup` (map display) | Map layer only | Read-only (static GeoJSON) |
| Supabase RPC | `WelcomeOverlay` (via props) | Form selection only | Read-only (cached) |
| GPS position | `useMapSetup` → `userLocation` | Shared via App.tsx props | Real-time updates |
| Route GeoJSON | `useRouting` → `routeGeoJSON` | Map display + navigation calc | Recalculated on deviation |
| Navigation data | `useNavigation` → bearing, distance | NavigationOverlay display | Derived from GPS + route |

### Requirements to Structure Mapping

**FR Category → File Mapping:**

| FR Category | Primary Files | Phase |
|------------|--------------|-------|
| Map Display (FR1-FR7) | `useMapSetup.ts`, `blocks.ts` | Existing |
| Destination Selection (FR8-FR11) | `WelcomeOverlay.tsx`, App.tsx | P2 (extraction) |
| Navigation & Routing (FR12-FR19) | `useRouting.ts`, `useNavigation.ts`, `NavigationOverlay.tsx` | Existing + P2 |
| Device Permissions (FR20-FR22) | `GpsPermissionOverlay.tsx`, `OrientationOverlay.tsx` | P2 (extraction) |
| Offline & Performance (FR23-FR29) | `sw.ts`, `vite.config.ts`, `public/tiles/`, `public/style/`, `public/map-fonts/` | P1 |
| PWA Experience (FR30-FR32) | `sw.ts`, `manifest.json`, `vite.config.ts` | P1 |
| Village Exit (FR33-FR34) | `ExitCompleteOverlay.tsx`, `useRouting.ts` | P2 (extraction) |
| Analytics (FR35-FR37) | `App.tsx` (event calls), `supabase.ts`, `sw.ts` (BackgroundSync) | P3 |
| Admin & Data (FR38-FR40) | Deferred to Phase 4 | P4 |

**Cross-Cutting Concerns → File Mapping:**

| Concern | Files Affected |
|---------|---------------|
| Bilingual UI (EN + Tagalog) | All 6 overlay components |
| Offline resilience | `sw.ts`, all hooks (fallback logic) |
| Performance budget | `vite.config.ts` (splitting), `sw.ts` (precaching) |
| CSS design tokens | `design-tokens.css`, all component CSS |
| Coordinate convention | `geo.ts`, `useRouting.ts`, `useNavigation.ts`, `useMapSetup.ts`, `blocks.ts` |

### Integration Points

**Internal Communication (Hook → Component Data Flow):**

```
useMapSetup(containerRef)
    ├── map              → useRouting(map, ...) + useNavigation(map, ...)
    ├── userLocation     → useRouting(..., origin, ...) + useNavigation(..., userLocation, ...)
    ├── isMapReady       → App.tsx (controls GPS button enable)
    └── setMapStyle      → App.tsx (style toggle button)

useRouting(map, userLocation, destination)
    ├── routeGeoJSON     → useNavigation(..., routeGeoJSON, ...) + map display
    ├── distance         → NavigationOverlay props
    ├── duration         → NavigationOverlay props
    └── isCalculating    → NavigationOverlay props (loading state)

useNavigation(map, userLocation, routeGeoJSON, destination)
    ├── bearing          → NavigationOverlay props
    ├── distanceRemaining → NavigationOverlay props
    ├── nextTurn         → NavigationOverlay props
    └── hasArrived       → App.tsx (triggers navState → 'arrived')
```

**External Integrations:**

| Service | Integration File | Method | Auth |
|---------|-----------------|--------|------|
| OSRM | `useRouting.ts` | `fetch()` GET | None (public) |
| Supabase | `supabase.ts` → `App.tsx` | `supabase.rpc()` / `.from().insert()` | Anon key (build-time) |
| OpenFreeMap tiles | `useMapSetup.ts` via style.json | MapLibre tile loader | None |
| Self-hosted PMTiles | `useMapSetup.ts` via PMTiles protocol | `pmtiles` JS library | None |

### Development Workflow Integration

**Development Server (Phase 1+):**
```bash
bun run dev     # Vite dev server + PWA dev mode
                # HMR for all src/ files
                # SW available in dev via vite-plugin-pwa devOptions
                # Local network access for mobile testing
```

**Build Process:**
```bash
bun run build   # 1. Vite transforms JSX/TSX → JS
                # 2. Code splitting: vendor, maps, supabase, animations chunks
                # 3. vite-plugin-pwa injects precache manifest into sw.js
                # 4. CSS split into separate cacheable files
                # 5. Console logs + debugger stripped
                # 6. Output → dist/
```

**Build Output Structure:**
- `dist/index.html` — SPA entry with hashed asset references
- `dist/sw.js` — Compiled Service Worker (not content-hashed, SW URL must be stable)
- `dist/assets/` — Content-hashed JS/CSS chunks (cache-busted by hash)
- `dist/tiles/`, `dist/style/`, `dist/map-fonts/` — Copied from `public/` (not hashed)
- `dist/icons/`, `dist/fonts/` — Copied from `public/` (not hashed)

**Deployment (Phase 1 → Phase 3):**
- Phase 1: `bun run build` → FTP/SSH upload `dist/` to Hostinger
- Phase 3: `git push main` → GitHub Actions → auto-deploy to Hostinger

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility: PASS**
- vite-plugin-pwa 1.2.0 + Workbox 7.4.0 + Vite 7.3.0 — fully compatible (vite-plugin-pwa wraps Workbox for Vite)
- PMTiles 4.4.0 + MapLibre GL 5.15.0 — compatible (pmtiles provides MapLibre protocol adapter)
- React 19.2.3 + TypeScript 5.9.3 — compatible (@types/react supports React 19)
- Vitest 4.0.x + Vite 7.3.0 — compatible (Vitest is Vite-native, shares config)
- Framer Motion 12.x + React 19 — compatible
- No version conflicts or incompatibilities detected

**Pattern Consistency: PASS**
- Naming: PascalCase components, camelCase hooks/libs, kebab-case CSS/assets — consistent with React ecosystem
- MapLibre IDs: kebab-case `{source}-{type}` pattern — consistent with MapLibre conventions
- CSS tokens: `--ggv-*` namespace — consistent and collision-free
- Hook returns: all objects with `is`/`has` boolean prefixes — consistent across 3 hooks
- State machine: kebab-case string values — consistent naming

**Structure Alignment: PASS**
- `src/components/` supports Phase 2 overlay extraction decision
- `src/sw.js` supports Phase 1 injectManifest decision
- `public/tiles/`, `public/style/`, `public/map-fonts/` support self-hosting decision
- `src/__tests__/` supports Phase 3 testing decision
- `.github/workflows/` supports Phase 3 CI/CD decision
- No structural conflicts with architectural decisions

### Requirements Coverage Validation

**Functional Requirements Coverage: 40/40 FRs COVERED**

| FR Category | FRs | Status | Architectural Support |
|-------------|-----|--------|----------------------|
| Map Display & Interaction | FR1-FR7 | COVERED | `useMapSetup.ts`, `blocks.ts`, PMTiles, self-hosted style |
| Destination Selection | FR8-FR11 | COVERED | `WelcomeOverlay.tsx`, Supabase RPC (StaleWhileRevalidate) |
| Navigation & Routing | FR12-FR19 | COVERED | `useRouting.ts`, `useNavigation.ts`, `NavigationOverlay.tsx`, OSRM fallback chain |
| Device Permissions | FR20-FR22 | COVERED | `GpsPermissionOverlay.tsx`, `OrientationOverlay.tsx` |
| Offline & Performance | FR23-FR29 | COVERED | `sw.ts` (Workbox strategies), PMTiles, self-hosted fonts/style |
| PWA Experience | FR30-FR32 | COVERED | `manifest.json`, `sw.ts`, vite-plugin-pwa |
| Village Exit | FR33-FR34 | COVERED | `ExitCompleteOverlay.tsx`, `useRouting.ts` (village gate coords) |
| Analytics | FR35-FR37 | COVERED | Supabase insert + BackgroundSync (Phase 3) |
| Admin & Data | FR38-FR40 | DEFERRED | Phase 4 — architecturally unblocked, no Phase 1-3 dependency |

**Non-Functional Requirements Coverage: 21/21 NFRs COVERED**

| NFR Category | NFRs | Status | Architectural Support |
|-------------|------|--------|----------------------|
| Performance | NFR1-NFR9 | COVERED | Bundle splitting (<150KB main, <300KB maps), lazy loading (maps, supabase, animations), SW precaching, CacheFirst for tiles/style |
| Reliability & Offline | NFR10-NFR15 | COVERED | 5-tier Workbox caching, PMTiles precaching, StaleWhileRevalidate data, skipWaiting + clientsClaim for SW update |
| Integration Resilience | NFR16-NFR21 | COVERED | Every external service has defined fallback: OSRM→cached→direct line, Supabase→cached, tiles→cached, fonts→cached, style→cached, total offline→all cached |

### Implementation Readiness Validation

**Decision Completeness: PASS**
- 14 explicit decisions documented across 5 categories
- All decisions include version numbers where applicable
- Rationale documented for every decision
- Affected components listed for each decision
- Implementation sequence and cross-dependencies mapped

**Structure Completeness: PASS**
- Complete file tree with phase annotations
- All 4 phases represented with specific file additions
- Build output structure documented
- Static asset organization fully specified

**Pattern Completeness: PASS**
- 10 mandatory enforcement rules for AI agents
- Good examples AND anti-patterns provided for each pattern category
- Coordinate convention (most common bug source) extensively documented
- Bilingual text patterns with concrete examples

### Gap Analysis Results

**Critical Gaps: NONE**

No blocking gaps identified. All critical architectural decisions are documented.

**Important Gaps (3 items — non-blocking, addressable during implementation):**

1. **Existing `public/sw.js` migration path**: The current `public/sw.js` (simple Service Worker) must be removed in Phase 1 when replaced by Workbox-generated SW from `src/sw.js`. The build output `dist/sw.js` supersedes it. Implementation note: delete `public/sw.js` when adding `src/sw.js`.

2. **PMTiles generation process**: The architecture specifies PMTiles at `/tiles/ggv.pmtiles` but doesn't detail how to generate it from OpenFreeMap tile data. This is a build/tooling task, not an architectural decision. Implementation note: use `tippecanoe` or `pmtiles` CLI to extract village bounding box tiles from OpenFreeMap.

3. **`manifest.json` update scope**: The existing `public/manifest.json` needs updating for Phase 1 PWA capabilities (theme_color, background_color, display: standalone, updated icons). Not an architectural gap — it's a Phase 1 implementation task.

**Deferred Gaps (accepted):**

4. **Analytics table schema** (Phase 3): No schema defined yet. Acceptable — will be designed when implementing FR35-FR37.

5. **Admin interface architecture** (Phase 4): No decisions made. Acceptable — Phase 4 is deliberately deferred and architecturally independent.

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed (40 FRs, 21 NFRs, 4 phases)
- [x] Scale and complexity assessed (Low-Medium, 1,000+ users)
- [x] Technical constraints identified (brownfield, target devices, 3G, KISS)
- [x] Cross-cutting concerns mapped (6 concerns → file mappings)

**Architectural Decisions**
- [x] Critical decisions documented with versions (14 decisions)
- [x] Technology stack fully specified (all versions verified via web search)
- [x] Integration patterns defined (5-tier caching, fallback cascade)
- [x] Performance considerations addressed (bundle budget, lazy loading, SW precaching)

**Implementation Patterns**
- [x] Naming conventions established (files, components, MapLibre IDs, CSS tokens)
- [x] Structure patterns defined (project tree, static assets)
- [x] Communication patterns specified (hook returns, state management, MapLibre API)
- [x] Process patterns documented (error handling, loading, offline, SW)

**Project Structure**
- [x] Complete directory structure defined (all 4 phases)
- [x] Component boundaries established (App.tsx owns state, overlays are pure)
- [x] Integration points mapped (hook→component data flow, external services)
- [x] Requirements to structure mapping complete (FR→file table)

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level:** HIGH

All 40 FRs and 21 NFRs are architecturally supported. No critical gaps. Technology versions verified. Implementation patterns comprehensive with examples and anti-patterns.

**Key Strengths:**
- KISS philosophy preserved throughout — no unnecessary abstractions or tooling
- Phase isolation is clean — each phase is independently deployable
- Offline-first architecture with 5-tier caching covers every external dependency
- Component boundaries are simple and enforceable (App.tsx owns state, overlays are pure)
- Coordinate convention (most common GPS bug source) is extensively documented
- Brownfield constraints respected — zero-disruption migration path

**Areas for Future Enhancement:**
- Phase 4 admin interface will need its own architectural decisions when scoped
- Analytics schema design (Phase 3) may introduce Supabase migration patterns
- If user base grows beyond 5,000+, consider CDN for PMTiles (currently self-hosted on Hostinger)
- Performance monitoring tooling (Lighthouse CI, Web Vitals) could be added to Phase 3 CI/CD

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- When in doubt about a pattern, check the "Enforcement Guidelines" section
- Coordinate conventions are critical — verify every `[lng, lat]` vs `{latitude, longitude}` usage

**First Implementation Priority (Phase 1):**
1. `bun add -d vite-plugin-pwa` — add PWA plugin dependency
2. Create `src/sw.js` with Workbox caching strategies
3. Configure vite-plugin-pwa in `vite.config.js` (injectManifest mode)
4. Self-host map style → `public/style/style.json`
5. Self-host map fonts → `public/map-fonts/`
6. Generate and add PMTiles → `public/tiles/ggv.pmtiles`
7. Delete `public/sw.js` (replaced by Workbox-generated SW)
8. Update `public/manifest.json` for PWA capabilities
9. Create `public/.htaccess` for Hostinger (SPA redirect + security headers)
10. Remove Netlify-specific files (`netlify.toml`, `public/_headers`, `public/_redirects`)
