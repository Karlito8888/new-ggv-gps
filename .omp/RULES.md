# new-ggv-gps rules

Hard requirements of this repository, carried on every request and by every subagent.
The reasons, the layout and the measurements are in the root `AGENTS.md`, which subagents
do not receive: read it by path.

- **A native change never ships as an update.** New native module, config plugin or SDK
  bump: `version` bump and new builds. An update that changes a map file also bumps
  `MAP_ASSETS_VERSION`; sprite PNGs keep the `.sprite` extension. Publish with `APP_VARIANT`
  set (unset, the config resolves to the development app).
- **After any `packages/shared` change**, run `./gradlew :app:createBundleReleaseJsAndAssets
  --rerun` before `assembleRelease`: a local release build shipped a stale JS bundle.
- **`packages/shared` is platform-neutral**: no `window`, `document`, `navigator`,
  `location`, no `import.meta.env`.
- **No `convex/` here.** `anyApi.locations.blocks` and `anyApi.locations.lotsWithCoordsByBlock`
  of `~/Bureau/myggv` must stay unauthenticated and keep their response shape (`anyApi` is
  untyped, `tsc` cannot see a change).
- **Routing and map**: never `abort()` in the cleanup of `useRouting`'s effect, never a
  debounce; map layers are created once in the `load` handler and fed by `setData`, never
  behind an `isStyleLoaded()` early return.
- **OSRM hosts are FOSSGIS servers**: one request per second at most, no API key, a
  User-Agent naming the app on native. Keep "© OpenStreetMap", "Fix the map" and the privacy
  link surfaces on both clients.
- **PWA update**: `registerType: "autoUpdate"` and `self.skipWaiting()` in `src/sw.ts` go
  together; no periodic `registration.update()`, no "Update" button in `UpdateToast`.
- **Banned**: `react-map-gl`, `@turf/turf`, `react-router-dom`, Context, Redux, Zustand,
  any animation library (web: CSS `@keyframes`; mobile: `Animated`).
- **UI content**: every string in `COPY` (turn steps in `TURN_LABELS`), English plus a
  Tagalog gloss, button labels English only. Icons only from `ICONS`: no emoji, no Unicode
  arrow.
- **Colour and CSS**: text contrast is computed against paper or sign green, no `opacity`
  on text, `--ggv-color-secondary` never text, no CSS needing Safari 17+ (iPhone 8 and X
  stay on iOS 16.7).
- **Location is foreground only**; `NSMotionUsageDescription` stays set (App Store Connect
  rejected a build without it); "Continue without GPS" stays reachable.
- **Deploy**: keep `run_worker_first: ["/tiles/*"]` (`rangeWorker.ts` answers `Range` with
  `206`). A local deploy sets `CLOUDFLARE_API_TOKEN` from `CHARLESBOURGAULT_CLOUDFLARE_API_TOKEN`
  (the ambient token is another one).
- **Verification**: a green `vp run gate` does not prove navigation works. Purge the service
  worker before a browser check; `page.on('console')` captures nothing: "zero error" proves nothing.
