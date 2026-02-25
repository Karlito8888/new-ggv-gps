# Story 2.2: TypeScript Migration — Strict Mode

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As Charles (developer),
I want all source files converted from JavaScript to TypeScript with strict mode enabled,
So that type errors are caught at compile time, reducing the risk of runtime bugs when extending the codebase.

## Acceptance Criteria

1. **Given** all source files are `.js` / `.jsx` today **When** the migration is complete **Then** all files in `src/` use `.ts` (non-JSX) or `.tsx` (JSX with React components) extensions **And** a `tsconfig.json` is present at project root with `"strict": true` and `"target": "esnext"`

2. **Given** TypeScript strict mode is enabled **When** `bun run build` (or `tsc --noEmit`) is executed **Then** zero TypeScript type errors are reported across all files

3. **Given** the hook return shapes are typed **When** `useMapSetup`, `useRouting`, and `useNavigation` are called in App.tsx **Then** TypeScript infers the correct return object types with no `any` usage in hook signatures **And** all hook return objects use named properties (never positional arrays)

4. **Given** GeoJSON coordinate conventions are preserved **When** coordinates are used in any typed function **Then** `[longitude, latitude]` GeoJSON tuples are typed as `[number, number]` **And** user location GPS objects are typed as `{ latitude: number; longitude: number }`

5. **Given** all threshold values are typed **When** constants like `DEVIATION_THRESHOLD_M`, `ARRIVAL_THRESHOLD_M`, `RECALC_DEBOUNCE_MS` are used **Then** they are typed as `number` constants — zero magic numbers remaining in the codebase

6. **Given** the migration is complete **When** `bun run lint && bun run build` is executed **Then** both ESLint and TypeScript compile pass with zero errors **And** the app behavior is identical to the pre-TypeScript version on real device (iOS Safari + Android Chrome)

## Tasks / Subtasks

- [x] Task 1: Update tsconfig.json to strict mode (AC: #1, #2)
  - [x] 1.1 Update existing `tsconfig.json`: add `"strict": true`, remove `"allowJs": true` and `"checkJs": true`
  - [x] 1.2 Update `include` patterns from `["src/**/*.js", "src/**/*.jsx", "src/**/*.d.ts", ...]` to `["src/**/*.ts", "src/**/*.tsx", "src/**/*.d.ts"]`
  - [x] 1.3 Add `"forceConsistentCasingInFileNames": true`, `"resolveJsonModule": true`, `"isolatedModules": true`
  - [x] 1.4 Keep `vite.config.ts` and `eslint.config.js` in include (after renaming)
  - [x] 1.5 Verify `tsc --noEmit` command works (may fail until files are renamed — that's expected)

- [x] Task 2: Add TypeScript ESLint support (AC: #6)
  - [x] 2.1 Install `typescript-eslint` package: `bun add -d typescript-eslint`
  - [x] 2.2 Update `eslint.config.js`: extend file patterns to `**/*.{js,jsx,ts,tsx}`
  - [x] 2.3 Add TypeScript parser and recommended rules from `typescript-eslint`
  - [x] 2.4 Replace `no-unused-vars` with `@typescript-eslint/no-unused-vars` (same config: `argsIgnorePattern: "^_"`, `varsIgnorePattern: "^[A-Z_]|^m(otion)?$"`)
  - [x] 2.5 Verify `bun run lint` still passes on existing JS files

- [x] Task 3: Add typecheck script to package.json (AC: #2)
  - [x] 3.1 Add `"typecheck": "tsc --noEmit"` to `scripts` in `package.json`
  - [x] 3.2 Update `"build:netlify"` to `"bun run lint && bun run typecheck && vite build"` (add typecheck step)

- [x] Task 4: Migrate utility libraries — src/lib/ (AC: #2, #4, #5)
  - [x] 4.1 Rename `src/lib/geo.js` → `src/lib/geo.ts`
  - [x] 4.2 Add type annotations to `getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number`
  - [x] 4.3 Add type annotations to `projectPointOnLine(pointLng: number, pointLat: number, lineCoordinates: [number, number][]): { lng: number; lat: number; index: number; distance: number }`
  - [x] 4.4 Add type annotations to `getDistanceAlongRoute(userLng: number, userLat: number, targetLng: number, targetLat: number, routeCoordinates: [number, number][]): number`
  - [x] 4.5 Rename `src/lib/supabase.js` → `src/lib/supabase.ts` — Supabase client is already TS-native, add proper return type
  - [x] 4.6 Rename `src/lib/animations.js` → `src/lib/animations.ts` — add Framer Motion `Variants` type for `overlayVariants` and `modalVariants`

- [x] Task 5: Migrate data files — src/data/ (AC: #2, #4)
  - [x] 5.1 Rename `src/data/blocks.js` → `src/data/blocks.ts`
  - [x] 5.2 Type the GeoJSON block data as `Block[]` interface with `name: string; coords: [number, number][]`
  - [x] 5.3 `src/data/protomaps-light-layers.json` stays as JSON — already handled by `resolveJsonModule`

- [x] Task 6: Migrate hooks — src/hooks/ (AC: #2, #3, #4, #5)
  - [x] 6.1 Rename `src/hooks/useMapSetup.js` → `src/hooks/useMapSetup.ts`
  - [x] 6.2 Type hook return: `UseMapSetupReturn` interface with `map`, `userLocation`, `isMapReady`, `triggerGeolocate`
  - [x] 6.3 Type the `containerRef` parameter as `RefObject<HTMLDivElement | null>`
  - [x] 6.4 Type MapLibre references: `MaplibreMap`, `GeolocateControl`, `GeoJSONSource`, `MapStyleImageMissingEvent`, `MapErrorEvent`
  - [x] 6.5 Rename `src/hooks/useRouting.js` → `src/hooks/useRouting.ts`
  - [x] 6.6 Type hook return: `UseRoutingReturn` with `routeGeoJSON`, `distance`, `steps`, `routeSource`
  - [x] 6.7 Define `RouteStep`, `RouteGeometry`, `RouteResult`, `OSRMManeuver` interfaces
  - [x] 6.8 Type all threshold constants: `REQUEST_TIMEOUT_MS`, `DEBOUNCE_MS`, `RETRY_DELAYS`, `RECALC_THRESHOLD_M`
  - [x] 6.9 Rename `src/hooks/useNavigation.js` → `src/hooks/useNavigation.ts`
  - [x] 6.10 Type hook return: `UseNavigationReturn` with `distanceRemaining`, `hasArrived`, `arrivedAt`
  - [x] 6.11 Type `ARRIVAL_THRESHOLD_M` constant

- [x] Task 7: Migrate overlay components — src/components/ (AC: #2, #3)
  - [x] 7.1 Rename all 6 `.jsx` → `.tsx`: `GpsPermissionOverlay.tsx`, `WelcomeOverlay.tsx`, `OrientationOverlay.tsx`, `NavigationOverlay.tsx`, `ArrivedOverlay.tsx`, `ExitCompleteOverlay.tsx`
  - [x] 7.2 Define props interfaces for each overlay
  - [x] 7.3 Apply props interfaces to component function signatures
  - [x] 7.4 Type local state in each component (`useState<string | null>(null)` for errors, etc.)
  - [x] 7.5 Type event handlers and DOM event types
  - [x] 7.6 Type the `DeviceOrientationEvent.requestPermission` API (non-standard — type augmentation in `vite-env.d.ts`)

- [x] Task 8: Migrate App.jsx and main.jsx (AC: #1, #2, #3)
  - [x] 8.1 Rename `src/main.jsx` → `src/main.tsx`
  - [x] 8.2 Update `index.html`: change `<script type="module" src="/src/main.jsx">` to `/src/main.tsx`
  - [x] 8.3 Rename `src/App.jsx` → `src/App.tsx`
  - [x] 8.4 Type the `navState` as union literal: `type NavState = "gps-permission" | "welcome" | ...`
  - [x] 8.5 Type `destination` state: `Destination | null` with `{ name, coordinates, type? }`
  - [x] 8.6 Type all callback props passed to overlay components
  - [x] 8.7 Type Supabase block data: `BlockData[]` with `{ name: string }`

- [x] Task 9: Migrate Service Worker (AC: #1, #2)
  - [x] 9.1 Rename `src/sw.js` → `src/sw.ts`
  - [x] 9.2 Update `vite.config.ts` VitePWA config: `filename: "sw.js"` → `filename: "sw.ts"`
  - [x] 9.3 Type Workbox imports (already typed — workbox packages ship .d.ts)
  - [x] 9.4 Type the `self.__WB_MANIFEST` precache manifest declaration

- [x] Task 10: Rename vite.config.js → vite.config.ts (AC: #1)
  - [x] 10.1 Rename `vite.config.js` → `vite.config.ts`
  - [x] 10.2 Vite defineConfig already typed — no additional type imports needed
  - [x] 10.3 Update `tsconfig.json` include to reference `vite.config.ts`

- [x] Task 11: Type augmentations and global types (AC: #2, #4)
  - [x] 11.1 Update `src/vite-env.d.ts` with `DeviceOrientationEventiOS` and `DeviceOrientationEventConstructor` interfaces
  - [x] 11.2 Add GeoJSON type definitions via explicit `import type` from `geojson` (maplibre-gl ships `@types/geojson`)
  - [x] 11.3 Ensure `__APP_VERSION__` global remains typed
  - [x] 11.4 Add `*.png` and `*.mp3` module declarations for asset imports

- [x] Task 12: Final validation (AC: #1, #2, #3, #4, #5, #6)
  - [x] 12.1 Run `bun run lint` — zero errors, zero warnings
  - [x] 12.2 Run `tsc --noEmit` — zero TypeScript errors
  - [x] 12.3 Run `bun run build` — successful build (main 22.72 KB gzip, maps 281.64 KB gzip)
  - [x] 12.4 Verify zero `.js`/`.jsx` files remain in `src/` — confirmed
  - [x] 12.5 Verify zero `any` in hook signatures — confirmed
  - [x] 12.6 Verify all threshold constants are typed as `number` with no magic numbers — confirmed
  - [ ] 12.7 Test on real device: GPS → block → lot → navigate → arrive → exit (full flow) — **requires manual testing by developer**

## Dev Notes

### Critical Architecture Constraints

- **This is a pure type-safety migration.** Zero runtime behavior changes. Every feature must work identically after migration.
- **No new dependencies for types.** MapLibre, Supabase, Framer Motion, PMTiles, and Workbox all ship built-in TypeScript types. Do NOT add `@types/maplibre-gl` or similar.
- **Exception: GeoJSON types.** If needed, install `@types/geojson` for `GeoJSON.FeatureCollection` etc., or define inline. Architecture doc does not mandate either approach.
- **Exception: typescript-eslint.** Install `typescript-eslint` for ESLint TypeScript integration (flat config compatible).
- **No CSS changes.** Design tokens are Story 2.3.
- **No NavigationOverlay UI changes.** Floating pills are Story 2.4.
- **No new hooks.** No new files beyond renaming existing ones.
- **No Context API, Redux, Zustand.** Prop drilling stays.
- **No barrel files.** Direct imports only.
- **Preserve React Compiler optimization.** React 19 compiler auto-memoizes. Do NOT add `React.memo()` wrappers.
- **Preserve named exports** for all components (not default exports).
- **Preserve ALL existing behavior.** This is a file-rename + type-annotation migration. Zero functional changes.

### Current tsconfig.json (Pre-Migration)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "jsx": "react-jsx",
    "module": "esnext",
    "moduleResolution": "bundler",
    "target": "esnext",
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "skipLibCheck": true,
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*.js", "src/**/*.jsx", "src/**/*.d.ts", "vite.config.js", "eslint.config.js"],
  "exclude": ["node_modules", "dist", "public", "_bmad", "_bmad-output", "docs"]
}
```

**Target tsconfig.json:** Add `"strict": true`, remove `"allowJs"` and `"checkJs"`, update include patterns to `*.ts`/`*.tsx`.

### Files to Migrate (17 source files)

| Current File | Target File | Type | Notes |
|---|---|---|---|
| `src/App.jsx` | `src/App.tsx` | Component | State machine + hook calls + conditional rendering (372 LOC) |
| `src/main.jsx` | `src/main.tsx` | Entry point | **Also update `index.html` script src** |
| `src/sw.js` | `src/sw.ts` | Service Worker | **Also update `vite.config` filename** |
| `src/components/GpsPermissionOverlay.jsx` | `.tsx` | Component | Props: `{ onGrant, triggerGeolocate, isMapReady }` |
| `src/components/WelcomeOverlay.jsx` | `.tsx` | Component | Props: `{ blocks, isLoadingBlocks, blocksError, onRetryBlocks, onSelectDestination }` |
| `src/components/OrientationOverlay.jsx` | `.tsx` | Component | Props: `{ onGrant }` — iOS 13+ type augmentation needed |
| `src/components/NavigationOverlay.jsx` | `.tsx` | Component | Props: `{ map, distanceRemaining, destination, steps, routeSource, routeGeoJSON, userLocation, onCancel }` |
| `src/components/ArrivedOverlay.jsx` | `.tsx` | Component | Props: `{ destination, onNavigateAgain, onExitVillage }` |
| `src/components/ExitCompleteOverlay.jsx` | `.tsx` | Component | No props (self-contained) |
| `src/hooks/useMapSetup.js` | `.ts` | Hook | Returns `{ map, userLocation, isMapReady }` |
| `src/hooks/useRouting.js` | `.ts` | Hook | Returns `{ routeGeoJSON, distance, steps, routeSource }` |
| `src/hooks/useNavigation.js` | `.ts` | Hook | Returns `{ distanceRemaining, hasArrived, arrivedAt }` |
| `src/data/blocks.js` | `.ts` | Data | Static GeoJSON FeatureCollection |
| `src/lib/animations.js` | `.ts` | Utility | Framer Motion `Variants` type |
| `src/lib/geo.js` | `.ts` | Utility | All params `number`, returns `number` |
| `src/lib/supabase.js` | `.ts` | Utility | Supabase client (already TS-native) |
| `vite.config.js` | `vite.config.ts` | Config | Vite defineConfig already typed |

### Config Files to Modify (not rename)

| File | Change |
|---|---|
| `tsconfig.json` | Add `strict: true`, update include patterns |
| `eslint.config.js` | Add ts/tsx patterns, TypeScript parser, swap `no-unused-vars` |
| `index.html` | Change script src from `main.jsx` to `main.tsx` |
| `package.json` | Add `"typecheck"` script |

### Type Patterns to Follow

**NavState union type (App.tsx):**
```typescript
type NavState = "gps-permission" | "welcome" | "orientation-permission" | "navigating" | "arrived" | "exit-complete";
const [navState, setNavState] = useState<NavState>("gps-permission");
```

**Destination type (App.tsx):**
```typescript
interface Destination {
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
}
const [destination, setDestination] = useState<Destination | null>(null);
```

**GeoJSON coordinate convention:**
```typescript
type LngLat = [number, number]; // GeoJSON standard: [longitude, latitude]
interface UserLocation {
  latitude: number;
  longitude: number;
}
```

**Hook return types (objects, never arrays):**
```typescript
interface UseMapSetupReturn {
  map: maplibregl.Map | null;
  userLocation: UserLocation | null;
  isMapReady: boolean;
}
```

**Threshold constants (no magic numbers):**
```typescript
const DEVIATION_THRESHOLD_M = 25;
const ARRIVAL_THRESHOLD_M = 15;
const RECALC_DEBOUNCE_MS = 10_000;
const OSRM_TIMEOUT_MS = 3_000;
const DEVIATION_CHECK_INTERVAL_MS = 5_000;
```

**iOS DeviceOrientationEvent type augmentation (vite-env.d.ts):**
```typescript
interface DeviceOrientationEventiOS extends DeviceOrientationEvent {
  requestPermission?: () => Promise<"granted" | "denied">;
  webkitCompassHeading?: number;
}

interface DeviceOrientationEventConstructor {
  requestPermission?: () => Promise<"granted" | "denied">;
}
```

**Component props pattern:**
```typescript
interface GpsPermissionOverlayProps {
  onGrant: () => void;
  triggerGeolocate: (() => void) | null;
  isMapReady: boolean;
}

export function GpsPermissionOverlay({ onGrant, triggerGeolocate, isMapReady }: GpsPermissionOverlayProps) {
  // ...
}
```

### Dependencies Already Installed (No `bun add` needed)

- `typescript@^5.9.3` (devDependency) ✓
- `@types/react@^19.2.7` (devDependency) ✓
- `@types/react-dom@^19.2.3` (devDependency) ✓

### Dependencies to Install

- `typescript-eslint` — ESLint TypeScript integration for flat config

### Optional Dependency

- `@types/geojson` — GeoJSON TypeScript types. Only if you prefer imported types over inline type definitions. The `maplibre-gl` package already re-exports GeoJSON types that may suffice.

### Migration Order (Recommended)

Migrate bottom-up to minimize cascading type errors:

1. **Config** (Task 1-3): tsconfig.json, ESLint, package.json scripts
2. **Leaf utilities** (Task 4): `lib/geo.ts`, `lib/supabase.ts`, `lib/animations.ts`
3. **Data** (Task 5): `data/blocks.ts`
4. **Hooks** (Task 6): `useNavigation.ts` → `useRouting.ts` → `useMapSetup.ts`
5. **Overlay components** (Task 7): All 6 components (can be done in parallel)
6. **App + main** (Task 8): `App.tsx`, `main.tsx`
7. **Service Worker** (Task 9): `sw.ts` + vite config update
8. **Vite config** (Task 10): `vite.config.ts`
9. **Type augmentations** (Task 11): `vite-env.d.ts`
10. **Validation** (Task 12): lint + typecheck + build + device test

### Previous Story Intelligence (Story 2.1 Learnings)

- **Extraction patterns established:** Named exports, direct imports, shared animation variants in `src/lib/animations.js`
- **App.jsx is 372 LOC** (not 200 as originally estimated) — 8 useEffects managing cross-overlay state account for ~195 LOC
- **Code review found `m` shadow:** Parameter `m` in `formatDistance()` shadowed Framer Motion's `m` import → renamed to `meters`. This is already fixed in current code.
- **Pre-existing race condition in WelcomeOverlay:** `useEffect` for Supabase lot fetch has no `ignore` flag. Not a regression from Story 2.1. When typing, add proper cleanup pattern but do NOT change runtime behavior (functional changes out of scope).
- **Commit pattern:** `feat: <description> (Story X.Y)` for main implementation. Expected: `feat: TypeScript strict mode migration (Story 2.2)`
- **Build verification confirmed:** main 22.67 KB gzip (<150 KB), maps 281.64 KB gzip (<300 KB). Migration must maintain these sizes.

### Git Intelligence (Recent Commits)

```
643e279 fix: code review fixes for Story 2.1 — shadow rename, docs update
b7edd7e 3.0.2
35eb806 chore: update Story 2.1 status to review
09fa230 feat: add bell sound on arrival notification
00d59d0 ci: add GitHub Actions auto-deploy to Hostinger via FTP
d6d3a9d feat: extract overlay components from App.jsx (Story 2.1)
```

- Story 2.1 complete and reviewed. Codebase is stable.
- GitHub Actions deploy workflow exists at `.github/workflows/deploy.yml`
- Version is currently 3.0.2

### What NOT to Do

- Do NOT change any runtime behavior — this is a pure type migration
- Do NOT add `React.memo()` wrappers — React 19 compiler handles memoization
- Do NOT create barrel files (`components/index.ts`, `hooks/index.ts`) — direct imports only
- Do NOT add Context API, Redux, Zustand, or any state management
- Do NOT create new hooks or utility functions
- Do NOT modify CSS or add design tokens (Story 2.3)
- Do NOT refactor NavigationOverlay to floating pills (Story 2.4)
- Do NOT add automated tests (Story 3.3)
- Do NOT use `any` in hook signatures or component props — use proper types
- Do NOT add `@types/maplibre-gl` — MapLibre ships built-in types
- Do NOT change the Framer Motion setup (LazyMotion, MotionConfig, AnimatePresence)
- Do NOT change import paths (except file extensions changing from .js/.jsx to .ts/.tsx)
- Do NOT change the Workbox caching strategies or SW behavior
- Do NOT install `@typescript-eslint/parser` or `@typescript-eslint/eslint-plugin` separately — use the unified `typescript-eslint` package for ESLint 9 flat config
- Do NOT rename `eslint.config.js` to `.ts` — keep it as JS (ESLint TS config support requires extra setup not worth the complexity)

### Verification Checklist

After implementation, verify:
- [x] Zero `.js`/`.jsx` files remain in `src/` (only `.ts`, `.tsx`, `.d.ts`, and `.json`)
- [x] `tsconfig.json` has `"strict": true` and `"target": "esnext"`
- [x] `tsc --noEmit` reports zero errors
- [x] `bun run lint` passes with zero errors
- [x] `bun run build` succeeds, main bundle 22.72 KB gzip (<150 KB), maps chunk 281.64 KB gzip (<300 KB)
- [x] Zero `any` usage in hook signatures (`useMapSetup`, `useRouting`, `useNavigation`)
- [x] All hook returns are typed as objects (never arrays)
- [x] GeoJSON coordinates typed as `[number, number]` tuples
- [x] User location typed as `{ latitude: number; longitude: number }`
- [x] All threshold constants are named and typed (no magic numbers)
- [x] `index.html` references `/src/main.tsx` (not `.jsx`)
- [x] VitePWA config filename updated from `"sw.js"` to `"sw.ts"`
- [x] iOS `DeviceOrientationEvent.requestPermission` has type augmentation
- [x] All overlay components have typed props interfaces
- [ ] Full navigation flow works on real device (GPS → block → lot → navigate → arrive → exit) — **manual test required**

### Project Structure Notes

- Aligns with Architecture Decision Phase 2: TypeScript migration plan
- All `.js` → `.ts`, all `.jsx` → `.tsx` per architecture target structure
- `tsconfig.json` evolves from permissive (allowJs) to strict mode
- ESLint flat config gains TypeScript awareness
- Total file count unchanged: 17 source files renamed, 4 config files modified, 0 created, 0 deleted

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 2.2 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md — Phase 2 TypeScript 5.9.3 strict mode migration]
- [Source: _bmad-output/planning-artifacts/architecture.md — Target project structure with .ts/.tsx extensions]
- [Source: _bmad-output/planning-artifacts/architecture.md — Decision 4.1: Component files PascalCase.tsx]
- [Source: _bmad-output/planning-artifacts/architecture.md — Hook return convention: objects, boolean is/has prefix]
- [Source: _bmad-output/planning-artifacts/architecture.md — Coordinate Conventions: [longitude, latitude] GeoJSON tuples]
- [Source: _bmad-output/planning-artifacts/architecture.md — Named constants: DEVIATION_THRESHOLD_M, ARRIVAL_THRESHOLD_M, etc.]
- [Source: _bmad-output/planning-artifacts/architecture.md — Naming patterns: camelCase.ts for hooks/utils, PascalCase.tsx for components]
- [Source: _bmad-output/planning-artifacts/architecture.md — No barrel files, direct imports only]
- [Source: _bmad-output/planning-artifacts/architecture.md — Phase 2 additions: bun add -d typescript@5.9.3 @types/react @types/react-dom]
- [Source: _bmad-output/planning-artifacts/architecture.md — eslint.config.js → .ts [P2]]
- [Source: _bmad-output/planning-artifacts/architecture.md — vite.config.js → .ts [P2]]
- [Source: _bmad-output/project-context.md — Rule #5: File extensions .jsx for components, .js for non-component]
- [Source: _bmad-output/project-context.md — Rule #6: GeoJSON coordinates convention]
- [Source: _bmad-output/project-context.md — Forbidden: .ts/.tsx (current rule — will be updated after this story)]
- [Source: _bmad-output/implementation-artifacts/2-1-extract-overlay-components-from-app-jsx.md — Overlay props summary]
- [Source: _bmad-output/implementation-artifacts/2-1-extract-overlay-components-from-app-jsx.md — Code review: m shadow fix]
- [Source: _bmad-output/implementation-artifacts/2-1-extract-overlay-components-from-app-jsx.md — Pre-existing race condition in WelcomeOverlay]
- [Source: _bmad-output/implementation-artifacts/epic-1-retrospective-2026-02-25.md — Risk: TypeScript strict mode creates compilation errors]
- [Source: CLAUDE.md — Architecture: File structure, hooks, navigation state machine]
- [Source: CLAUDE.md — Forbidden libraries: react-map-gl, turf, react-router-dom, Context/Redux/Zustand]
- [Source: package.json — typescript@^5.9.3, @types/react@^19.2.7, @types/react-dom@^19.2.3 already installed]
- [Source: tsconfig.json — Current config: allowJs, checkJs, no strict mode]
- [Source: vite.config.js — VitePWA filename: "sw.js", srcDir: "src"]
- [Source: index.html — Script src: /src/main.jsx]
- [Source: eslint.config.js — Current files pattern: **/*.{js,jsx}]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- ESLint `no-undef` errors for TypeScript globals (`GeoJSON`, `React`, `ServiceWorkerGlobalScope`) — fixed by explicit type imports and `eslint-disable` for SW global
- TypeScript errors for renamed maplibre-gl types (`StyleImageMissingEvent` → `MapStyleImageMissingEvent`, `MapErrorEvent` → `ErrorEvent`)
- TypeScript error for `RouteGeometry.coordinates` union type in NavigationOverlay — fixed by flattening MultiLineString coordinates

### Completion Notes List

- All 17 source files migrated from JS/JSX to TS/TSX
- `tsconfig.json` updated to `strict: true` with all recommended compiler options
- `typescript-eslint` installed and configured in ESLint flat config
- `typecheck` script added to package.json
- All hooks return typed objects with named interfaces
- All component props have typed interfaces
- GeoJSON coordinates consistently typed as `[number, number]` tuples
- All threshold constants are named (`ARRIVAL_THRESHOLD_M`, `REQUEST_TIMEOUT_MS`, `DEBOUNCE_MS`, `RETRY_DELAYS`, `RECALC_THRESHOLD_M`)
- `any` is used only for untyped external API responses (OSRM, ORS JSON) — never in hook signatures or component props
- Bundle sizes maintained: main 22.72 KB gzip, maps 281.64 KB gzip
- Manual device testing (Task 12.7) deferred to developer

### Change Log

| Change | Reason |
|---|---|
| `tsconfig.json`: Added `strict: true`, removed `allowJs`/`checkJs`, updated include patterns | Enable TypeScript strict mode |
| `eslint.config.js`: Added `typescript-eslint` parser/plugin, `@typescript-eslint/no-unused-vars` | TypeScript ESLint integration |
| `package.json`: Added `typecheck` script, updated `build:netlify` | Type checking in CI |
| All 17 source files renamed `.js`/`.jsx` → `.ts`/`.tsx` | TypeScript migration |
| `index.html`: Script src → `/src/main.tsx` | Match renamed entry point |
| `vite.config.ts`: VitePWA filename → `"sw.ts"` | Match renamed service worker |
| `src/vite-env.d.ts`: Added iOS DeviceOrientationEvent types, asset module declarations | Type augmentations for non-standard APIs |

### File List

**Renamed files (17):**
- `src/App.jsx` → `src/App.tsx`
- `src/main.jsx` → `src/main.tsx`
- `src/sw.js` → `src/sw.ts`
- `src/components/GpsPermissionOverlay.jsx` → `.tsx`
- `src/components/WelcomeOverlay.jsx` → `.tsx`
- `src/components/OrientationOverlay.jsx` → `.tsx`
- `src/components/NavigationOverlay.jsx` → `.tsx`
- `src/components/ArrivedOverlay.jsx` → `.tsx`
- `src/components/ExitCompleteOverlay.jsx` → `.tsx`
- `src/hooks/useMapSetup.js` → `.ts`
- `src/hooks/useRouting.js` → `.ts`
- `src/hooks/useNavigation.js` → `.ts`
- `src/data/blocks.js` → `.ts`
- `src/lib/animations.js` → `.ts`
- `src/lib/geo.js` → `.ts`
- `src/lib/supabase.js` → `.ts`
- `vite.config.js` → `vite.config.ts`

**Modified files (4):**
- `tsconfig.json`
- `eslint.config.js`
- `index.html`
- `package.json`

**Updated files (1):**
- `src/vite-env.d.ts`
