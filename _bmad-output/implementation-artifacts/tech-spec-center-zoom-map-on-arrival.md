---
title: 'Center and Zoom Map on Arrival'
slug: 'center-zoom-map-on-arrival'
created: '2026-03-01'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['react-19', 'typescript', 'maplibre-gl-5']
files_to_modify: ['src/App.tsx']
code_patterns: ['map-camera-control', 'navState-effect']
test_patterns: ['manual-device-testing']
---

# Tech-Spec: Center and Zoom Map on Arrival

**Created:** 2026-03-01

## Overview

### Problem Statement

With the new split ArrivedOverlay (v3.0.9), the map is visible between the two mini-modals. However, the camera position at arrival time is wherever the user last navigated — potentially at a tilted angle, off-center, or at navigation zoom level. The user cannot see their precise position relative to the destination, defeating the purpose of the transparent overlay.

### Solution

Add an immediate `map.jumpTo()` call when transitioning to `navState = "arrived"`, centering the camera on the user's current GPS position at zoom level 20 (maximum close-up), with bearing 0 (north-up) and pitch 0 (top-down).

### Scope

**In Scope:**
- Add camera snap (jumpTo) in `App.tsx` when arrival is detected
- Center on `userLocation` coordinates
- Zoom level 20, bearing 0, pitch 0

**Out of Scope:**
- Changes to `exit-complete` state camera behavior
- Animated transitions (flyTo/easeTo) — snap only
- Changes to ArrivedOverlay component
- Changes to useNavigation hook

## Context for Development

### Codebase Patterns

**Camera control pattern** (App.tsx):
- `map.easeTo()` used for smooth transitions (bearing/pitch/zoom)
- `map.jumpTo()` available for instant snaps (no animation)
- Effect at line 179 resets bearing/pitch to 0 when leaving `"navigating"` state
- Arrival effect at line 108 handles state transition + haptic/audio feedback

**UserLocation type** (`useMapSetup.ts:14`):
- `{ latitude: number, longitude: number }` — GPS format
- Must convert to `[longitude, latitude]` for MapLibre `center` parameter

**Existing camera reset** (App.tsx:179-185):
- When `navState` leaves `"navigating"`, `map.easeTo({ bearing: 0, pitch: 0, duration: 300 })` fires
- This effect will STILL fire when transitioning to `"arrived"` — it resets bearing and pitch
- The `jumpTo` is called imperatively in the current render cycle (before `startTransition`). The `easeTo` from the reset effect runs in the next render cycle (after React processes the `setNavState` update). By the time `easeTo` fires, bearing and pitch are already at 0 — making it a no-op.

### Files to Reference

| File | Purpose | Lines of Interest |
| ---- | ------- | ----------------- |
| `src/App.tsx:108-138` | Arrival handling effect | State transition + feedback |
| `src/App.tsx:179-185` | Camera reset effect | bearing/pitch reset on nav exit |
| `src/hooks/useMapSetup.ts:14-17` | UserLocation interface | Coordinate format |

### Technical Decisions

1. **Use `map.jumpTo()` not `easeTo()`** — User explicitly requested instant snap, no animation.
2. **Place jumpTo inside arrival effect** (option A) — Adding to the camera reset effect (line 179) would affect all non-navigating states. The arrival effect is scoped correctly.
3. **jumpTo before setNavState** — The camera snap happens before the overlay renders, so the map is already centered when the split overlay appears.
4. **Only for `navState = "arrived"`** — Not for `"exit-complete"` (village exit destination). The exit-complete overlay uses an opaque yellow gradient backdrop, so the map isn't visible anyway.
5. **Guard on `map`, `isStyleLoaded()`, and `userLocation`** — All must be truthy for `jumpTo` to execute. `isStyleLoaded()` is defensive — the style is guaranteed loaded by arrival time (user navigated successfully) but the guard follows the existing pattern in `useMapSetup.ts:265`. If any check fails, skip silently (the overlay still renders, just without camera repositioning).
6. **Re-execution protection** — The `jumpTo` is placed after `arrivedDestinationRef.current = arrivedAt` (line 125) and is guarded by the early-return at line 120 (`arrivedDestinationRef.current === arrivedAt`). This ensures the `jumpTo` executes exactly once per destination, even if `hasArrived` remains `true` across multiple render cycles.

## Implementation Plan

### Tasks

- [x] **Task 1: Add map.jumpTo() in the arrival handling effect**
  - File: `src/App.tsx`
  - Action: Inside the arrival handling effect (line 108-138), add a `map.jumpTo()` call **before** the `startTransition` block (line 131), guarded by `map && userLocation`. Only execute when `destination?.type !== "exit"` (matching the branch that sets `navState = "arrived"`).
  - Code to add (after line 129, before line 131):
    ```ts
    // Snap map to user position at max zoom for arrival view
    if (map && map.isStyleLoaded() && userLocation) {
      map.jumpTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 20,
        bearing: 0,
        pitch: 0,
      });
    }
    ```
  - Notes: `map` is available in the App component scope (from `useMapSetup`). `userLocation` is also in scope. The `jumpTo` is synchronous — the map state updates immediately before `startTransition` triggers the React re-render with the arrived overlay. `map.jumpTo()` is an imperative MapLibre call, not a React state update — it is intentionally placed outside `startTransition`. The `arrivedDestinationRef` guard (line 120) ensures this code runs exactly once per destination.

### Acceptance Criteria

- [ ] **AC 1**: Given the user is navigating and reaches the destination (< 15m), when the arrived overlay appears, then the map is centered on the user's current GPS position.

- [ ] **AC 2**: Given the arrived overlay is displayed, when the user looks at the map between the two mini-modals, then the zoom level is 20 (maximum close-up, showing individual buildings/houses).

- [ ] **AC 3**: Given the user was navigating with a tilted/rotated map view, when arrival triggers, then the map snaps to bearing 0 (north-up) and pitch 0 (top-down) instantly with no animation.

- [ ] **AC 4**: Given the user navigates to the village exit (destination type "exit"), when exit-complete triggers, then no camera snap occurs (exit-complete has opaque backdrop, map not visible).

- [ ] **AC 5**: Given `userLocation` is null at arrival time (edge case — GPS lost), when arrival triggers, then the overlay still renders normally without camera repositioning (no crash, no error).

## Additional Context

### Dependencies

No new dependencies. Uses existing `map.jumpTo()` from MapLibre GL JS API.

### Testing Strategy

Manual testing on real devices (no automated tests in this project):

**Android Chrome (primary):**
- [ ] Navigate to a destination, arrive within 15m
- [ ] Verify map snaps instantly (no animation) to user position at close zoom
- [ ] Verify bearing is north-up and pitch is flat (top-down view)
- [ ] Verify user dot and destination marker are both visible
- [ ] Verify both mini-modal buttons still work after camera snap

**iOS Safari (secondary):**
- [ ] Same checks as Android
- [ ] Verify no jank from synchronous jumpTo before React render

**Desktop browser (dev only):**
- [ ] ESLint passes: `bun run lint`
- [ ] Build succeeds: `bun run build`
- [ ] TypeScript passes: `npx tsc --noEmit`

### Notes

- **Zoom 20 may be too close on some map tile providers** — OpenFreeMap Liberty style supports zoom 20 but tiles may appear blurry or empty at extreme zoom depending on the data coverage for Garden Grove Village. If zoom 20 shows empty/blurry tiles, reduce to 19 or 18.
- **Interaction with existing camera reset effect** — The `easeTo({ bearing: 0, pitch: 0 })` at line 180 fires in the next render cycle after `setNavState("arrived")`. By then, `jumpTo` has already set bearing/pitch to 0 — the `easeTo` is a no-op.
- **Re-execution safety** — The `jumpTo` is protected by `arrivedDestinationRef` (line 120-122). It executes exactly once per destination, even if `hasArrived` remains `true` across multiple renders.

## Review Notes
- Adversarial review completed
- Findings: 9 total, 1 fixed, 8 skipped (noise)
- Resolution approach: auto-fix
- F5 (Medium, Real): Extracted `isExitDestination` variable to eliminate duplicated `destination?.type` check
