---
title: 'Fix routing stale destination + intermittent route display'
slug: 'fix-routing-stale-destination'
created: '2026-02-26'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['react 19.2.3', 'maplibre-gl 5.15.0', 'typescript', 'vite 7.3.0']
files_to_modify: ['src/hooks/useRouting.ts']
code_patterns: ['useEffect with AbortController', 'useRef for mutable cross-render state', '3-tier routing fallback (OSRM → ORS → direct)', 'stale closure prevention via generation token']
test_patterns: ['manual device testing on Android Chrome + iOS Safari']
---

# Tech-Spec: Fix routing stale destination + intermittent route display

**Created:** 2026-02-26

## Overview

### Problem Statement

Two related bugs in `useRouting.ts` cause unreliable route display during navigation:

1. **Stale destination route**: When the user selects a new destination, the red destination marker moves correctly, but the blue route line can still point to the **previous** destination. This happens because OSRM retry timers and in-flight fetches carry stale closure values (`destLng`, `destLat`) from the previous render cycle.

2. **Intermittent missing route**: The route sometimes fails to display at all. When `abortRef.current?.abort()` fires during the OSRM fetch resolution, the catch block intercepts an `AbortError` and returns early — skipping the entire ORS + direct line fallback chain. The user sees no route.

### Solution

Fix both bugs in `useRouting.ts` with minimal, targeted changes:

1. Add a **destination generation token** to reject stale route results from retries and late-resolving fetches
2. Restructure the abort/catch flow so `AbortError` during OSRM does **not** skip the fallback chain — only exit on `AbortError` if `signal.aborted` is checked before each tier
3. Ensure retry timers use current destination refs instead of stale closure values, with a dedicated `AbortController` for retries

### Scope

**In Scope:**
- `src/hooks/useRouting.ts` — fix stale closure and abort/fallback logic

**Out of Scope:**
- UX changes (no new UI elements, no toast/notification)
- Adding new routing providers
- Changing thresholds (deviation, arrival, debounce)
- Changes to `useNavigation.ts`, `useMapSetup.ts`, or `App.tsx`

## Context for Development

### Codebase Patterns

- Hooks use `useRef` for mutable values that shouldn't trigger re-renders (e.g., `lastOriginRef`, `retryCountRef`)
- `AbortController` pattern for cancelling in-flight fetches
- Route state: `routeGeoJSON`, `distance`, `steps`, `routeSource` — all updated atomically via `applyRoute()`
- Map route display managed via `updateMapRoute()` which lazily creates source/layers or updates via `.setData()`
- No Context/Redux — simple `useState` in App.tsx, prop-drilled to hooks
- Constants in `UPPER_SNAKE_CASE`, functions in `camelCase`
- ESLint enforced, `console.log` forbidden (only `warn`, `error`, `info`)

### Files to Reference

| File | Purpose | Lines of Interest |
| ---- | ------- | ----------------- |
| `src/hooks/useRouting.ts` | Primary fix target | L296-304 (`applyRoute`), L309-311 (abort logic), L315-357 (fallback chain), L363-396 (retry), L410-418 (cleanup) |
| `src/App.tsx` | Consumer — passes `destination` state | L79-83 (hook call), L379-381 (`setDestination`) |
| `src/hooks/useMapSetup.ts` | `Destination` type definition | L19-23 |

### Technical Decisions

- **Destination generation ref over abort-only**: Aborting alone isn't sufficient because the retry timer can fire between abort and new effect setup. A generation token (incrementing counter ref) ensures any stale callback is silently discarded regardless of timing.
- **`signal.aborted` check between tiers instead of `AbortError` return**: The current pattern catches `AbortError` and does `return`, which cuts the entire fallback chain. Instead, check `signal.aborted` before each tier — if aborted, a new cycle is already running, so we can exit cleanly. If NOT aborted (just a network error), continue to the next tier.
- **Dedicated retry `AbortController`**: The retry mechanism must not share `abortRef` with the main fetch cycle. A separate ref (`retryAbortRef`) prevents retry signals from interfering with new fetch cycles.

### Anchor Points (Bug Trace)

**Bug 1 — Stale destination route:**

| Location | Issue |
| -------- | ----- |
| `useRouting.ts:373-385` | `scheduleRetry()` closure captures stale `destLng`/`destLat` from previous useEffect execution |
| `useRouting.ts:296-304` | `applyRoute()` has NO guard — applies result blindly even if destination changed |
| `useRouting.ts:381` | `abortRef.current?.signal` read at timer runtime, not capture time — can point to new cycle's signal |

**Bug 2 — Intermittent missing route:**

| Location | Issue |
| -------- | ----- |
| `useRouting.ts:309` | `abort()` cancels fetch from concurrent valid cycle |
| `useRouting.ts:323-325` | `AbortError` → `return` → ORS + direct line **never attempted** |
| `useRouting.ts:336-338` | Same pattern for ORS — cuts off direct line fallback |
| `useRouting.ts:341-357` | Direct line (safety net) unreachable when abort fires |

## Implementation Plan

### Tasks

All tasks in a single file: `src/hooks/useRouting.ts`

- [ ] **Task 1: Add destination generation ref**
  - File: `src/hooks/useRouting.ts`
  - Action: Add a `useRef<number>` called `destGenerationRef` initialized to `0`, next to the existing refs (after line 245). This counter increments every time the destination changes, providing a staleness check token.
  - Code:
    ```typescript
    const destGenerationRef = useRef(0);
    ```

- [ ] **Task 2: Add dedicated retry AbortController ref**
  - File: `src/hooks/useRouting.ts`
  - Action: Add a `useRef<AbortController | null>` called `retryAbortRef` initialized to `null`, next to the existing `retryTimerRef` (after line 238).
  - Code:
    ```typescript
    const retryAbortRef = useRef<AbortController | null>(null);
    ```

- [ ] **Task 3: Increment generation token on destination change**
  - File: `src/hooks/useRouting.ts`
  - Action: Inside the main `useEffect`, in the `if (destChanged)` block (around line 287), increment `destGenerationRef.current` and abort the retry controller.
  - Code (add after line 288 `retryCountRef.current = 0;`):
    ```typescript
    destGenerationRef.current++;
    retryAbortRef.current?.abort();
    retryAbortRef.current = null;
    ```

- [ ] **Task 4: Guard `applyRoute()` with generation token**
  - File: `src/hooks/useRouting.ts`
  - Action: Capture the generation value at the start of the `useEffect` body, then check it inside `applyRoute()`. If it doesn't match the current ref value, discard the result silently.
  - Code: At the top of the `useEffect` body (after `hasValidParams` check), add:
    ```typescript
    const generation = destGenerationRef.current;
    ```
    Then modify `applyRoute` (line 296) to:
    ```typescript
    const applyRoute = (result: RouteResult, source: RouteSourceType) => {
      // Reject stale results from previous destination
      if (generation !== destGenerationRef.current) {
        console.info("Route: Discarding stale result (destination changed)");
        return;
      }
      setFullRoute(result.geometry);
      setRouteGeoJSON(result.geometry);
      setDistance(result.distance);
      setSteps(result.steps || []);
      setRouteSource(source);
      lastTrimPointRef.current = null;
      updateMapRoute(map!, result.geometry);
    };
    ```

- [ ] **Task 5: Restructure fallback chain — replace `AbortError` return with `signal.aborted` checks**
  - File: `src/hooks/useRouting.ts`
  - Action: Replace the current pattern where `AbortError` causes an early `return` (cutting the fallback chain) with `signal.aborted` checks **between** tiers. Inside each catch block, log the error but do NOT return on `AbortError` — instead, after each tier's try/catch, check `signal.aborted` before proceeding to next tier.
  - Replace lines 315-357 (`fetchRoute` body after signal creation) with:
    ```typescript
    let route: RouteResult | null = null;

    // 1. Try OSRM (primary)
    try {
      route = await fetchOSRM(originLng!, originLat!, destLng!, destLat!, signal);
      if (route) {
        console.info("Route: OSRM");
        applyRoute(route, "osrm");
        return;
      }
    } catch (e) {
      if (signal.aborted) return; // New cycle started, exit cleanly
      console.warn("OSRM failed:", e instanceof Error ? e.message : e);
    }

    // 2. Try ORS (fallback)
    if (!signal.aborted) {
      try {
        route = await fetchORS(originLng!, originLat!, destLng!, destLat!, signal);
        if (route) {
          console.info("Route: ORS (fallback)");
          applyRoute(route, "ors");
          return;
        }
      } catch (e) {
        if (signal.aborted) return; // New cycle started, exit cleanly
        console.warn("ORS failed:", e instanceof Error ? e.message : e);
      }
    }

    // 3. Fallback: direct line (ALWAYS reached unless signal aborted)
    if (signal.aborted) return;

    console.info("Route: Direct line (fallback)");
    const directDist = getDistance(originLat!, originLng!, destLat!, destLng!);
    applyRoute(
      {
        geometry: {
          type: "LineString",
          coordinates: [
            [originLng!, originLat!],
            [destLng!, destLat!],
          ],
        },
        distance: directDist,
        steps: [{ type: "straight", icon: "↑", distance: directDist }],
      },
      "direct"
    );

    // Schedule OSRM retry in background
    scheduleRetry();
    ```
  - Key change: `AbortError` in OSRM catch no longer does `return` — instead `signal.aborted` is checked. This ensures that if OSRM fails with a **network** error (not abort), the chain continues to ORS and direct line. Only a true abort (new cycle started) exits.

- [ ] **Task 6: Fix retry mechanism — use refs instead of closure values**
  - File: `src/hooks/useRouting.ts`
  - Action: Rewrite `scheduleRetry()` to read current coordinates from `lastDestRef.current` and `lastOriginRef.current` (refs, always current) instead of closed-over `destLng`/`destLat`/`originLng`/`originLat` (stale primitives). Use `retryAbortRef` instead of `abortRef` for the signal.
  - Replace lines 363-396 with:
    ```typescript
    const scheduleRetry = () => {
      if (retryCountRef.current >= RETRY_DELAYS.length) {
        console.info("Route: Max retries reached, staying on direct line");
        return;
      }

      const delay = RETRY_DELAYS[retryCountRef.current];
      console.info(`Route: Scheduling OSRM retry in ${delay / 1000}s`);

      retryTimerRef.current = setTimeout(async () => {
        retryCountRef.current++;

        // Read CURRENT destination and origin from refs (not stale closure)
        const currentDest = lastDestRef.current;
        const currentOrigin = lastOriginRef.current;
        if (!currentDest || !currentOrigin) return;

        // Use dedicated retry abort controller
        retryAbortRef.current = new AbortController();

        try {
          const route = await fetchOSRM(
            currentOrigin.lng,
            currentOrigin.lat,
            currentDest.lng,
            currentDest.lat,
            retryAbortRef.current.signal
          );
          if (route) {
            console.info("Route: OSRM retry successful!");
            applyRoute(route, "osrm");
            retryCountRef.current = 0;
            return;
          }
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") return;
          console.warn("OSRM retry failed:", e instanceof Error ? e.message : e);
        }
        // Still failed, schedule next retry
        scheduleRetry();
      }, delay);
    };
    ```
  - Key changes: (a) Reads `lastDestRef.current` / `lastOriginRef.current` instead of closure values. (b) Uses `retryAbortRef` instead of `abortRef`. (c) `applyRoute()` still has the generation guard from Task 4, providing double protection.

- [ ] **Task 7: Update cleanup function to abort retry controller**
  - File: `src/hooks/useRouting.ts`
  - Action: In the cleanup function (lines 410-418), add `retryAbortRef.current?.abort()` to ensure in-flight retry fetches are cancelled on re-render.
  - Code:
    ```typescript
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      retryAbortRef.current?.abort();
      abortRef.current?.abort();
    };
    ```

- [ ] **Task 8: Run ESLint and verify**
  - Action: Run `bun run lint` to verify no lint errors introduced
  - Verify: No `console.log` (only `console.info` and `console.warn` used)
  - Verify: No unused variables

### Acceptance Criteria

- [ ] **AC 1**: Given the user is navigating to destination A with an active OSRM route, when the user selects a new destination B, then the blue route line updates to point to B within 3 seconds (immediate for direct line, or after OSRM response).

- [ ] **AC 2**: Given the user is navigating to destination A and OSRM has failed (direct line displayed) with a background retry scheduled, when the user selects destination B before the retry fires, then the retry result for A is silently discarded and does NOT overwrite the route to B.

- [ ] **AC 3**: Given OSRM is unreachable (timeout or network error) and no ORS API key is configured, when the user selects any destination, then a direct line route is ALWAYS displayed (never a blank screen with no route).

- [ ] **AC 4**: Given the user rapidly switches between 3+ destinations within 2 seconds, when all transitions complete, then the displayed route corresponds to the LAST selected destination only, with no flickering to intermediate destinations.

- [ ] **AC 5**: Given OSRM is temporarily down, when the direct line fallback is displayed and OSRM recovers, then the background retry upgrades the route to OSRM for the CURRENT destination (not a previously selected one).

- [ ] **AC 6**: Given the user is on WiFi with higher latency to OSRM, when the 3-second timeout fires, then the fallback chain continues to ORS → direct line (does not exit silently with no route).

- [ ] **AC 7**: Given a GPS position update triggers a route recalculation while an OSRM fetch is in-flight, when the previous fetch is aborted, then the new cycle runs its own complete fallback chain (OSRM → ORS → direct line) independently.

- [ ] **AC 8**: Given the fix is applied, when `bun run lint` is executed, then no ESLint errors or warnings are produced.

## Additional Context

### Dependencies

None — pure bugfix within existing code. No new packages, no API changes.

### Testing Strategy

**Manual testing on real device (Android Chrome + iOS Safari):**

1. **Happy path**: Select destination → verify route displays (OSRM blue line)
2. **Destination switch**: Navigate to A → switch to B → verify blue line points to B, not A
3. **OSRM failure**: Toggle airplane mode briefly → verify direct line appears → toggle back → verify OSRM retry upgrades to correct destination
4. **Rapid switching**: Select A → B → C quickly → verify final route is to C only
5. **WiFi latency**: Test on WiFi (not cellular) → verify route always appears (at least direct line)
6. **Retry staleness**: Navigate to A with OSRM down → switch to B → wait for retry → verify retry result applies to B (or is discarded)
7. **GPS movement during fetch**: Walk while route is being calculated → verify new route calculates correctly without blank screen

### Notes

- The fix adds ~15 lines of code total (generation ref, guard check, signal.aborted checks, retry ref abort)
- No behavioral changes for the happy path (OSRM works first try) — only edge cases fixed
- The generation token approach is more robust than abort-only because it handles the timer-fires-between-cycles race condition
- `lastDestRef` and `lastOriginRef` already exist in the code — the retry fix simply reads them instead of closed-over primitives
- The dedicated `retryAbortRef` prevents the scenario where aborting the main fetch cycle accidentally aborts a retry, or vice versa
