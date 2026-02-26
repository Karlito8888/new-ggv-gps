---
title: 'Fix navigation camera initial center on user position'
slug: 'fix-nav-camera-center'
created: '2026-02-26'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['maplibre-gl 5.15.0', 'react 19.2.3', 'typescript']
files_to_modify: ['src/App.tsx']
code_patterns: ['map.easeTo with center + bearing', 'useRef guard for one-shot effect', 'conditional bearing inclusion']
test_patterns: ['manual device testing — iOS Safari + Android Chrome']
---

# Tech-Spec: Fix navigation camera initial center on user position

**Created:** 2026-02-26

## Overview

### Problem Statement

When the navigation state machine transitions from `orientation-permission` to `navigating` (after compass acceptance), Effect 3 in App.tsx (line 287) calls `map.easeTo({ pitch: 45, zoom: 20, duration: 500 })` without specifying `center` or `bearing`. This causes the map to tilt into 3D view but remain centered on its current camera position (typically the village center), instead of immediately centering on the user's GPS position. The user sees a disorienting zoom into an irrelevant area before the separate centering effect catches up.

### Solution

Add `center: [userLocation.longitude, userLocation.latitude]` to the `easeTo` call in Effect 3, so the 3D tilt animation simultaneously centers on the user's actual GPS position. Include the current `heading` as `bearing` if available, for an immediate "behind the user" perspective. Use a ref-based one-shot guard to prevent re-triggering on every GPS update.

### Scope

**In Scope:**
- Fix Effect 3 in App.tsx to include `center` (and optionally `bearing`) in the `easeTo` call when entering navigation mode
- Add a one-shot ref guard so the initial camera animation fires exactly once per navigation session

**Out of Scope:**
- Refactoring the continuous centering system (Effect 2)
- Refactoring the heading/orientation listener system
- Changes to NavigationOverlay component
- Changes to useRouting or useNavigation hooks

## Context for Development

### Codebase Patterns

- MapLibre `easeTo` is used throughout for smooth camera transitions
- `userLocation` is available from `useMapSetup()` as `{ latitude, longitude }` — always in GPS format (lat, lng), must convert to `[lng, lat]` for MapLibre
- `heading` is a `useState<number | null>` — tracks device compass heading, `null` before first orientation event
- Effect 2 (line 269-281) handles continuous centering via `map.setCenter()` — separate effect, no guaranteed execution order relative to Effect 3
- Orientation listener (lines 167-267) updates `heading` state via `setHeading(heading)` at line 243, throttled to 250ms / 3° minimum delta
- `navState` is a simple `useState` string — transitions are synchronous React state updates
- Effect 3 currently has deps `[navState, map, isMapReady]` — adding `userLocation` would re-trigger on every GPS update, which is wrong. Must use a one-shot guard pattern.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `src/App.tsx:283-288` | Effect 3 — the buggy `easeTo` call to fix |
| `src/App.tsx:269-281` | Effect 2 — continuous user centering (context only) |
| `src/App.tsx:167-267` | Orientation listener — `heading` state source |
| `src/App.tsx:142-146` | `isNavigatingRef` — existing ref tracking nav state |
| `src/App.tsx:325-333` | OrientationOverlay `onGrant` callback — triggers the transition |

### Technical Decisions

1. **Atomic camera animation**: Use `userLocation` directly in the `easeTo` call rather than relying on Effect 2 to center separately. This guarantees tilt + zoom + center happen as one smooth 500ms animation.

2. **Conditional bearing**: Include `bearing: heading` only when `heading !== null`. Before the first compass event fires, bearing stays at current value — this is acceptable as the orientation listener will update it within ~250ms.

3. **One-shot guard**: Since adding `userLocation` to the effect deps would re-fire on every GPS update, use a ref-based guard (`hasInitialNavViewRef`) that:
   - Sets to `true` after the first `easeTo` in navigation mode
   - Resets to `false` when leaving navigation mode (in the `isNavigatingRef` effect at line 144)
   - This ensures the initial camera animation fires exactly once per navigation session

## Implementation Plan

### Tasks

- [x] Task 1: Add `hasInitialNavViewRef` ref declaration
  - File: `src/App.tsx`
  - Action: Add `const hasInitialNavViewRef = useRef(false);` near the existing `isNavigatingRef` declaration (around line 143)
  - Notes: Follows the existing pattern of refs for navigation state tracking

- [x] Task 2: Reset the guard ref when leaving navigation mode
  - File: `src/App.tsx`
  - Action: In the `isNavigatingRef` effect (lines 144-146), add `hasInitialNavViewRef.current = false;` when `navState !== "navigating"`
  - Notes: This ensures re-entering navigation mode (cancel → new destination → compass again) will re-trigger the initial camera animation. Current code:
    ```tsx
    useEffect(() => {
      isNavigatingRef.current = navState === "navigating";
    }, [navState]);
    ```
    Change to:
    ```tsx
    useEffect(() => {
      isNavigatingRef.current = navState === "navigating";
      if (navState !== "navigating") {
        hasInitialNavViewRef.current = false;
      }
    }, [navState]);
    ```

- [x] Task 3: Fix Effect 3 to center on user with one-shot guard
  - File: `src/App.tsx`
  - Action: Replace the current Effect 3 (lines 283-288) with:
    ```tsx
    // Effect 3: Set initial navigation view when entering navigation mode
    useEffect(() => {
      if (!map || !isMapReady || navState !== "navigating" || !userLocation) return;
      if (hasInitialNavViewRef.current) return;
      hasInitialNavViewRef.current = true;

      map.easeTo({
        center: [userLocation.longitude, userLocation.latitude],
        ...(heading !== null && { bearing: heading }),
        pitch: 45,
        zoom: 20,
        duration: 500,
      });
    }, [navState, map, isMapReady, userLocation, heading]);
    ```
  - Notes:
    - `!userLocation` guard prevents crash if GPS hasn't resolved yet (defensive, should not happen at this stage)
    - `hasInitialNavViewRef.current` guard ensures one-shot execution
    - Spread `...(heading !== null && { bearing: heading })` conditionally includes bearing only when compass data is available
    - `userLocation` and `heading` added to deps — safe because of the ref guard

- [x] Task 4: Run lint
  - Action: Run `bun run lint` to verify no ESLint violations introduced

### Acceptance Criteria

- [x] AC 1: Given the user has GPS position and has selected a destination, when they accept compass permission and navState transitions to "navigating", then the map animates to center on the user's GPS position (not the village center) with pitch 45° and zoom 20 in a single smooth 500ms animation.

- [x] AC 2: Given the user has compass heading available at the moment of transition, when navState transitions to "navigating", then the map bearing is set to the user's heading direction (not stuck at north/0°).

- [x] AC 3: Given the user has no compass heading yet (heading is null), when navState transitions to "navigating", then the map centers on the user with pitch 45° and zoom 20 but does not force bearing to 0 (keeps current bearing).

- [x] AC 4: Given the user is navigating and GPS updates continuously, when userLocation changes, then the initial camera animation does NOT re-trigger (one-shot guard prevents it).

- [x] AC 5: Given the user cancels navigation and starts a new navigation session, when they accept compass again, then the initial camera animation fires again (guard was reset).

## Additional Context

### Dependencies

None — this is a fix in an existing effect, no new packages or imports needed.

### Testing Strategy

Manual testing on real device:
1. Complete GPS permission → select destination → accept compass → verify map immediately centers on user position with 3D tilt (not village center)
2. Walk a few steps → verify the initial tilt does NOT re-trigger (continuous centering from Effect 2 takes over)
3. Cancel navigation → select new destination → accept compass again → verify initial camera animation fires again correctly
4. Test with phone pointing in a specific direction → verify bearing matches phone direction on first render
5. Test on both iOS Safari and Android Chrome

### Notes

- The route is already calculated before this transition (started at destination selection), so it should be visible immediately after the camera moves to the user
- The continuous centering effect (Effect 2) will take over after the initial animation, keeping the user centered during navigation
- The orientation listener will start rotating the map bearing within ~250ms of navigation mode starting
- Risk: if `userLocation` is stale (last GPS fix was old), the center might be slightly off — but this is the same data used everywhere else, so it's acceptable

## Review Notes
- Adversarial review completed
- Findings: 7 total, 1 fixed, 6 skipped (noise or acceptable trade-offs)
- Resolution approach: auto-fix
- F2 (High/Real) fixed: Added `initialNavViewTimeRef` timestamp guard in Effect 2 to prevent `setCenter()` from interrupting the 500ms `easeTo` animation
- F6 (Low/Real) skipped: Mixed responsibilities in sync-guard effect — acceptable per KISS principle
- F1, F3, F4, F5, F7: Classified as noise or acceptable trade-offs
