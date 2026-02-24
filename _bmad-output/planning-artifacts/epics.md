---
stepsCompleted:
  - "step-01-validate-prerequisites"
  - "step-02-design-epics"
  - "step-03-create-stories"
  - "step-04-final-validation"
status: "complete"
completedAt: "2026-02-24"
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/project-context.md
  - docs/technology-stack.md
  - docs/code-analysis.md
  - docs/development-guide.md
  - docs/architecture.md
  - docs/component-inventory.md
  - docs/deployment-guide.md
  - docs/api-contracts.md
  - docs/project-overview.md
---

# new-ggv-gps - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for MyGGV GPS, decomposing the requirements from the PRD, UX Design Specification, and Architecture Decision Document into implementable stories organized by user value and delivery phase.

## Requirements Inventory

### Functional Requirements

**Map Display & Interaction**

FR1: Users can view an interactive map of Garden Grove Village with labeled blocks and lots
FR2: Users can pan, zoom, and interact with the map on touch devices
FR3: Users can see their real-time GPS position on the map
FR4: Users can see their heading direction on the map (compass)
~~FR5: Users can switch between OSM and satellite map styles~~ *[REMOVED — map style is fixed per UX spec]*
FR6: The system displays block polygon boundaries with distinct visual styling
FR7: The system displays lot markers within each block

**Destination Selection**

FR8: Users can select a destination block from a list of all village blocks
FR9: Users can select a specific lot within a chosen block
FR10: The system loads block and lot data from the data store at startup
FR11: The system displays the selected destination on the map

**Navigation & Routing**

FR12: The system calculates a route from the user's GPS position to the selected destination
FR13: The system displays the calculated route as a visual line on the map
FR14: The system provides turn-by-turn navigation instructions
FR15: The system detects when the user deviates >25m from the route and automatically recalculates
FR16: The system detects arrival when the user is within 15m of the destination
FR17: The system falls back to a direct line when route calculation fails (network error)
FR18: Users can follow a compass bearing toward their destination
FR19: The system animates the camera to follow the user during navigation

**Device Permissions**

FR20: The system requests GPS permission and guides the user through the grant flow
FR21: The system requests device orientation permission on iOS 13+ devices
FR22: The system detects previously-denied GPS permission and displays a re-enable prompt with instructions to open device settings

**Offline & Performance (NEW — Phase 1)**

FR23: The system precaches all critical static assets (JS, CSS, HTML) via offline caching on first visit
FR24: The system serves the map style from local self-hosted files (no external fetch required)
FR25: The system serves map fonts from local self-hosted files (no external fetch required)
FR26: The system background-precaches village map tiles at navigation-relevant zoom levels after first visit
FR27: The system displays the full village map offline after initial caching is complete
FR28: The system serves cached block/lot data when the data store is unreachable
FR29: The system serves cached data immediately and refreshes in background when connectivity returns

**PWA Experience (NEW — Phase 1)**

FR30: Residents can install the app to their home screen (Add to Home Screen)
FR31: The system displays a standalone PWA experience when launched from home screen
FR32: The system auto-updates its offline cache on new version deployment without user intervention

**Village Exit Flow**

FR33: Users can initiate a navigation to the village exit
FR34: The system guides users to the village exit point and confirms departure

**Analytics & Monitoring (NEW — Phase 3)**

FR35: The system records anonymous navigation sessions to the analytics store (timestamp, destination block/lot)
FR36: Charles (admin) can view daily, weekly, monthly, and yearly visitor counts
FR37: Charles (admin) can view which blocks and lots are most requested

**Admin & Data Management**

FR38: Charles (admin) can add, update, or remove block data via the admin interface
FR39: Charles (admin) can add, update, or remove lot data via the admin interface
FR40: The system reflects data store changes on next app load without code deployment

### NonFunctional Requirements

**Performance**

NFR1: First paint on 3G < 3s (measured via Chrome DevTools Slow 3G throttle)
NFR2: Interactive map on 3G (first visit) < 5s (measured via Chrome DevTools Slow 3G throttle)
NFR3: Interactive map (cached) < 2s (measured via Chrome DevTools offline mode)
NFR4: Interactive map (installed PWA) < 1.5s (measured on real device from home screen)
NFR5: Route calculation (OSRM API response) < 3s (measured via Network tab timing)
NFR6: JS bundle size (main chunk, gzipped) < 150 KB
NFR7: JS bundle size (maps chunk, gzipped, lazy-loaded) < 300 KB
NFR8: Peak RAM during navigation < 150 MB
NFR9: GPS position update frequency every 1-3s (device-dependent)

**Reliability & Offline**

NFR10: Village map fully available offline after first visit — all tiles z12-z18 within village bounds cached
NFR11: Turn-by-turn navigation continues offline if route was calculated while online
NFR12: New Service Worker version activates immediately without requiring page reload during navigation
NFR13: Serve cached block/lot data immediately on load, refresh from backend in background when online
NFR14: App recovers from unexpected state — reload resets to GPS permission flow, no stuck states
NFR15: No user-facing data to lose — GPS is ephemeral, no user accounts, no server-side saved state

**Integration Resilience**

NFR16: OSRM down → fall back to direct line (bearing to destination)
NFR17: Supabase API down → serve cached blocks/lots from Service Worker cache
NFR18: Tile server down → serve cached tiles from Service Worker cache (village bounds precached)
NFR19: Font server not applicable after Phase 1 — fonts self-hosted, no external dependency
NFR20: Style server not applicable after Phase 1 — style self-hosted, no external dependency
NFR21: Total network loss → full offline navigation with cached map, tiles, blocks, and last-known route

### Additional Requirements

**From Architecture Decision Document:**

- Incremental enhancement approach: no project scaffold or migration — add dependencies per phase via `bun add`
- Phase 1 dependency: `vite-plugin-pwa` (Workbox 7.4.0, `injectManifest` mode with custom SW source at `src/sw.js`)
- PMTiles single-archive for village tiles (z12-z18): single file `public/tiles/ggv.pmtiles`, served via HTTP range requests
- Five-tier Workbox caching strategy: Precache (Vite assets), CacheFirst (style.json + fonts), CacheFirst (PMTiles, 7d), StaleWhileRevalidate (Supabase RPC, 1h), NetworkFirst (OSRM, 3s timeout)
- Self-hosted map assets in `public/` directory: `public/tiles/ggv.pmtiles`, `public/fonts/{family}/`, `public/style/style.json`
- Analytics via Supabase `analytics` table insert with BackgroundSync queue (`analytics-queue`) for offline sessions
- Phase 2: TypeScript migration — all .js → .ts, .jsx → .tsx, `tsconfig.json` strict mode
- Phase 2: Component extraction — 6 inline overlays from App.jsx → `src/components/` (one file per overlay)
- Phase 2: NavigationOverlay refactored to floating pill components (NavTopPill + NavBottomStrip) with glass-morphism
- Phase 3: Testing with Vitest 4.0.x + @testing-library/react — focus on `geo.ts` pure functions and critical hook behavior
- Phase 3: GitHub Actions CI/CD pipeline: lint → typecheck → test → build → deploy to Hostinger
- Hostinger hosting migration (Phase 1): `.htaccess` for SPA redirect + security headers + cache-control
- All thresholds as named constants: `DEVIATION_THRESHOLD_M = 25`, `ARRIVAL_THRESHOLD_M = 15`, `RECALC_DEBOUNCE_MS = 10000`, `OSRM_TIMEOUT_MS = 3000`, `DEVIATION_CHECK_INTERVAL_MS = 5000`
- Hook return convention: objects, never arrays; all boolean flags with `is`/`has` prefix
- CSS custom properties namespace: `--ggv-{category}-{name}` for all design tokens

**From UX Design Specification:**

- Minimum touch target size: 44×44px for all interactive elements (WCAG 2.1 Level A)
- Primary CTA buttons: minimum 56px height
- Progressive loading pattern: map container visible with skeleton/spinner immediately, never a blank screen
- All user-facing strings bilingual (English primary + Tagalog in parentheses or subtitle)
- Bottom sheet overlay pattern: overlays slide up from bottom or appear as modal cards over the full-screen map
- Framer Motion `AnimatePresence` with `mode="wait"` for all overlay transitions (spring damping=25 for modals)
- Portrait-locked layout only; no desktop support required
- Design tokens in `:root` CSS block — no component library, no CSS framework
- Anti-patterns FORBIDDEN: splash screens, tutorials/onboarding, notification permission requests, rating prompts, settings screens, search functionality in block/lot selection
- Minimum 4-tap path from GPS screen to active navigation (Enable GPS → block → lot → auto-navigates)
- Silent error recovery: no error modals or toasts during navigation — route recalculates silently
- CSS viewport: `100dvh` → `100svh` → `-webkit-fill-available` cascade (all three required)
- `font-size: 16px` minimum on all inputs (prevents iOS Safari auto-zoom)

### FR Coverage Map

FR1: Epic 1 — Map display (interactive village map with labeled blocks/lots) — baseline maintained + available offline
FR2: Epic 1 — Pan/zoom touch interaction — baseline maintained
FR3: Epic 1 — Real-time GPS position on map — baseline maintained
FR4: Epic 1 — Compass heading on map — baseline maintained
~~FR5: REMOVED — map style is fixed per UX spec anti-pattern #5~~
FR6: Epic 1 — Block polygon boundaries — baseline maintained
FR7: Epic 1 — Lot markers within blocks — baseline maintained
FR8: Epic 1 — Block selection from list — baseline maintained + data cached via SW
FR9: Epic 1 — Lot selection within block — baseline maintained + data cached via SW
FR10: Epic 1 — Block/lot data loaded from data store at startup — StaleWhileRevalidate cache
FR11: Epic 1 — Selected destination displayed on map — baseline maintained
FR12: Epic 1 — Route calculation from GPS to destination — baseline maintained
FR13: Epic 1 / Epic 2 — Route displayed as visual line (Epic 1: maintained; Epic 2: floating pills UX)
FR14: Epic 1 / Epic 2 — Turn-by-turn instructions (Epic 1: maintained; Epic 2: NavBottomStrip)
FR15: Epic 1 — Deviation >25m triggers auto-recalculation — baseline maintained
FR16: Epic 1 — Arrival detection <15m — baseline maintained
FR17: Epic 1 — Fallback to direct line when routing fails — baseline maintained
FR18: Epic 1 / Epic 2 — Compass bearing to destination (Epic 1: maintained; Epic 2: NavTopPill)
FR19: Epic 1 / Epic 2 — Camera follows user during navigation (Epic 1: maintained; Epic 2: refined)
FR20: Epic 1 — GPS permission request flow — baseline maintained
FR21: Epic 1 — iOS 13+ orientation permission — baseline maintained
FR22: Epic 1 — Denied GPS detection + re-enable prompt — baseline maintained
FR23: Epic 1 — Precache all critical static assets via offline caching — NEW Phase 1
FR24: Epic 1 — Map style served from self-hosted local files — NEW Phase 1
FR25: Epic 1 — Map fonts served from self-hosted local files — NEW Phase 1
FR26: Epic 1 — Background-precache village tiles at navigation zoom levels — NEW Phase 1
FR27: Epic 1 — Full village map available offline after first visit — NEW Phase 1
FR28: Epic 1 — Cached block/lot data served when data store unreachable — NEW Phase 1
FR29: Epic 1 — Cached data served immediately, refreshed in background — NEW Phase 1
FR30: Epic 1 — Add to Home Screen (PWA install) — NEW Phase 1
FR31: Epic 1 — Standalone PWA display from home screen — NEW Phase 1
FR32: Epic 1 — Auto-update offline cache on new deployment — NEW Phase 1
FR33: Epic 1 — Village exit navigation initiation — baseline maintained
FR34: Epic 1 — Village exit guidance + departure confirmation — baseline maintained
FR35: Epic 3 — Anonymous navigation sessions recorded — NEW Phase 3
FR36: Epic 3 — Admin views daily/weekly/monthly/yearly visitor counts — NEW Phase 3
FR37: Epic 3 — Admin views most requested blocks/lots — NEW Phase 3
FR38: Epic 4 — Admin adds/updates/removes block data — Phase 4 vision
FR39: Epic 4 — Admin adds/updates/removes lot data — Phase 4 vision
FR40: Epic 4 — Data store changes reflected on next app load without code deploy — Phase 4 vision

## Epic List

### Epic 1: Navigation Offline-First & PWA Performante

Every visitor scanning the QR code at the village gate can access navigation in under 5 seconds on first visit and under 2 seconds on repeat visits — even on weak 3G or completely offline after the first load. The app installs as a PWA and auto-updates silently.

**FRs covered:** FR1-FR4, FR6-FR34 (FR1-FR4, FR6-FR22, FR33-FR34 as baseline maintained; FR23-FR32 as new offline/PWA capabilities; FR5 removed — map style is fixed)
**NFRs covered:** NFR1-NFR21 (all performance, reliability, and integration resilience targets)

### Epic 2: Architecture Propre & Migration TypeScript

Charles (developer) can maintain and extend the codebase with TypeScript type safety, modular overlay components in `src/components/`, and a refined NavigationOverlay refactored into floating pill components that expose more of the map during active navigation.

**FRs improved:** FR13, FR14, FR18, FR19 (NavigationOverlay → NavTopPill + NavBottomStrip floating pills)
**NFRs:** Code quality and maintainability (Technical Success Criteria)

### Epic 3: Analytics Usage & Pipeline Qualité

Charles (admin) can view daily, weekly, monthly, and yearly visitor counts and the most requested blocks/lots via an analytics dashboard. The codebase has a safety net of automated unit tests and a GitHub Actions CI/CD pipeline.

**FRs covered:** FR35, FR36, FR37
**NFRs:** Quality automation (lint, typecheck, test, build pipeline)

### Epic 4: Interface Admin & Gestion des Données *(Phase 4 — no timeline)*

Charles (admin) can manage block and lot data directly from within the application — without accessing the Supabase dashboard — and changes are reflected on next app load without code deployment.

**FRs covered:** FR38, FR39, FR40

---

## Epic 1: Navigation Offline-First & PWA Performante

Every visitor scanning the QR code at the village gate can access navigation in under 5 seconds on first visit and under 2 seconds on repeat visits — even on weak 3G or completely offline after the first load. The app installs as a PWA and auto-updates silently.

### Story 1.1: Self-Hosted Map Style, Glyphs & Sprites

As a visitor launching the app on a weak 3G connection,
I want the map style, fonts, and sprites to load from locally hosted files,
So that the map appears and labels are readable without any external network dependency.

**Acceptance Criteria:**

**Given** the app is loaded for the first time on any connection
**When** the MapLibre map initializes
**Then** the map style JSON is fetched from `/style/style.json` (self-hosted) instead of `tiles.openfreemap.org`
**And** all glyph (font) files are fetched from `/fonts/{fontstack}/{range}.pbf` (self-hosted) instead of `demotiles.maplibre.org`
**And** all sprite files are fetched from `/sprites/` (self-hosted) instead of any external CDN

**Given** the device has no internet connection
**When** the map initializes after a previous cached visit
**Then** the map renders with correct labels and block names without any network requests for style, glyphs, or sprites

**Given** the self-hosted style.json is in place
**When** the map initializes with the fixed OSM style
**Then** the style renders correctly with locally served glyph files and no external CDN dependency

**Given** the implementation is complete
**When** `bun run lint && bun run build` is executed
**Then** both commands pass with zero errors
**And** the self-hosted style, fonts, and sprites assets are present in the `dist/` output directory

### Story 1.2: Village PMTiles Offline Tile Hosting

As a visitor navigating inside Garden Grove Village,
I want the village map tiles to be served from the device after first visit,
So that I can see the detailed street map and building boundaries even when my mobile signal drops completely.

**Acceptance Criteria:**

**Given** a PMTiles archive has been generated for the village bounds (z12-z18) and placed at `public/tiles/ggv.pmtiles`
**When** the MapLibre map initializes
**Then** the map uses the PMTiles protocol handler to serve village tiles from `/tiles/ggv.pmtiles` via HTTP range requests
**And** no external tile CDN requests are made for the village geographic area (bounds: approximately 120.94-120.96°E, 14.34-14.36°N)

**Given** the app has been loaded at least once (PMTiles file cached by Service Worker)
**When** the device goes completely offline
**Then** the full village map renders at all zoom levels from z12 to z18 using cached tiles
**And** block boundaries and street layout are visible and navigable

**Given** a destination is selected and navigation begins
**When** the user moves through the village
**Then** map tiles render smoothly without blank tiles or loading spinners, using the offline PMTiles source

**Given** the implementation is complete
**When** `bun run build` is executed
**Then** the build succeeds and `public/tiles/ggv.pmtiles` is included in the `dist/` output

### Story 1.3: Workbox Service Worker & Offline-First Caching

As a visitor who has used the app at least once,
I want the app to load instantly from cached assets and serve village data even without internet,
So that I can start navigating in under 2 seconds regardless of network conditions.

**Acceptance Criteria:**

**Given** the app is visited for the first time
**When** the Service Worker installs
**Then** all Vite build assets (JS, CSS, HTML) are precached at install time via `injectManifest` Workbox
**And** `/style/style.json`, `/fonts/**/*.pbf`, and `/tiles/ggv.pmtiles` are precached with CacheFirst strategy (24h and 7d expiry respectively)

**Given** the app has been visited at least once (Service Worker active)
**When** the user opens the app again on any connection quality
**Then** the interactive map loads in under 2 seconds from Service Worker cache (NFR3)
**And** no external network requests block map rendering

**Given** the device is offline and the app was visited before
**When** the user selects a block and lot from the destination screen
**Then** block and lot data is served from the StaleWhileRevalidate cache (1h expiry)
**And** the navigation flow completes without any error state (FR28)

**Given** the device regains connectivity after being offline
**When** block/lot data is accessed
**Then** the system serves cached data immediately and triggers a background refresh (FR29)

**Given** a new version of the app is deployed
**When** a user opens the app
**Then** the Service Worker activates the new version immediately via `skipWaiting()` + `clientsClaim()` without requiring a page reload (FR32, NFR12)

**Given** OSRM routing API is called during navigation and the device has a connection
**When** the request completes or times out after 3 seconds
**Then** on success the route is displayed; on timeout the system falls back to direct line (FR17, NFR16)

**Given** the implementation is complete
**When** `bun run lint && bun run build` is executed
**Then** both pass with zero errors and the generated `sw.js` is present in `dist/`

### Story 1.4: PWA Manifest & Install Experience

As a resident who uses MyGGV GPS frequently to guide visitors,
I want to install the app on my Android or iOS home screen,
So that I can launch it instantly like a native app without opening a browser each time.

**Acceptance Criteria:**

**Given** a user visits the app for the first time on Android Chrome
**When** the browser's install eligibility criteria are met (Service Worker registered, manifest valid)
**Then** Chrome displays the "Add to Home Screen" install prompt or banner

**Given** a resident has installed the app to their home screen
**When** they launch it from the home screen icon
**Then** the app opens in standalone mode with no browser chrome or address bar (FR31)
**And** the app loads the interactive map in under 1.5 seconds (NFR4)

**Given** the PWA manifest is configured
**When** the manifest is validated
**Then** `display` is set to `standalone`, `orientation` is `portrait`, and village-branded icons at 192×192 and 512×512 PNG are present (FR30)
**And** `theme_color` matches the app's primary green (#50AA61)

**Given** an iOS Safari user visits the app
**When** they use "Add to Home Screen" from the browser share menu
**Then** the app launches in standalone mode with the correct icon and app name

**Given** the implementation is complete
**When** Lighthouse PWA audit is run on the production build
**Then** the app passes all PWA installability checks

### Story 1.5: Hostinger Hosting Deployment & Configuration

As any visitor scanning the QR code at the village entrance,
I want the app to be served from a reliable paid hosting provider,
So that I never encounter blank pages or failed loads from free tier limitations.

**Acceptance Criteria:**

**Given** the `dist/` folder has been built via `bun run build`
**When** it is deployed to Hostinger
**Then** the app is accessible via HTTPS at the production domain
**And** SSL/TLS is active (Let's Encrypt or equivalent)

**Given** a user navigates directly to the app URL
**When** Hostinger serves the request
**Then** the SPA redirect is configured (all routes → `/index.html` via `.htaccess`) so the React app loads correctly

**Given** the Hostinger `.htaccess` is configured
**When** HTTP response headers are inspected
**Then** the following security headers are present: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`, `Permissions-Policy: geolocation=(self), camera=(), microphone=()`, `Referrer-Policy: strict-origin-when-cross-origin`

**Given** assets are deployed to Hostinger
**When** `/assets/*`, `/icons/*`, `/markers/*`, `/fonts/*`, `/style/*`, and `/tiles/*` are requested
**Then** the response includes `Cache-Control: public, max-age=31536000, immutable`

**Given** the Hostinger server supports HTTP/2
**When** the PMTiles file is requested via HTTP range request
**Then** range requests are served correctly, enabling efficient tile extraction by the PMTiles protocol handler

**Given** the full deployment is live (stories 1.1-1.4 in place)
**When** the app is tested on a real Android device on Slow 3G (Chrome DevTools throttle)
**Then** first paint occurs in under 3 seconds (NFR1) and the interactive map becomes usable in under 5 seconds (NFR2)
**And** all existing navigation features work without regression (FR1-FR4, FR6-FR22, FR33-FR34)

---

## Epic 2: Architecture Propre & Migration TypeScript

Charles (developer) can maintain and extend the codebase with TypeScript type safety, modular overlay components in `src/components/`, and a refined NavigationOverlay refactored into floating pill components that expose more of the map during active navigation.

### Story 2.1: Extract Overlay Components from App.jsx

As Charles (developer),
I want the 6 navigation overlays extracted into individual files in `src/components/`,
So that App.jsx contains only the state machine logic (~200 LOC) and each overlay is independently editable.

**Acceptance Criteria:**

**Given** the 6 overlays are inline in App.jsx today
**When** the extraction is complete
**Then** `src/components/` contains exactly: `GpsPermissionOverlay.jsx`, `WelcomeOverlay.jsx`, `OrientationOverlay.jsx`, `NavigationOverlay.jsx`, `ArrivedOverlay.jsx`, `ExitCompleteOverlay.jsx`
**And** App.jsx is reduced to approximately 200 LOC containing only: state machine, hook calls, conditional rendering, and prop passing

**Given** each overlay is in its own file
**When** App.jsx renders a navigation state
**Then** the rendered output is pixel-identical to the pre-extraction behavior — no visual regression
**And** all event handlers (`onGrant`, `onSelectDestination`, `onCancel`, `onExitVillage`, etc.) continue to work correctly

**Given** the WelcomeOverlay is extracted
**When** it loads block and lot data from Supabase
**Then** the data flow (Supabase RPC → dropdown → destination selection) works identically to before extraction

**Given** the AnimatePresence overlay system is preserved
**When** navigating between states
**Then** Framer Motion enter/exit animations play correctly on all 6 overlays with `mode="wait"`

**Given** the extraction is complete
**When** `bun run lint && bun run build` is executed
**Then** both pass with zero errors and bundle sizes remain within NFR6 (<150 KB main) and NFR7 (<300 KB maps)

### Story 2.2: TypeScript Migration — Strict Mode

As Charles (developer),
I want all source files converted from JavaScript to TypeScript with strict mode enabled,
So that type errors are caught at compile time, reducing the risk of runtime bugs when extending the codebase.

**Acceptance Criteria:**

**Given** all source files are `.js` / `.jsx` today
**When** the migration is complete
**Then** all files in `src/` use `.ts` (non-JSX) or `.tsx` (JSX with React components) extensions
**And** a `tsconfig.json` is present at project root with `"strict": true` and `"target": "esnext"`

**Given** TypeScript strict mode is enabled
**When** `bun run build` (or `tsc --noEmit`) is executed
**Then** zero TypeScript type errors are reported across all files

**Given** the hook return shapes are typed
**When** `useMapSetup`, `useRouting`, and `useNavigation` are called in App.tsx
**Then** TypeScript infers the correct return object types with no `any` usage in hook signatures
**And** all hook return objects use named properties (never positional arrays)

**Given** GeoJSON coordinate conventions are preserved
**When** coordinates are used in any typed function
**Then** `[longitude, latitude]` GeoJSON tuples are typed as `[number, number]`
**And** user location GPS objects are typed as `{ latitude: number; longitude: number }`

**Given** all threshold values are typed
**When** constants like `DEVIATION_THRESHOLD_M`, `ARRIVAL_THRESHOLD_M`, `RECALC_DEBOUNCE_MS` are used
**Then** they are typed as `number` constants — zero magic numbers remaining in the codebase

**Given** the migration is complete
**When** `bun run lint && bun run build` is executed
**Then** both ESLint and TypeScript compile pass with zero errors
**And** the app behavior is identical to the pre-TypeScript version on real device (iOS Safari + Android Chrome)

### Story 2.3: CSS Design Token System

As Charles (developer),
I want a consistent CSS design token system using `--ggv-*` custom properties,
So that colors, spacing, typography, and z-index values are defined once and reused across all overlay components.

**Acceptance Criteria:**

**Given** the design tokens are defined
**When** the `:root` CSS block is inspected
**Then** it contains at minimum tokens for: `--ggv-color-primary`, `--ggv-color-success`, `--ggv-color-error`, `--ggv-color-surface`, `--ggv-color-text`, `--ggv-color-text-secondary`, `--ggv-color-overlay-bg`
**And** spacing tokens: `--ggv-space-xs` (4px) through `--ggv-space-2xl` (48px)
**And** touch target tokens: `--ggv-touch-target-min` (44px), `--ggv-touch-target-cta` (56px)
**And** z-index tokens: `--ggv-z-map` (0), `--ggv-z-overlay` (100+), `--ggv-z-modal` (200+)

**Given** the design tokens are defined
**When** any overlay component CSS is inspected
**Then** no hardcoded color values (hex codes, rgb) appear in overlay-specific CSS rules — all reference `var(--ggv-*)` tokens
**And** no hardcoded spacing values appear in overlay-specific CSS — all reference spacing tokens

**Given** any primary CTA button is rendered
**When** its styles are computed
**Then** `min-height` is at least `var(--ggv-touch-target-cta)` (56px) satisfying WCAG 2.1 Level A touch target requirements (minimum 44px)

**Given** the design tokens are applied
**When** `bun run lint && bun run build` is executed
**Then** both pass with zero errors and the visual output on real device is identical to before token adoption

### Story 2.4: NavigationOverlay → Floating Pills (NavTopPill + NavBottomStrip)

As a visitor actively navigating to a lot,
I want the navigation UI to appear as compact floating elements rather than a full overlay,
So that I can see more of the village map while following my route.

**Acceptance Criteria:**

**Given** the NavigationOverlay has been extracted to its own file (Story 2.1 complete)
**When** the navigation state is active (`navState === 'navigating'`)
**Then** a `NavTopPill` component is visible at the top of the screen showing: direction icon and distance remaining
**And** a `NavBottomStrip` component is visible at the bottom of the screen showing: next turn instruction, destination name, and a Cancel button
**And** the full village map canvas is visible behind both pill components (not obscured by a full-screen overlay)

**Given** the NavTopPill is rendered
**When** its styles are inspected
**Then** it uses glass-morphism styling (`backdrop-filter: blur()` with semi-transparent background)
**And** it is positioned absolutely at the top of the screen with appropriate safe area insets

**Given** the NavBottomStrip is rendered
**When** its styles are inspected
**Then** it slides up from the bottom via Framer Motion animation (`initial={{ y: 100 }}`, `animate={{ y: 0 }}`)
**And** the Cancel button meets the minimum touch target size of 44px

**Given** the user is navigating and the next turn is calculated
**When** the `currentStep` is updated in real-time
**Then** the NavBottomStrip updates the turn instruction and icon without layout shift

**Given** the user arrives at the destination (<15m)
**When** arrival is detected
**Then** the NavTopPill and NavBottomStrip animate out and the ArrivedOverlay animates in smoothly

**Given** the implementation is complete
**When** `bun run lint && bun run build` is executed
**Then** both pass with zero errors
**And** on a real Android device, the navigation UI shows the map with floating pills (not a blocking overlay)
**And** all existing navigation behavior (FR12-FR19) continues to function correctly

---

## Epic 3: Analytics Usage & Pipeline Qualité

Charles (admin) can view daily, weekly, monthly, and yearly visitor counts and the most requested blocks/lots via an analytics dashboard. The codebase has a safety net of automated unit tests and a GitHub Actions CI/CD pipeline.

### Story 3.1: Analytics Data Collection — Anonymous Session Recording

As Charles (admin),
I want every navigation session to be recorded anonymously when a user selects a destination,
So that I have accurate data on app usage even if the user was offline during their session.

**Acceptance Criteria:**

**Given** a user selects a block and lot and starts navigation
**When** the `onSelectDestination` event fires in App.tsx
**Then** an anonymous session record is inserted into the `analytics` Supabase table containing: `timestamp` (UTC ISO 8601), `block_name` (string), `lot_name` (string)
**And** no personally identifiable information (device ID, IP, user agent) is stored

**Given** the device is offline when a navigation session starts
**When** the analytics insert is attempted
**Then** the insert is queued via Workbox BackgroundSync (`analytics-queue`)
**And** the queue retries automatically when the device regains connectivity
**And** queued events are sent in order (FIFO) without duplicates

**Given** the Supabase `analytics` table is created
**When** the table schema is inspected
**Then** it contains at minimum: `id` (uuid, generated), `created_at` (timestamptz), `block_name` (text), `lot_name` (text)
**And** Row Level Security (RLS) allows anonymous inserts but no reads from the client side

**Given** the analytics collection is active
**When** `bun run lint && bun run build` is executed
**Then** both pass with zero errors and the analytics insert adds zero visible latency to the navigation start flow

### Story 3.2: Admin Analytics Dashboard View

As Charles (admin),
I want to view daily, weekly, monthly, and yearly visitor counts and the most requested blocks and lots,
So that I can make data-driven decisions about the village navigation system and report usage to the HOA.

**Acceptance Criteria:**

**Given** the `analytics` table contains session records (Story 3.1 complete)
**When** Charles queries the Supabase dashboard or runs the provided SQL views
**Then** he can see total session counts grouped by: day, week, month, and year (FR36)

**Given** navigation sessions have been recorded
**When** Charles queries for top destinations
**Then** he can see a ranked list of blocks by session count (FR37)
**And** he can see a ranked list of lots within each block by session count

**Given** Charles needs a repeatable query
**When** the implementation is complete
**Then** Supabase SQL views or RPC functions are provided that return: `daily_counts`, `weekly_counts`, `monthly_counts`, `yearly_counts`, `top_blocks`, `top_lots`
**And** these views are documented so Charles can run them independently from the Supabase dashboard

**Given** Charles accesses the analytics data
**When** he inspects the data
**Then** no personally identifiable user data is present — only aggregated counts and destination strings

### Story 3.3: Unit Tests — geo.ts & Critical Hooks

As Charles (developer),
I want unit tests covering the core geospatial functions and hook behaviors,
So that future changes to navigation logic are validated automatically and regressions are caught before deployment.

**Acceptance Criteria:**

**Given** Vitest and @testing-library/react are installed as dev dependencies
**When** `bun run test` is executed
**Then** the test suite runs and all tests pass with zero failures

**Given** `src/lib/geo.ts` contains `getDistance`, `projectPointOnLine`, and `getDistanceAlongRoute`
**When** unit tests for `geo.ts` are run
**Then** `getDistance` returns correct Haversine distances validated against known coordinate pairs with less than 1m tolerance
**And** `projectPointOnLine` correctly projects a point onto a line segment validated with geometric test cases
**And** `getDistanceAlongRoute` returns correct cumulative distances along a polyline

**Given** `useNavigation` performs arrival detection
**When** unit tests for the arrival threshold are run
**Then** a simulated position at exactly 15m from destination does NOT trigger arrival
**And** a simulated position at 14.9m from destination triggers `hasArrived: true`
**And** threshold constant `ARRIVAL_THRESHOLD_M` is validated against its documented value

**Given** `useRouting` deviation detection logic exists
**When** unit tests for the deviation threshold are run
**Then** `DEVIATION_THRESHOLD_M = 25` is validated as the recalculation trigger threshold
**And** `RECALC_DEBOUNCE_MS = 10000` is validated as the minimum time between recalculations

**Given** all tests pass
**When** `bun run test --coverage` is executed
**Then** coverage for `src/lib/geo.ts` is at or above 90%
**And** the test suite completes in under 30 seconds

### Story 3.4: GitHub Actions CI/CD Pipeline

As Charles (developer),
I want an automated pipeline that validates, builds, and deploys the app on every push to main,
So that linting errors, type errors, and test failures are caught automatically before reaching production.

**Acceptance Criteria:**

**Given** a commit is pushed to the `main` branch
**When** the GitHub Actions workflow triggers
**Then** it executes the following steps in order: `bun run lint` → `tsc --noEmit` → `bun run test` → `bun run build`
**And** the pipeline fails fast — any step failure stops the pipeline and reports the failing step

**Given** the lint step runs
**When** any ESLint error is present
**Then** the pipeline fails with a non-zero exit code and displays the ESLint error output

**Given** the typecheck step runs
**When** any TypeScript type error is present
**Then** the pipeline fails and displays the TypeScript error output

**Given** the test step runs
**When** any Vitest test fails
**Then** the pipeline fails and displays the failing test names and assertion errors

**Given** all steps pass
**When** the build step completes
**Then** the `dist/` directory is produced and the pipeline reports success
**And** the `dist/` folder is deployed to Hostinger via SSH/FTP using stored GitHub Secrets (`HOSTINGER_FTP_HOST`, `HOSTINGER_FTP_USER`, `HOSTINGER_FTP_PASSWORD`)

**Given** the GitHub Actions workflow file is created
**When** it is inspected at `.github/workflows/ci.yml`
**Then** it uses `ubuntu-latest`, installs Bun, restores node_modules cache, and runs all four steps sequentially

---

## Epic 4: Interface Admin & Gestion des Données *(Phase 4 — no timeline)*

Charles (admin) can manage block and lot data directly from within the application — without accessing the Supabase dashboard — and changes are reflected on next app load without code deployment.

### Story 4.1: Admin Authentication Gate

As Charles (admin),
I want a protected admin entry point in the app,
So that I can access data management features without exposing them to regular visitors.

**Acceptance Criteria:**

**Given** a regular visitor uses the app
**When** they navigate through the normal flow (GPS → Welcome → Navigation)
**Then** no admin interface or controls are visible — zero impact on the visitor experience

**Given** Charles wants to access the admin interface
**When** he navigates to a dedicated admin route or gesture-triggered entry point
**Then** an authentication prompt is displayed requiring a passcode or Supabase-authenticated login

**Given** Charles enters valid admin credentials
**When** authentication succeeds
**Then** he is presented with the admin dashboard showing Block Management and Lot Management options

**Given** Charles enters invalid credentials
**When** authentication fails
**Then** an error message is displayed in English and the form resets — no crash, no stuck state

**Given** the admin gate is implemented
**When** `bun run lint && bun run build` is executed
**Then** both pass with zero errors and the admin bundle is lazy-loaded (not included in the main visitor bundle)

### Story 4.2: Block Management UI

As Charles (admin),
I want to add, update, and remove village block records from within the app,
So that I can keep the navigation data current when the village layout changes, without accessing the Supabase dashboard.

**Acceptance Criteria:**

**Given** Charles is authenticated in the admin interface (Story 4.1 complete)
**When** he opens Block Management
**Then** a list of all existing blocks is displayed, each with its name and a polygon coordinate summary

**Given** Charles wants to add a new block
**When** he taps "Add Block" and submits valid block data (name + polygon coordinates)
**Then** the new block is inserted into the Supabase `blocks` table via RPC (FR38)
**And** a success confirmation is displayed in English + Tagalog

**Given** Charles wants to update an existing block
**When** he selects a block, edits its data, and saves
**Then** the block record is updated in Supabase
**And** the updated block appears in the list immediately

**Given** Charles wants to remove a block
**When** he selects a block and confirms deletion
**Then** the block record is deleted from Supabase
**And** a confirmation prompt prevents accidental deletion ("Delete Block 51? • Burahin ang Block 51?")

**Given** a block is added, updated, or removed
**When** any visitor opens the app next
**Then** the destination selector reflects the change without any code deployment (FR40)

**Given** the Block Management UI is complete
**When** `bun run lint && bun run build` is executed
**Then** both pass with zero errors

### Story 4.3: Lot Management UI

As Charles (admin),
I want to add, update, and remove individual lot records within any block,
So that I can maintain accurate lot-level navigation data as the village cadastral plan evolves.

**Acceptance Criteria:**

**Given** Charles is in the admin interface and has selected a block
**When** he opens Lot Management for that block
**Then** a list of all lots in that block is displayed, each with its lot number and GPS coordinates

**Given** Charles wants to add a new lot
**When** he taps "Add Lot" and submits valid lot data (lot number + latitude + longitude coordinates)
**Then** the new lot is inserted into the Supabase `lots` table via RPC (FR39)
**And** a success confirmation is displayed in English + Tagalog

**Given** Charles wants to update a lot's coordinates
**When** he selects a lot, edits the coordinates, and saves
**Then** the lot record is updated in Supabase with the new centroid coordinates

**Given** Charles wants to remove a lot
**When** he selects a lot and confirms deletion
**Then** the lot record is deleted from Supabase
**And** a confirmation prompt prevents accidental deletion

**Given** a lot is added, updated, or removed
**When** any visitor selects that block in the destination selector
**Then** the lot dropdown reflects the change without any code deployment (FR40)

**Given** Charles enters invalid coordinates (non-numeric or outside village bounds)
**When** he attempts to save
**Then** an inline validation error is displayed without submitting to Supabase

**Given** the Lot Management UI is complete
**When** `bun run lint && bun run build` is executed
**Then** both pass with zero errors
