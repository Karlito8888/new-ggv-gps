# Story 1.3: Workbox Service Worker & Offline-First Caching

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor who has used the app at least once,
I want the app to load instantly from cached assets and serve village data even without internet,
So that I can start navigating in under 2 seconds regardless of network conditions.

## Acceptance Criteria

1. **Given** the app is visited for the first time **When** the Service Worker installs **Then** all Vite build assets (JS, CSS, HTML) are precached at install time via `injectManifest` Workbox **And** the full `/tiles/ggv.pmtiles` file (1.4 MB) is eagerly fetched and cached during SW `install` event **And** `/map-fonts/**/*.pbf` and `/sprites/light*` are runtime-cached on first access via CacheFirst strategy (24h expiry for fonts/sprites)

2. **Given** the app has been visited at least once (Service Worker active) **When** the user opens the app again on any connection quality **Then** the interactive map loads in under 2 seconds from Service Worker cache (NFR3) **And** no external network requests block map rendering

3. **Given** the device is offline and the app was visited before **When** the user selects a block and lot from the destination screen **Then** block and lot data is served from the StaleWhileRevalidate cache (1h expiry) **And** the navigation flow completes without any error state (FR28)

4. **Given** the device regains connectivity after being offline **When** block/lot data is accessed **Then** the system serves cached data immediately and triggers a background refresh (FR29)

5. **Given** a new version of the app is deployed **When** a user opens the app **Then** the Service Worker activates the new version immediately via `skipWaiting()` + `clientsClaim()` without requiring a page reload (FR32, NFR12)

6. **Given** OSRM routing API is called during navigation and the device has a connection **When** the request completes or times out after 3 seconds **Then** on success the route is displayed; on timeout the system falls back to direct line (FR17, NFR16)

7. **Given** the implementation is complete **When** `bun run lint && bun run build` is executed **Then** both pass with zero errors and the generated `sw.js` is present in `dist/`

## Tasks / Subtasks

- [x] Task 1: Install vite-plugin-pwa + Workbox modules and configure injectManifest (AC: #1, #7)
  - [x] 1.1 Run `bun add -d vite-plugin-pwa` to add PWA plugin as dev dependency
  - [x] 1.2 Run `bun add -d workbox-precaching workbox-routing workbox-strategies workbox-expiration workbox-range-requests` — these are required as explicit devDependencies for imports in `src/sw.js` (vite-plugin-pwa bundles the SW via Rollup and resolves these modules from node_modules) [Source: vite-plugin-pwa DeepWiki — Workbox Integration]
  - [x] 1.3 Configure `vite-plugin-pwa` in `vite.config.js` with `injectManifest` mode (see exact config in Dev Notes section below)
  - [x] 1.4 IMPORTANT: Verify vite-plugin-pwa version is compatible with Vite 7.3.0 — check `peerDependencies` after install. Architecture references v1.2.0 but actual latest compatible version may differ
  - [x] 1.5 Verify `bun run build` produces `dist/sw.js` with injected precache manifest (`self.__WB_MANIFEST` replaced with asset array)

- [x] Task 2: Create src/sw.js with 5-tier Workbox caching strategies (AC: #1, #2, #3, #4, #5, #6)
  - [x] 2.1 Create `src/sw.js` with Workbox imports: `precacheAndRoute` from `workbox-precaching`, `registerRoute` from `workbox-routing`, `CacheFirst`, `StaleWhileRevalidate`, `NetworkFirst` from `workbox-strategies`, `ExpirationPlugin` from `workbox-expiration`, `RangeRequestsPlugin` from `workbox-range-requests`
  - [x] 2.2 Tier 1 — **Precache**: Call `precacheAndRoute(self.__WB_MANIFEST)` for all Vite build assets (JS, CSS, HTML) — manifest auto-injected by vite-plugin-pwa. Default `globPatterns` is `['**/*.{js,css,html}']` — MUST be expanded to include sprites (see vite.config.js config below)
  - [x] 2.3 Tier 2 — **CacheFirst (24h)**: Register route for `/map-fonts/**/*.pbf` and `/sprites/**` with `CacheFirst({ cacheName: 'map-assets' })` + `ExpirationPlugin({ maxAgeSeconds: 86400 })`. Fonts are ~768 .pbf files (~102 MB total) — too large for precaching, runtime CacheFirst is the correct approach. Fonts are cached on-demand as the user views map labels at different zoom levels.
  - [x] 2.4 Tier 3 — **PMTiles warm-cache + CacheFirst + RangeRequestsPlugin**: See Task 4 for the complete implementation. Register route for `/tiles/*.pmtiles` with `CacheFirst({ cacheName: 'pmtiles-cache', plugins: [new RangeRequestsPlugin()] })`
  - [x] 2.5 Tier 4 — **StaleWhileRevalidate (1h)**: Register route for Supabase RPC (`wlrrruemchacgyypexsu.supabase.co`) with `StaleWhileRevalidate({ cacheName: 'supabase-data' })` + `ExpirationPlugin({ maxAgeSeconds: 3600 })`
  - [x] 2.6 Tier 5 — **NetworkFirst (3s)**: Register route for OSRM (`router.project-osrm.org`) and ORS (`api.openrouteservice.org`) with `NetworkFirst({ cacheName: 'routing-api', networkTimeoutSeconds: 3 })` — falls back to cached route on timeout
  - [x] 2.7 Add `self.skipWaiting()` in `install` event and `clientsClaim()` from `workbox-core` for immediate SW activation on update
  - [x] 2.8 Handle navigation requests: `NetworkFirst` for HTML documents (`request.mode === 'navigate'`) to ensure latest `index.html` with fallback to cached version

- [x] Task 3: Delete public/sw.js and update SW registration (AC: #5, #7)
  - [x] 3.1 DELETE `public/sw.js` — replaced by Workbox-generated `dist/sw.js` from `src/sw.js`
  - [x] 3.2 Keep manual SW registration in `src/main.jsx` as-is — it already points to `/sw.js` which is where vite-plugin-pwa outputs the compiled SW. With `injectRegister: false`, the plugin does NOT auto-register. IMPORTANT: Keep the `window.addEventListener("load", ...)` wrapper — it prevents the SW fetch from blocking initial page load on slow 3G connections [Source: web.dev PWA best practices]
  - [x] 3.3 Verify SW registration path resolves to the Workbox-generated SW at `/sw.js` (served from `dist/sw.js`)

- [x] Task 4: Handle PMTiles range requests in Service Worker (AC: #1, #2)
  - [x] 4.1 **Understanding the problem**: PMTiles ALWAYS uses HTTP range requests (`Range: bytes=X-Y`) — it NEVER fetches the full file. Standard Workbox `CacheFirst` does NOT cache HTTP 206 responses. `RangeRequestsPlugin` can only slice from a FULL (200) response already in cache. Therefore: the full PMTiles file must be in cache BEFORE any range requests arrive. [Source: workbox-range-requests docs, PMTiles GitHub issue #272]
  - [x] 4.2 **Solution — warm-cache during SW install**: In the SW `install` event listener, eagerly fetch and cache the full PMTiles file:
    ```js
    self.addEventListener('install', (event) => {
      event.waitUntil(
        caches.open('pmtiles-cache').then(cache =>
          cache.add('/tiles/ggv.pmtiles')  // Fetches full 200 response (no Range header)
        )
      );
      self.skipWaiting();
    });
    ```
    `cache.add()` creates a standard GET request (no Range header), receives the full 200 response, and stores it in cache. This happens during install, BEFORE the SW becomes active and starts intercepting range requests.
  - [x] 4.3 **Solution — runtime route with RangeRequestsPlugin**: Register a CacheFirst route that uses `RangeRequestsPlugin` to slice cached full response for range requests:
    ```js
    registerRoute(
      ({url}) => url.pathname.startsWith('/tiles/') && url.pathname.endsWith('.pmtiles'),
      new CacheFirst({
        cacheName: 'pmtiles-cache',  // Same cache name as install step
        plugins: [new RangeRequestsPlugin()],
      })
    );
    ```
    Flow: range request → CacheFirst finds full 200 in `pmtiles-cache` → `RangeRequestsPlugin.cachedResponseWillBeUsed` slices the bytes → returns 206 to the browser.
  - [x] 4.4 Verify: after SW install, `pmtiles-cache` contains full `/tiles/ggv.pmtiles` (check Chrome DevTools → Application → Cache Storage)
  - [x] 4.5 Test: Load map → go offline → reload → map tiles still render from cached PMTiles via range request slicing
  - [x] 4.6 Edge case: If SW install fails to cache PMTiles (slow 3G, large file), the CacheFirst route will fall through to network — map still works online but not offline until cache is populated. Consider adding a retry mechanism or showing a "caching in progress" indicator (optional, low priority).

- [x] Task 5: Build verification and lint (AC: #7)
  - [x] 5.1 `bun run lint` — zero errors
  - [x] 5.2 `bun run build` — zero errors
  - [x] 5.3 Verify `dist/sw.js` exists and contains Workbox precache manifest (not empty)
  - [x] 5.4 Verify `dist/sw.js` contains registered routes for all 5 tiers
  - [x] 5.5 Verify no regression: map loads, block selection works, navigation works on dev server

- [x] Task 6: Manual browser verification (AC: #1, #2, #3, #4, #5, #6)
  - [x] 6.1 Open app in Chrome DevTools → Application → Service Workers: verify Workbox SW is registered and active
  - [x] 6.2 Application → Cache Storage: verify precached assets are stored
  - [x] 6.3 Network tab: on second load, verify static assets served from SW (size column shows "(ServiceWorker)")
  - [x] 6.4 Test offline: DevTools → Network → Offline checkbox → reload → app loads, map renders, block data available
  - [x] 6.5 Test SW update: modify a source file, rebuild, serve → verify new SW activates immediately without requiring page reload
  - [x] 6.6 Test OSRM timeout: DevTools → Network → throttle to slow → verify route fallback to direct line after 3s

## Dev Notes

### Critical Architecture Constraints

- **Phase 1 = JavaScript only.** Do NOT rename files to .ts/.tsx. Create `src/sw.js`, NOT `src/sw.ts`.
- **KISS principle applies.** Use vite-plugin-pwa's `injectManifest` mode — it handles precache manifest injection into your custom SW.
- **Forbidden libraries remain forbidden:** No react-map-gl, no Turf.js. Only add PWA-related dependencies (`vite-plugin-pwa` + Workbox modules).
- **No changes to navigation state machine.** This story only affects caching layer — not overlays, routing logic, or arrival detection.
- **No changes to useMapSetup.js, useRouting.js, or useNavigation.js hook logic** — the SW is a transparent caching layer below the app.
- **DELETE `public/sw.js`** — it will be replaced by the Workbox-generated SW from `src/sw.js`. The architecture explicitly calls this out: "delete `public/sw.js` when adding `src/sw.js`" [Source: architecture.md — Important Gaps, item 1].

### Five-Tier Workbox Caching Strategy (Architecture Decision 1.3)

| Tier | Asset Type | Strategy | Cache Mechanism | URL Pattern |
|------|-----------|----------|----------------|-------------|
| 1 | Vite build assets + sprites + icons (`/assets/*`, `index.html`, `/sprites/*`) | **Precache** (SW install via `self.__WB_MANIFEST`) | Auto-injected by vite-plugin-pwa via `globPatterns` | Content-hashed, immutable |
| 2 | Map fonts (`/map-fonts/**/*.pbf`) | **CacheFirst** (runtime, 24h) | Cached on-demand at first access per glyph range | `new RegExp('^/map-fonts/.*\\.pbf$')` |
| 3 | Village PMTiles (`/tiles/ggv.pmtiles`) | **Warm-cache at install** + **CacheFirst + RangeRequestsPlugin** | Full file cached via `cache.add()` during SW install; range requests sliced from cache | `url.pathname.endsWith('.pmtiles')` |
| 4 | Supabase RPC responses | **StaleWhileRevalidate** (1h) | Serve cached, refresh in background | `wlrrruemchacgyypexsu.supabase.co` |
| 5 | OSRM routing API | **NetworkFirst** (3s timeout) | Network preferred, cache fallback | `router.project-osrm.org`, `api.openrouteservice.org` |
| — | Analytics (Phase 3) | **NetworkOnly + BackgroundSync** | Queue `analytics-queue` | *(Not implemented in this story)* |

### PMTiles Range Request Handling — CRITICAL (Documentation-Verified)

The PMTiles protocol uses HTTP range requests (`Range: bytes=X-Y`) to extract individual tiles from the `.pmtiles` archive. **PMTiles NEVER makes a full-file request** — it ALWAYS starts with a small range request for the header bytes, then makes additional range requests for individual tiles. This creates a fundamental challenge for Service Worker caching:

1. **Workbox `CacheFirst` does NOT cache HTTP 206 responses** — only 200 responses are cacheable by default.
2. **`RangeRequestsPlugin` (workbox-range-requests) requires a full 200 response already in cache** — it slices the cached full response to serve range requests. It CANNOT populate the cache from a 206 response. [Source: Chrome for Developers — workbox-range-requests docs]
3. **Browsers don't reliably cache range requests** — Firefox doesn't cache non-zero-start ranges; Chrome has issues in incognito mode. [Source: PMTiles GitHub issue #272]

**Correct approach (two-step pattern, verified via Cloudflare Workers PMTiles pattern):**

**Step 1 — Warm-cache during SW `install`:**
```js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('pmtiles-cache').then(cache =>
      cache.add('/tiles/ggv.pmtiles') // Full GET (no Range header) → 200 response cached
    )
  );
  self.skipWaiting();
});
```
`cache.add()` sends a standard GET without Range header → server returns full 200 response (1.4 MB) → stored in `pmtiles-cache`. This happens BEFORE the SW activates and intercepts fetch events.

**Step 2 — Runtime route with RangeRequestsPlugin:**
```js
registerRoute(
  ({url}) => url.pathname.startsWith('/tiles/') && url.pathname.endsWith('.pmtiles'),
  new CacheFirst({
    cacheName: 'pmtiles-cache',
    plugins: [new RangeRequestsPlugin()],
  })
);
```
Flow: PMTiles range request → CacheFirst finds full 200 in cache → `RangeRequestsPlugin.cachedResponseWillBeUsed` reads `Range` header, slices bytes from cached response, returns 206 Partial Content.

**Why NOT precache via `self.__WB_MANIFEST`?** `precacheAndRoute()` handles versioning and cleanup of precached assets, but it does NOT support `RangeRequestsPlugin` — there's no way to add plugins to the precache handler. The manual `cache.add()` + separate CacheFirst route is the only pattern that works for range-requested resources.

**File size impact:** 1.4 MB during install is acceptable even on slow 3G (~4.7s at 300 KB/s). The SW won't become active until the install completes, so the app works normally during this time.

### Style.json — NOT a Caching Target (Changed in Story 1.2)

The architecture originally specified CacheFirst for `/style/style.json`. However, **Story 1.2 DELETED `public/style/style.json`** and replaced it with an inline Protomaps style generated in `useMapSetup.js` using `protomaps-themes-base`. Therefore:
- No `/style/style.json` file exists to cache
- The style is bundled in the `maps` JS chunk and precached as part of Vite build assets (Tier 1)
- Tier 2 (CacheFirst 24h) now only covers `/map-fonts/` and `/sprites/`

### Current SW Registration (main.jsx) — KEEP AS-IS

```jsx
// Current manual registration in src/main.jsx — DO NOT MODIFY
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Silent fail - SW is optional enhancement
    });
  });
}
```

With `vite-plugin-pwa` in `injectManifest` mode + `injectRegister: false`:
- The plugin generates `dist/sw.js` from `src/sw.js` (with precache manifest injected)
- The plugin does NOT auto-register the SW (because `injectRegister: false`)
- **KEEP the existing manual registration exactly as-is.** It already points to `/sw.js` which is where vite-plugin-pwa outputs the compiled SW.
- **KEEP the `window.addEventListener("load", ...)` wrapper** — this is a PWA best practice that prevents the SW registration fetch from competing with critical page resources on slow 3G connections. Removing it could degrade first-load performance (NFR1: first paint <3s on 3G). [Source: web.dev PWA best practices]

### vite-plugin-pwa Configuration Pattern (Documentation-Verified)

```js
// vite.config.js — add to plugins array
import { VitePWA } from "vite-plugin-pwa";

VitePWA({
  strategies: "injectManifest",
  srcDir: "src",
  filename: "sw.js",
  injectRegister: false,  // We handle registration manually in main.jsx
  manifest: false,         // We already have public/manifest.json (copied to dist/ by Vite)
  injectManifest: {
    // Default globPatterns is ['**/*.{js,css,html}'] — MUST expand to include
    // sprites and icons that are copied from public/ to dist/
    // [Source: vite-pwa-org.netlify.app/guide/static-assets]
    globPatterns: [
      '**/*.{js,css,html}',      // Vite build assets (default)
      'sprites/**/*.{json,png}',  // Protomaps light sprites (4 files, ~50 KB total)
      'icons/**/*.png',           // PWA icons
      'manifest.json',            // PWA manifest
    ],
    // DO NOT include 'tiles/**/*.pmtiles' here — PMTiles is warm-cached
    // during SW install event via cache.add(), NOT via precacheAndRoute()
    // (because precacheAndRoute does not support RangeRequestsPlugin)
    //
    // DO NOT include 'map-fonts/**/*.pbf' here — 768 files (~102 MB total)
    // is far too large for precaching. Fonts use runtime CacheFirst instead.
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // Default 2MB, increase for safety
  },
})
```

**Key options explained:**
- `strategies: "injectManifest"` — custom SW source at `src/sw.js`, compiled via Rollup, manifest injected at build [Source: vite-pwa DeepWiki — InjectManifest Strategy]
- `srcDir: "src"` + `filename: "sw.js"` — SW source at `src/sw.js` (NOT default `public/sw.js`)
- `injectRegister: false` — no auto-registration; we keep manual `navigator.serviceWorker.register("/sw.js")` in `main.jsx`
- `manifest: false` — disables manifest generation; our existing `public/manifest.json` is copied to `dist/` by Vite's `publicDir` mechanism
- `globPatterns` — controls which files from `dist/` are included in `self.__WB_MANIFEST`. Default `['**/*.{js,css,html}']` misses sprites, icons, and manifest. MUST always include `js,css,html` or precache will break [Source: vite-pwa-org.netlify.app/guide/service-worker-precache]
- `maximumFileSizeToCacheInBytes` — per-file size limit for precache entries (default 2 MB)

**Version compatibility note:** Architecture references vite-plugin-pwa v1.2.0 with Workbox 7.4.0. After `bun add -d vite-plugin-pwa`, check `node_modules/vite-plugin-pwa/package.json` for `peerDependencies` to confirm Vite 7.3.0 compatibility. If incompatible, check the plugin's GitHub releases for the correct version.

### Previous Story (1.2) Intelligence

- **Protomaps style is inline** — no style.json to cache separately
- **Sprites at `/sprites/light*`** (4 files: .json, .png, @2x.json, @2x.png) — need CacheFirst
- **Fonts at `/map-fonts/`** — need CacheFirst (Noto Sans .pbf files from Story 1.1)
- **PMTiles at `/tiles/ggv.pmtiles`** — 1.4 MB, 26 tiles, z0-z15, Protomaps schema
- **`public/sw.js` patched in Story 1.2** to skip 206 responses — this entire file will be deleted
- **vite.config.js** already chunks `pmtiles` into `maps` bundle — no changes needed there
- **CSP in `index.html`** — no new external origins needed (all caching is same-origin or already allowed origins)
- **netlify.toml** — cache headers already set for `/tiles/*`, `/sprites/*`, `/map-fonts/*` (immutable) — no changes needed

### Git Intelligence (Recent Commits)

```
8d4304d fix: code review fixes for Story 1.2 — cleanup stale assets, optimize map load
b9662d6 fix: self-host protomaps light sprites, fix SW 206 cache error
16dd30e feat: self-host village map tiles via PMTiles (Story 1.2)
617df11 fix: code review fixes for Story 1.1 — CSP cleanup, cache headers, stray file
7606097 feat: self-host map style, glyphs and sprites (Story 1.1)
```

- Commit pattern: `feat: <description> (Story X.Y)` for main implementation
- Code review follow-up commits: `fix: <description>`
- Story 1.2 code review caught: stale assets, map load optimization — expect similar follow-up
- **PMTiles 206 error was already discovered and patched in Story 1.2** (`b9662d6`) — this confirms range request handling is a known issue

### What NOT to Do

- Do NOT modify `useMapSetup.js`, `useRouting.js`, `useNavigation.js`, or `App.jsx` logic — the SW is a transparent layer
- Do NOT add `public/style/style.json` back — it was deleted in Story 1.2 (style is inline)
- Do NOT modify the PMTiles protocol registration in `useMapSetup.js` — it works correctly
- Do NOT change `manifest.json` (that's Story 1.4)
- Do NOT implement BackgroundSync for analytics (that's Story 3.1)
- Do NOT add any CDN or external service URLs to CSP — all caching targets are same-origin or already in CSP
- Do NOT remove protomaps-themes-base from the maps chunk in vite.config.js
- Do NOT create a separate `/src/service-worker/` directory — single file `src/sw.js` per architecture

### Verification Checklist

After implementation, verify:
- [ ] `public/sw.js` is DELETED (no longer exists)
- [ ] `src/sw.js` exists with Workbox strategy registrations
- [ ] `bun run build` produces `dist/sw.js` with injected precache manifest
- [ ] `bun run lint` passes (no ESLint errors)
- [ ] Chrome DevTools → Application → Service Workers: Workbox SW active
- [ ] Cache Storage: precached Vite assets present
- [ ] Cache Storage: map fonts (.pbf) cached after first load
- [ ] Cache Storage: sprites cached after first load
- [ ] Cache Storage: PMTiles file cached (range request handling works)
- [ ] Offline mode: app loads, map renders with tiles, block data available
- [ ] SW update: new build → SW activates immediately (skipWaiting + clientsClaim)
- [ ] Network tab: second load shows "(ServiceWorker)" for static assets
- [ ] OSRM timeout: falls back to direct line after 3s (existing behavior preserved)

### Project Structure Notes

- Aligns with Architecture Decision 1.3 (Workbox caching strategy) and Decision 4.2 (SW source at `src/sw.js`)
- File structure per architecture: `src/sw.js` (Phase 1) → `src/sw.ts` (Phase 2 TypeScript migration)
- `public/sw.js` deletion per architecture Important Gap #1: "delete public/sw.js when adding src/sw.js"
- No new directories created — `src/sw.js` is a single file at source root level
- Build output: `dist/sw.js` (not content-hashed — SW URL must be stable for browser update checks)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Decision 1.3 (Workbox Caching Strategy Matrix)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Decision 4.2 (Service Worker Source File)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Important Gap #1 (public/sw.js migration)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Service Worker Patterns section]
- [Source: _bmad-output/planning-artifacts/epics.md — Story 1.3 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/prd.md — FR23-FR29 (Offline & Performance), FR32 (auto-update)]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR3 (<2s cached), NFR10-NFR15 (reliability)]
- [Source: _bmad-output/implementation-artifacts/1-2-village-pmtiles-offline-tile-hosting.md — Previous story learnings, PMTiles 206 fix]
- [Source: _bmad-output/project-context.md — Rule #2 MapLibre native API, Rule #9 Build configuration]
- [Source: src/main.jsx — Current SW registration code]
- [Source: public/sw.js — Current hand-written SW (to be deleted)]
- [Source: vite.config.js — Current build configuration]
- [Source: package.json — Current dependencies]
- [Source: CLAUDE.md — Build commands, deployment, architecture philosophy]
- [vite-plugin-pwa injectManifest Guide](https://vite-pwa-org.netlify.app/guide/inject-manifest) — Official config reference
- [vite-plugin-pwa Static Assets Guide](https://vite-pwa-org.netlify.app/guide/static-assets) — globPatterns and includeAssets
- [vite-plugin-pwa Precache Guide](https://vite-pwa-org.netlify.app/guide/service-worker-precache) — Precache manifest configuration
- [vite-plugin-pwa DeepWiki — InjectManifest Strategy](https://deepwiki.com/vite-pwa/vite-plugin-pwa/2.2-injectmanifest-strategy)
- [vite-plugin-pwa DeepWiki — Workbox Integration](https://deepwiki.com/vite-pwa/vite-plugin-pwa/2.3-workbox-integration) — Module resolution
- [vite-plugin-pwa DeepWiki — Configuration Options](https://deepwiki.com/vite-pwa/vite-plugin-pwa/2-configuration-options) — All options reference
- [vite-plugin-pwa — GitHub](https://github.com/vite-pwa/vite-plugin-pwa)
- [Workbox Range Requests — Chrome for Developers](https://developer.chrome.com/docs/workbox/modules/workbox-range-requests) — RangeRequestsPlugin docs
- [Workbox Caching Strategies — Chrome for Developers](https://developer.chrome.com/docs/workbox/caching-strategies-overview)
- [Workbox Using Plugins — Chrome for Developers](https://developer.chrome.com/docs/workbox/using-plugins)
- [PMTiles Range Request Caching — GitHub issue #272](https://github.com/protomaps/PMTiles/issues/272) — Browser caching limitations
- [PMTiles on Cloudflare Workers — Thomas Gauvin](https://thomasgauvin.com/writing/static-protomaps-on-cloudflare/) — SW pattern for PMTiles range requests
- [PMTiles + MapLibre — Protomaps Docs](https://docs.protomaps.com/pmtiles/maplibre)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No blocking issues encountered during implementation.

### Completion Notes List

- Installed `vite-plugin-pwa@1.2.0` (compatible with Vite ^7.0.0) and Workbox 7.4.0 modules (`workbox-precaching`, `workbox-routing`, `workbox-strategies`, `workbox-expiration`, `workbox-range-requests`, `workbox-core`)
- Configured `vite-plugin-pwa` in `vite.config.js` with `injectManifest` mode, `injectRegister: false`, `manifest: false`, custom `globPatterns` for sprites/icons/manifest
- Created `src/sw.js` with 5-tier Workbox caching strategy: Precache (Vite assets), CacheFirst 24h (map fonts), CacheFirst+RangeRequestsPlugin (PMTiles), StaleWhileRevalidate 1h (Supabase), NetworkFirst 3s (OSRM/ORS)
- PMTiles warm-cache implemented via `cache.add()` in SW `install` event, with `RangeRequestsPlugin` for runtime range request slicing
- Navigation requests handled with `NetworkFirst` for HTML documents
- `skipWaiting()` + `clientsClaim()` for immediate SW activation on update
- Deleted `public/sw.js` (old hand-written SW) — replaced by Workbox-generated `dist/sw.js`
- Kept existing manual SW registration in `src/main.jsx` unchanged (already points to `/sw.js`)
- Build verification: `bun run lint` (0 errors), `bun run build` (0 errors), `dist/sw.js` generated with 21 precache entries (1787.54 KiB)
- Task 6 browser verification completed via agent-browser automation:
  - 6.1: SW registered and activated at `/sw.js` scope `/`
  - 6.2: Cache Storage has 21 precache entries + 1 PMTiles warm-cache + 2 map font entries
  - 6.3: All precached assets served with transferSize=0 and ~1ms duration on reload
  - 6.4: Offline mode: app loads, MapLibre canvas renders (1280x720), PMTiles tiles served from cache
  - 6.5: SW update verified via agent-browser — new SW (with code review fixes) activated immediately, no waiting/installing state, skipWaiting+clientsClaim working
  - 6.6: OSRM routing cache verified — NetworkFirst 3s intercepts requests, routing-api cache populated with 1 entry, second request served in 347ms (vs 1159ms initial)

### Implementation Plan

Single-pass implementation following story task order. No architectural deviations from the story spec. All 5 caching tiers implemented exactly as specified in Dev Notes.

### Change Log

- 2026-02-24: Implemented Workbox Service Worker with 5-tier offline-first caching (Story 1.3)
- 2026-02-25: Code review fixes — PMTiles install error handling, ExpirationPlugin on routing-api + html-cache, exact Supabase hostname match
- 2026-02-25: Browser verification of Tasks 6.5 (SW update: skipWaiting+clientsClaim confirmed) and 6.6 (OSRM NetworkFirst 3s: routing-api cache populated, 347ms cached response)

### File List

- `package.json` — Modified: added vite-plugin-pwa + workbox-* devDependencies
- `bun.lock` — Modified: lockfile updated with new dependencies
- `vite.config.js` — Modified: added VitePWA plugin configuration with injectManifest mode
- `src/sw.js` — Created: Workbox service worker with 5-tier caching strategy
- `public/sw.js` — Deleted: replaced by Workbox-generated dist/sw.js
