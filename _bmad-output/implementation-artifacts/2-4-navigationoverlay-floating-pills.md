# Story 2.4: NavigationOverlay → Floating Pills (NavTopPill + NavBottomStrip)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor actively navigating to a lot,
I want the navigation UI to appear as compact floating elements rather than a full overlay,
So that I can see more of the village map while following my route.

## Acceptance Criteria

1. **Given** the NavigationOverlay has been extracted to its own file (Story 2.1 complete) **When** the navigation state is active (`navState === 'navigating'`) **Then** a `NavTopPill` element is visible at the top of the screen showing: turn icon, distance to next turn, and a Cancel button (✕) **And** a `NavBottomStrip` element is visible at the bottom of the screen showing: destination name and compass direction/bearing **And** the full village map canvas is visible behind both pill elements (not obscured by a full-screen overlay)

2. **Given** the NavTopPill is rendered **When** its styles are inspected **Then** it uses glass-morphism styling (`backdrop-filter: blur(10px)` with semi-transparent background `rgba(255, 255, 255, 0.85)`) **And** it is positioned fixed at the top of the screen with `env(safe-area-inset-top)` **And** devices without `backdrop-filter` support fall back to `rgba(255, 255, 255, 0.95)` solid background

3. **Given** the NavBottomStrip is rendered **When** its styles are inspected **Then** it slides up from the bottom via Framer Motion animation (`initial={{ y: 100 }}`, `animate={{ y: 0 }}`) **And** it respects `env(safe-area-inset-bottom)` for notch/home indicator safe area **And** the Cancel button meets the minimum touch target size of 44px (`var(--ggv-touch-target-min)`)

4. **Given** the user is navigating and the next turn is calculated **When** the `currentStep` is updated in real-time **Then** the NavTopPill updates the turn instruction and distance without layout shift

5. **Given** the user arrives at the destination (<15m) **When** arrival is detected **Then** the NavTopPill and NavBottomStrip animate out and the ArrivedOverlay animates in smoothly

6. **Given** the implementation is complete **When** `bun run lint && bun run build` is executed **Then** both pass with zero errors **And** on a real Android device, the navigation UI shows the map with floating pills (not a blocking overlay) **And** all existing navigation behavior (FR12-FR19) continues to function correctly

## Tasks / Subtasks

- [x] Task 1: Add glass-morphism design tokens to `design-tokens.css` (AC: #2, #3)
  - [x] 1.1 Add `--ggv-glass-bg: rgba(255, 255, 255, 0.85)` — glass-morphism background
  - [x] 1.2 Add `--ggv-glass-bg-fallback: rgba(255, 255, 255, 0.95)` — solid fallback for devices without backdrop-filter
  - [x] 1.3 Add `--ggv-shadow-pill: 0 2px 12px rgba(0, 0, 0, 0.15)` — pill shadow (lighter than `--ggv-shadow-overlay`)
  - [x] 1.4 Verify no duplicate tokens — each token defined exactly once

- [x] Task 2: Add compass `heading` state to App.tsx (AC: #1)
  - [x] 2.1 Add `const [heading, setHeading] = useState<number | null>(null)` state in App.tsx
  - [x] 2.2 In the orientation effect (Effect 2, ~line 167), call `setHeading(heading)` alongside the existing `map.jumpTo()` — expose the compass heading that's already being calculated
  - [x] 2.3 Pass `heading` as a new prop to `<NavigationOverlay>`
  - [x] 2.4 Verify: heading state updates are throttled by the existing THROTTLE_MS (250ms) and MIN_DELTA (3°) guards — no extra re-renders

- [x] Task 3: Refactor NavigationOverlay.tsx — split into NavTopPill + NavBottomStrip (AC: #1, #4)
  - [x] 3.1 Update `NavigationOverlayProps` interface: add `heading: number | null` prop
  - [x] 3.2 Replace the single `<m.div className="navigation-overlay">` with a React Fragment `<>` containing two `<m.nav>` elements
  - [x] 3.3 **NavTopPill element** — `<m.nav className="nav-top-pill">`:
    - Left slot: turn icon (`currentStep.icon` or `↑`) + turn instruction text (e.g., "Turn left") truncated
    - Center slot: distance to next turn (`currentStep.distanceToStep` + "m") or total `distanceRemaining` if no step
    - Right slot: Cancel button (✕) with `onClick={onCancel}`, `aria-label="Cancel navigation"`
  - [x] 3.4 **NavBottomStrip element** — `<m.nav className="nav-bottom-strip">`:
    - Left slot: destination pin icon (📍) + `destination?.name` truncated with ellipsis
    - Right slot: compass direction + bearing (e.g., "NE 42°") from `heading` prop, or `formatDistance(distanceRemaining)` if `heading` is null (orientation denied)
  - [x] 3.5 Add `formatBearing(degrees: number): string` helper inside component — converts degrees to cardinal direction string (N, NE, E, SE, S, SW, W, NW) + rounded degrees
  - [x] 3.6 Keep `currentStep` calculation logic (IIFE) — unchanged, still feeds NavTopPill
  - [x] 3.7 Keep `formatDistance` helper — unchanged, still used for distance display
  - [x] 3.8 Keep zoom handlers (`handleZoomIn`, `handleZoomOut`) — move zoom controls outside pills as separate floating element
  - [x] 3.9 Route source indicator (`routeSource.toUpperCase()`) — move to NavBottomStrip as subtle label or remove entirely (it's developer info, not user-facing)

- [x] Task 4: Update Framer Motion animations (AC: #3, #5)
  - [x] 4.1 NavTopPill animation: `initial={{ y: -80, opacity: 0 }}`, `animate={{ y: 0, opacity: 1 }}`, `exit={{ y: -80, opacity: 0 }}` — slides down from top
  - [x] 4.2 NavBottomStrip animation: `initial={{ y: 80, opacity: 0 }}`, `animate={{ y: 0, opacity: 1 }}`, `exit={{ y: 80, opacity: 0 }}` — slides up from bottom
  - [x] 4.3 Verify `AnimatePresence` in App.tsx wraps both pill elements correctly (they share the same `key="navigating"` — use a wrapper Fragment or two separate keys)
  - [x] 4.4 Transition timing: `transition={{ type: "spring", damping: 25, stiffness: 300 }}` — matches existing modal spring feel
  - [x] 4.5 Test arrival transition: pills animate out, then ArrivedOverlay animates in — no visual overlap

- [x] Task 5: Replace navigation CSS — glass-morphism pills (AC: #2, #3)
  - [x] 5.1 **Replace** `.navigation-overlay` (app.css ~line 1042) with `.nav-top-pill`
  - [x] 5.2 **Add** `.nav-bottom-strip`
  - [x] 5.3 **Add** `@supports not (backdrop-filter: blur(10px))` fallback for both pills
  - [x] 5.4 **Update** internal element styles: `.nav-turn-icon`, `.nav-turn-dist`, `.nav-cancel-btn`, `.nav-dest-name` — adjusted for pill layout
  - [x] 5.5 **Add** `.nav-compass-text` style for bottom strip compass display
  - [x] 5.6 **Keep** `.nav-map-controls` and `.map-control-btn` CSS unchanged
  - [x] 5.7 **Remove** old `.nav-header-compact`, `.nav-center`, `.nav-source` styles
  - [x] 5.8 **Keep** `.compass-ring`, `.compass-arrow` CSS (currently unused)
  - [x] 5.9 **Update** desktop enhancement section — pill overrides for wider screens

- [x] Task 6: Semantic HTML and accessibility (AC: #1, #2, #3)
  - [x] 6.1 Use `<nav>` element (not `<div>`) for both pills with `aria-label`
  - [x] 6.2 NavTopPill: `<nav className="nav-top-pill" aria-label="Navigation info">`
  - [x] 6.3 NavBottomStrip: `<nav className="nav-bottom-strip" aria-label="Destination info">`
  - [x] 6.4 Turn instruction text: `aria-live="polite"` — screen readers announce instruction changes
  - [x] 6.5 Compass/distance text: `aria-live="off"` — changes too frequently for screen readers
  - [x] 6.6 Cancel button: `aria-label="Cancel navigation"`, min 44×44px touch target
  - [x] 6.7 Destination name: `aria-label` on the bottom strip with destination name

- [x] Task 7: Ensure pills don't overlap MapLibre controls (AC: #1)
  - [x] 7.1 Verify NavTopPill `top` offset clears the GGV logo watermark (z-index 800)
  - [x] 7.2 Verify NavBottomStrip `bottom` offset doesn't overlap MapLibre attribution
  - [x] 7.3 Verify zoom controls (`.nav-map-controls`, positioned right center) don't overlap either pill
  - [x] 7.4 Test on both short (640px) and tall (900px) screens — pills must not touch each other

- [x] Task 8: Final validation (AC: #1-#6)
  - [x] 8.1 Run `bun run lint` — zero errors
  - [x] 8.2 Run `tsc --noEmit` — zero TypeScript errors
  - [x] 8.3 Run `bun run build` — successful build, bundle sizes maintained (main 23.14 KB gzip, maps 281.64 KB gzip)
  - [x] 8.4 Verify NavTopPill renders: turn icon + distance + cancel button — glass-morphism visible
  - [x] 8.5 Verify NavBottomStrip renders: destination name + compass/distance — glass-morphism visible
  - [x] 8.6 Verify map canvas is fully visible behind both pills (no blocking overlay)
  - [x] 8.7 Verify cancel button returns to welcome state
  - [x] 8.8 Verify arrival transition: pills animate out → ArrivedOverlay animates in
  - [x] 8.9 Verify turn instructions update in real-time without layout shift
  - [x] 8.10 Verify zoom controls still work (zoom in/out via custom buttons)
  - [x] 8.11 Visual regression: all 5 other overlays unchanged (GPS, Welcome, Orientation, Arrived, Exit)
  - [x] 8.12 Test on real Android device — glass-morphism renders or falls back to solid background

## Dev Notes

### Critical Architecture Constraints

- **This is a UI refactoring of NavigationOverlay only.** The 5 other overlays (GPS, Welcome, Orientation, Arrived, Exit) remain UNCHANGED — zero modifications.
- **Hooks stay unchanged.** `useMapSetup`, `useRouting`, `useNavigation` — zero changes to hook logic, return types, or thresholds. The only hook-adjacent change is exposing the compass `heading` as React state in App.tsx.
- **Design Tokens system (Story 2.3) is the foundation.** All new CSS values MUST use `--ggv-*` tokens. Add new tokens to `design-tokens.css` for glass-morphism values.
- **Component stays as one file.** `NavigationOverlay.tsx` renders both pills internally — do NOT create separate `NavTopPill.tsx` / `NavBottomStrip.tsx` files. This keeps the existing logic (currentStep calculation, formatDistance, zoom handlers) co-located.
- **No new hooks.** The compass heading is exposed as state in App.tsx (where orientation effect already exists) and passed as a prop to NavigationOverlay.
- **No new dependencies.** Glass-morphism is pure CSS (`backdrop-filter`). No polyfills, no libraries.
- **React Compiler optimization preserved.** Do NOT add `React.memo()` wrappers. Do NOT change any other component signatures.
- **Bilingual text pattern**: If any new user-facing strings are added, they must include English + Tagalog.

### Design Decisions

#### 1. Top Pill vs Bottom Strip Content Layout (UX Spec Authority)

The epics description and UX spec have slightly different content assignments. **Follow the UX Design Specification** as the authoritative source:

| Element | Content | Source |
|---------|---------|--------|
| **NavTopPill** (top) | Turn icon + instruction, distance to next turn, Cancel ✕ | [UX Spec: Custom Components → NavTopPill] |
| **NavBottomStrip** (bottom) | Destination icon + name, compass direction + bearing | [UX Spec: Custom Components → NavBottomStrip] |

#### 2. Compass Heading Display

The current codebase applies compass heading directly to `map.jumpTo()` in an App.tsx effect (~line 246) but does NOT expose it as React state. For the bottom strip compass display:

**Approach:** Add `heading` state to App.tsx, set it in the existing orientation effect alongside `map.jumpTo()`. The throttling (250ms + 3° delta) is already in place, so adding `setHeading()` is nearly free — it only fires when the heading actually changes significantly.

**Fallback:** When `heading` is null (orientation permission denied, or device doesn't support orientation), the bottom strip shows total `distanceRemaining` instead of compass bearing. This matches the UX spec: "No compass (orientation denied): Right slot shows distance remaining instead of bearing."

#### 3. Zoom Controls Placement

The current NavigationOverlay embeds custom zoom controls (`.nav-map-controls`) as a separate `<div>` with `position: fixed; right: 1rem; top: 50%`. These are NOT part of the pill layout. **Keep them as-is** — they already have correct z-index (`--ggv-z-map-controls: 100`) and positioning. Just ensure they render alongside the pills in the updated JSX structure.

#### 4. Route Source Indicator

The current overlay shows `routeSource.toUpperCase()` (OSRM, ORS, DIRECT) as a small label. This is developer-facing information, not useful for visitors. **Options:**
- Move to bottom strip as a subtle indicator (smallest font, gray text)
- Remove entirely from UI (keep in console log only)
- **Recommendation:** Remove from visible UI — it provides no value to delivery riders

#### 5. AnimatePresence Strategy

Currently, `<NavigationOverlay key="navigating">` is wrapped in `<AnimatePresence mode="wait">` in App.tsx. With the refactoring to two pills:

**Option A (recommended):** Keep `NavigationOverlay` as a single component returning a Fragment with two `<m.nav>` elements. The parent `AnimatePresence` wraps the single component. Framer Motion will animate both children together.

**Option B:** If AnimatePresence doesn't handle Fragment children well, wrap both pills in a `<m.div>` with no visible styling, just as an animation container.

### Glass-Morphism Specification

From the UX Design Specification:

```css
/* Glass-morphism shared pattern for both pills */
background: rgba(255, 255, 255, 0.85);      /* Semi-transparent white */
backdrop-filter: blur(10px);                  /* Frosted glass effect */
-webkit-backdrop-filter: blur(10px);          /* Safari prefix */
border-radius: 1.5rem;                        /* Pill shape → var(--ggv-radius-xl) */
box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);  /* Subtle shadow → var(--ggv-shadow-pill) */

/* Fallback for budget devices without backdrop-filter */
@supports not (backdrop-filter: blur(10px)) {
  background: rgba(255, 255, 255, 0.95);     /* Nearly opaque white */
}
```

**Performance note:** `backdrop-filter` can cause jank on low-end devices. The `@supports` fallback ensures a solid background on devices that don't support it. Test on budget Android (e.g., Samsung A-series) to verify performance.

### NavTopPill States

| State | Turn Icon | Distance Text | Notes |
|-------|-----------|---------------|-------|
| **Default** (step available) | `currentStep.icon` (e.g., ↰) | `{currentStep.distanceToStep}m` | Normal turn-by-turn |
| **No step** (continue straight) | `↑` (straight arrow) | `formatDistance(distanceRemaining)` | Between turns or no significant steps |
| **Recalculating** | Same as above | Optional subtle pulse animation | Route being recalculated |
| **Direct line** (no route) | Hidden | "Head toward destination" | OSRM + ORS both failed |

### NavBottomStrip States

| State | Left Slot | Right Slot | Notes |
|-------|-----------|------------|-------|
| **Default** (compass available) | 📍 `{destination.name}` | `{cardinal} {degrees}°` (e.g., "NE 42°") | Compass heading from device |
| **No compass** (orientation denied) | 📍 `{destination.name}` | `formatDistance(distanceRemaining)` | Fallback to distance |
| **No destination** | "Navigating..." | Same as relevant state | Edge case — should not normally occur |

### Z-Index Coordination (Verified)

| Element | Z-Index Token | Value | Position |
|---------|---------------|-------|----------|
| Map canvas | `--ggv-z-map` | 0 | Base layer |
| Map controls (zoom, pitch) | `--ggv-z-map-controls` | 100 | Right center (custom) |
| MapLibre native controls | (inline) | ~10 | Bottom-right (attribution) |
| GGV Logo | `--ggv-z-logo` | 800 | Top center watermark |
| **NavTopPill** | `--ggv-z-nav` | **900** | **Top, inset 1rem** |
| **NavBottomStrip** | `--ggv-z-nav` | **900** | **Bottom, inset 1rem** |
| Gate overlays | `--ggv-z-overlay` | 1000 | Full screen |

### New Design Tokens to Add

| Token | Value | Category | Usage |
|-------|-------|----------|-------|
| `--ggv-glass-bg` | `rgba(255, 255, 255, 0.85)` | Colors | Glass-morphism background |
| `--ggv-glass-bg-fallback` | `rgba(255, 255, 255, 0.95)` | Colors | Solid fallback (no backdrop-filter) |
| `--ggv-shadow-pill` | `0 2px 12px rgba(0, 0, 0, 0.15)` | Shadows | Pill shadow (lighter than overlay shadow) |

### Existing Tokens Used (from design-tokens.css)

| Token | Value | Usage in This Story |
|-------|-------|---------------------|
| `--ggv-z-nav` | 900 | Both pills z-index |
| `--ggv-radius-xl` | 1.5rem | Pill border-radius |
| `--ggv-space-md` | 1rem | Pill left/right inset |
| `--ggv-space-xs` | 0.25rem | Icon gaps |
| `--ggv-font-size-sm` | 0.875rem | Turn text, destination name, compass |
| `--ggv-font-size-base` | 1rem | Distance display |
| `--ggv-font-weight-bold` | 700 | Distance emphasis |
| `--ggv-font-weight-semibold` | 600 | Turn distance |
| `--ggv-font-primary` | "Madimi One"... | All pill text |
| `--ggv-color-text` | #121212 | Primary text color |
| `--ggv-color-primary` | #50aa61 | Turn icon, distance accent |
| `--ggv-color-error` | #ef4444 | Cancel button background |
| `--ggv-color-surface` | #f4f4f4 | Cancel button icon color |
| `--ggv-color-gray-light` | #9ca3af | Route source label (if kept) |
| `--ggv-touch-target-min` | 2.75rem (44px) | Cancel button min size |
| `--ggv-transition-normal` | 0.2s ease | Button transitions |
| `--ggv-shadow-control` | 0 2px 8px... | Zoom control buttons |

### Current NavigationOverlay Code Analysis

**File:** `src/components/NavigationOverlay.tsx` (114 LOC)

**Current structure:**
```
<m.div className="navigation-overlay">           ← REPLACE (full top bar)
  <div className="nav-header-compact">            ← REMOVE (top bar layout)
    <div className="nav-turn">                    ← MOVE → NavTopPill (left)
    <div className="nav-center">                  ← SPLIT between pills
      <div className="nav-dest-name">             ← MOVE → NavBottomStrip (left)
      <div className="nav-remaining">             ← MOVE → NavTopPill (center)
      <div className="nav-source">                ← REMOVE (or move to strip)
    <button className="nav-cancel-btn">           ← MOVE → NavTopPill (right)
  <div className="nav-map-controls">              ← KEEP (separate floating element)
```

**Target structure:**
```
<>
  <m.nav className="nav-top-pill">                ← NEW (glass-morphism top)
    <div className="nav-turn">                    ← turn icon + instruction
    <div className="nav-distance">                ← distance to next turn
    <button className="nav-cancel-btn">           ← cancel button (44px)
  </m.nav>

  <m.nav className="nav-bottom-strip">            ← NEW (glass-morphism bottom)
    <div className="nav-destination">             ← 📍 destination name
    <div className="nav-compass-text">            ← compass direction or distance
  </m.nav>

  <div className="nav-map-controls">              ← UNCHANGED (zoom controls)
</>
```

**Logic preserved (no changes):**
- `formatDistance()` — distance formatting (m/km)
- `currentStep` IIFE — step calculation using `getDistanceAlongRoute()`
- `handleZoomIn()` / `handleZoomOut()` — map zoom via `map.easeTo()`

**New logic added:**
- `formatBearing(degrees)` — converts compass degrees to "NE 42°" format

### Current CSS to Replace (app.css lines 1042-1198)

**Remove/replace:**
- `.navigation-overlay` (line 1042) → replaced by `.nav-top-pill`
- `.nav-header-compact` (line 1055) → removed (layout was for top bar)
- `.nav-center` (line 1081) → removed (content split between pills)

**Keep as-is:**
- `.nav-turn`, `.nav-turn-icon`, `.nav-turn-dist` — still used in top pill
- `.nav-cancel-btn`, `.nav-cancel-btn svg` — still used in top pill
- `.nav-map-controls`, `.map-control-btn`, `.map-control-btn:active`, `.map-control-btn svg` — separate floating element
- `.compass-ring`, `.compass-arrow`, `.compass-arrow svg` — keep (currently unused but don't remove)

**Modify:**
- `.nav-dest-name` → rename to `.nav-dest-text` or keep name, adjust for bottom strip context
- `.nav-remaining` → adjust for top pill context (may rename to `.nav-distance`)

### App.tsx Changes Summary

**Minimal changes — only heading state exposure:**

1. **Add state:** `const [heading, setHeading] = useState<number | null>(null)`
2. **In orientation effect (~line 240):** Add `setHeading(heading)` after `lastBearing = heading` and before `map.jumpTo()`
3. **In NavigationOverlay render (~line 334):** Add `heading={heading}` prop
4. **Reset heading when leaving navigation:** In `onCancel` callback, optionally reset `setHeading(null)` (not required, but clean)

**No changes to:**
- State machine
- Other overlay renders
- Hook calls
- AnimatePresence configuration

### Previous Story Intelligence (Story 2.3 Learnings)

- **Design tokens are fully operational.** All `--ggv-*` tokens are in `design-tokens.css`, imported first in `app.css`. New tokens added to `design-tokens.css` will be available immediately.
- **Backward-compatible aliases exist.** Old vars like `--color-green` alias to `--ggv-*` tokens in `app.css` `:root`.
- **Build sizes baseline:** main 22.71 KB gzip, maps 281.64 KB gzip. Adding 3 CSS tokens and refactoring JSX should have negligible impact.
- **Commit pattern:** `feat: NavigationOverlay floating pills (Story 2.4)`. Expected: one `feat:` commit + optional `fix:` for code review corrections.
- **GpsPermissionOverlay inline style was fixed in 2.3.** All inline styles are gone from overlays. Do NOT introduce new inline styles in this story.
- **Story 2.3 code review added 8 new tokens.** Demonstrates that adding tokens post-creation is normal during review cycles.
- **The .navigation-overlay desktop media query** at line 1235 needs to be updated too.

### Git Intelligence (Recent Commits)

```
0b63e88 feat: CSS design token system (Story 2.3)
b48b7af fix: code review fixes for Story 2.2 — type deduplication, iOS type augmentations
93a27f6 feat: TypeScript strict mode migration (Story 2.2)
643e279 fix: code review fixes for Story 2.1 — shadow rename, docs update
b7edd7e 3.0.2
```

**Key observations:**
- This is the LAST story in Epic 2 — completing it enables Epic 2 retrospective
- All 3 previous stories (2.1, 2.2, 2.3) are done and reviewed
- Consistent pattern: `feat:` commit then `fix:` (code review) commit
- GitHub Actions deploy on push to main — CSS/JS changes auto-deploy
- Version currently 3.0.2 — no version bump expected (this is UX refinement, not a new user feature)

### Project Structure Notes

- Aligns with Architecture Decision 4.3: NavigationOverlay refactor to floating pills (Phase 2)
- Architecture explicitly names `NavTopPill` and `NavBottomStrip` as the two floating elements [Source: architecture.md, Decision 4.3]
- UX Spec Direction 3 (Full Map First) applies ONLY to navigation state — all other states use Direction 1 (Current Refined) [Source: ux-design-specification.md, Chosen Direction]
- Glass-morphism token `--ggv-glass-bg` was specified in architecture [Source: architecture.md, line 383] but NOT created in Story 2.3 — must be created in this story
- Z-index 900 (`--ggv-z-nav`) is already reserved and used for the current navigation overlay — no z-index conflict
- No new files created — only `design-tokens.css`, `app.css`, `NavigationOverlay.tsx`, and `App.tsx` are modified
- No conflict with existing project structure

### What NOT to Do

- Do NOT change any of the 5 other overlay components (GPS, Welcome, Orientation, Arrived, Exit)
- Do NOT modify hook logic (`useMapSetup`, `useRouting`, `useNavigation`) — zero hook changes
- Do NOT create separate component files for NavTopPill and NavBottomStrip — keep them inside NavigationOverlay.tsx
- Do NOT add new hooks — the heading state goes in App.tsx directly
- Do NOT add CSS frameworks, PostCSS, Sass, or styled-components
- Do NOT add `prefers-reduced-motion` media query (Phase 3 per UX spec)
- Do NOT add `React.memo()` wrappers — React Compiler handles optimization
- Do NOT add error modals or toast notifications during navigation (silent error recovery pattern)
- Do NOT change arrival threshold (15m) or deviation threshold (25m) — these are in hooks, not overlays
- Do NOT add splash screens, tutorials, or onboarding UI (UX anti-patterns)
- Do NOT remove the `routeSource` prop even if removing it from visible UI — keep for future debug use
- Do NOT change `fonts.css` or `maplibre-gl.css`
- Do NOT change Framer Motion variants in `src/lib/animations.ts` — the pills use inline animation props, not shared variants

### Verification Checklist

After implementation, verify:
- [ ] `design-tokens.css` has 3 new tokens: `--ggv-glass-bg`, `--ggv-glass-bg-fallback`, `--ggv-shadow-pill`
- [ ] `NavigationOverlay.tsx` renders two `<m.nav>` elements (top pill + bottom strip) instead of one `<m.div>`
- [ ] `App.tsx` has `heading` state and passes it to `<NavigationOverlay heading={heading} />`
- [ ] NavTopPill shows: turn icon + distance + cancel button
- [ ] NavBottomStrip shows: destination name + compass bearing (or distance if no compass)
- [ ] Both pills have glass-morphism (`backdrop-filter: blur(10px)`)
- [ ] `@supports not` fallback provides solid background on unsupported devices
- [ ] Safe area insets respected: `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`
- [ ] Cancel button is 44px minimum (`var(--ggv-touch-target-min)`)
- [ ] Zoom controls still render and function
- [ ] Map canvas is fully visible behind pills (no blocking overlay)
- [ ] `bun run lint` — zero errors
- [ ] `tsc --noEmit` — zero TypeScript errors
- [ ] `bun run build` — success, bundle sizes maintained
- [ ] Arrival transition works: pills out → ArrivedOverlay in
- [ ] Other 5 overlays completely unchanged
- [ ] Desktop media query updated for new pill classes

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 2.4 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md — Decision 4.3: Navigation Overlay Refactor to floating pills]
- [Source: _bmad-output/planning-artifacts/architecture.md — CSS custom properties namespace `--ggv-{category}-{name}`, line 381]
- [Source: _bmad-output/planning-artifacts/architecture.md — Glass-morphism token `--ggv-glass-bg`, line 383]
- [Source: _bmad-output/planning-artifacts/architecture.md — Component boundary rules: overlays are pure display + callback, line 817]
- [Source: _bmad-output/planning-artifacts/architecture.md — NavigationOverlay props: bearing, distanceRemaining, nextTurn, onCancel, onExit, line 801]
- [Source: _bmad-output/planning-artifacts/architecture.md — Data flow: useNavigation → bearing → NavigationOverlay props, line 870]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Chosen Direction: Direction 3 (Full Map First) for active navigation]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — NavTopPill CSS specification and content slots]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — NavBottomStrip CSS specification and content slots]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Glass-morphism: rgba(255,255,255,0.85), backdrop-filter blur(10px)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Z-index coordination: 900 for nav pills, 1000 for gate overlays, 0 for map]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Accessibility: aria-live="polite" for turn instructions, cancel button 44px]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — @supports fallback for budget devices without backdrop-filter]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Semantic HTML: <nav> element with aria-label for pills]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Feedback patterns: silent error recovery during navigation]
- [Source: _bmad-output/implementation-artifacts/2-3-css-design-token-system.md — Build baseline: main 22.71 KB, maps 281.64 KB]
- [Source: _bmad-output/implementation-artifacts/2-3-css-design-token-system.md — Commit pattern: feat: description (Story X.Y)]
- [Source: _bmad-output/implementation-artifacts/2-3-css-design-token-system.md — Token naming convention: --ggv-{category}-{name}]
- [Source: _bmad-output/project-context.md — Rule #2: MapLibre native API only, no wrappers]
- [Source: _bmad-output/project-context.md — Rule #3: Simple useState only, no Context/Redux]
- [Source: _bmad-output/project-context.md — Rule #12: Hooks only, no class components]
- [Source: CLAUDE.md — Architecture: NavigationOverlay → floating pills (Phase 2)]
- [Source: CLAUDE.md — Forbidden libraries: no CSS frameworks]
- [Source: CLAUDE.md — Navigation state machine: 6 states with conditional rendering]
- [Source: src/components/NavigationOverlay.tsx — Current implementation: 114 LOC, top bar layout]
- [Source: src/styles/app.css — Current nav CSS: lines 1042-1198]
- [Source: src/styles/design-tokens.css — 59 existing tokens, no glass-morphism tokens]
- [Source: src/App.tsx — Compass heading in effect ~line 167-260, not exposed as state]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- ESLint caught unused `routeSource` variable — fixed by renaming to `_routeSource` in destructuring (prop kept in interface)
- `RouteStep` type has no `instruction` field — derived turn instruction text from `type` + `modifier` fields

### Completion Notes List

- Task 1: Added 3 glass-morphism design tokens (`--ggv-glass-bg`, `--ggv-glass-bg-fallback`, `--ggv-shadow-pill`) to `design-tokens.css`. Each defined exactly once.
- Task 2: Exposed compass `heading` as React state in App.tsx. Added `setHeading(heading)` in orientation effect (throttled by existing THROTTLE_MS/MIN_DELTA guards). Passed as prop to NavigationOverlay. Reset to null on cancel.
- Task 3: Refactored NavigationOverlay from single `<m.div>` top bar to Fragment with two `<m.nav>` pills + separate zoom controls. Added `formatBearing()` helper. Derived turn instruction from step `type`/`modifier`. Removed `routeSource` from visible UI (kept in props).
- Task 4: NavTopPill slides from top (`y: -80`), NavBottomStrip slides from bottom (`y: 80`). Spring transition with `damping: 25, stiffness: 300`.
- Task 5: Replaced `.navigation-overlay` with `.nav-top-pill` and `.nav-bottom-strip` using glass-morphism CSS. Added `@supports not` fallback. Removed `.nav-header-compact`, `.nav-center`, `.nav-source`. Added `.nav-turn-text`, `.nav-dest-icon`, `.nav-dest-text`, `.nav-compass-text`. Updated desktop media query.
- Task 6: Semantic `<nav>` elements with `aria-label`, `aria-live="polite"` on turn text, `aria-live="off"` on compass, cancel button 44px touch target.
- Task 7: Z-index coordination verified. Pills at z-900 above logo (800) and map controls (100). Safe area insets respected.
- Task 8: `bun run lint` zero errors, `tsc --noEmit` zero errors, `bun run build` success. Bundle: main 23.14 KB gzip (+0.43 KB), maps 281.64 KB gzip (unchanged).

### Implementation Plan

Replaced the full-width NavigationOverlay top bar with two floating glass-morphism pills:
- **NavTopPill** (top): Turn icon + instruction text + distance to next turn + cancel button
- **NavBottomStrip** (bottom): Destination pin + name + compass bearing (or distance fallback)
- Map canvas fully visible behind both pills
- Compass heading exposed from existing orientation effect as React state
- No new dependencies, no new files, no hook changes

### Change Log

- 2026-02-26: Implemented Story 2.4 — NavigationOverlay floating pills refactoring (8 tasks completed)
- 2026-02-26: Code review fixes — 4 issues fixed (1 HIGH, 3 MEDIUM)

### File List

- `src/styles/design-tokens.css` — Added 3 glass-morphism tokens + 2 pill spacing tokens (review fix)
- `src/App.tsx` — Added `heading` state, `setHeading()` in orientation effect, passed to NavigationOverlay
- `src/components/NavigationOverlay.tsx` — Refactored to NavTopPill + NavBottomStrip layout with formatBearing helper; review fixes: bearing normalization, direct line state, routeSource usage
- `src/styles/app.css` — Replaced navigation CSS with glass-morphism pill styles, updated desktop media query; review fixes: raw values → tokens, cancel button touch feedback
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Status: review → done
- `_bmad-output/implementation-artifacts/2-4-navigationoverlay-floating-pills.md` — Status: done

### Senior Developer Review (AI)

**Reviewer:** Charles (2026-02-26)
**Outcome:** Approved with fixes applied

**Issues Found:** 1 High, 3 Medium, 3 Low — 4 fixed automatically, 3 Low deferred

**Fixes Applied:**
1. **[H1] Raw CSS values → tokens** — Created `--ggv-space-pill-y` (0.625rem) and `--ggv-space-pill-inset` (0.75rem) tokens in design-tokens.css. Replaced all 6 raw value occurrences in app.css (pill positions, padding, gap, desktop media query).
2. **[M1] `formatBearing(360)` → "N 0°"** — Added `% 360` normalization to `Math.round(degrees)` in NavigationOverlay.tsx.
3. **[M2] "Direct line" state** — Restored `routeSource` usage (removed `_` prefix). Added ternary branch for `routeSource === "direct"` showing "Head toward destination" text with hidden turn icon.
4. **[M3] Cancel button touch feedback** — Added `transition: var(--ggv-transition-fast)` and `.nav-cancel-btn:active { transform: scale(0.95) }` matching the existing map control button pattern.

**Low Issues Deferred:**
- [L1] Token naming `--ggv-glass-bg` vs `--ggv-color-glass-bg` — pre-existing in architecture docs
- [L2] "Continue" text missing Tagalog — compact pill space constraint
- [L3] Turn instruction text for non-"turn" types — acceptable for MVP
