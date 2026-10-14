import { useState, useEffect, useEffectEvent, useRef } from "react";
import { getDistance, isCoord, projectPointOnLine } from "./geo";
import {
  fetchOSRM,
  OSRM_HOSTS,
  RECALC_THRESHOLD_M,
  OFF_ROUTE_THRESHOLD_M,
  TRIM_MIN_MOVEMENT_M,
} from "./routing";
import { trace } from "./trace";
import type { RouteStep, RouteGeometry, RouteResult, RouteSourceType } from "./routing";
import type { UserLocation, Destination } from "./types";

interface LatLng {
  lat: number;
  lng: number;
}

/** The last answer applied, with the destination it was computed for. */
interface AppliedRoute {
  destKey: string;
  geometry: RouteGeometry;
  steps: RouteStep[];
  source: RouteSourceType;
}

interface UseRoutingReturn {
  routeGeoJSON: RouteGeometry | null;
  steps: RouteStep[];
  routeSource: RouteSourceType | null;
  isRecalculating: boolean;
}

/**
 * `enabled` gates the hook (web: the map exists; mobile: the map is ready). The renderer is
 * reached only through two callbacks: `onRouteDisplay` draws (or erases, with `null`) the line,
 * `onOffRoute` gives the user feedback (vibration), debounced here to once per 5 s.
 */
export function useRouting(
  enabled: boolean,
  origin: UserLocation | null,
  destination: Destination | null,
  onRouteDisplay: (geometry: RouteGeometry | null) => void,
  onOffRoute: () => void
): UseRoutingReturn {
  // Effect events: the latest callbacks without making their identity re-run the effects below.
  const displayRoute = useEffectEvent(onRouteDisplay);
  const notifyOffRoute = useEffectEvent(onOffRoute);

  // One state for the whole answer: geometry, steps and source arrive in the same call. It is
  // keyed on the destination it was computed for, so a cancel followed by a new choice can
  // never show the previous route: the key no longer matches and the render derives `null`.
  const [applied, setApplied] = useState<AppliedRoute | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastOriginRef = useRef<LatLng | null>(null);
  // Vibration debounce (max once per 5 seconds)
  const lastVibrationRef = useRef(0);
  // Off-route recalculation cooldown (prevent infinite loop)
  const lastOffRouteRecalcRef = useRef(0);
  // Last trim projected point (jitter suppression)
  const lastTrimPointRef = useRef<[number, number] | null>(null);
  // Destination generation token (stale closure prevention)
  const destGenerationRef = useRef(0);

  const originLat = origin?.latitude;
  const originLng = origin?.longitude;
  const destLat = destination?.coordinates?.[1];
  const destLng = destination?.coordinates?.[0];

  // Track destination to detect changes (recalculate immediately on new destination)
  const lastDestRef = useRef<LatLng | null>(null);

  const hasValidParams =
    enabled && isCoord(originLat) && isCoord(originLng) && isCoord(destLat) && isCoord(destLng);
  const destKey = hasValidParams ? `${destLat},${destLng}` : null;
  const route = applied && applied.destKey === destKey ? applied : null;
  const fullRoute = route?.geometry ?? null;

  // Routing stopped (navigation cancelled, or params gone): erase the line, make sure no
  // in-flight answer can draw over the cleared map, and forget the previous origin. Without
  // that, reselecting the same lot after a mid-request cancel never fetched again: the 30 m
  // guard still held the old origin.
  useEffect(() => {
    if (hasValidParams || !enabled) return;
    destGenerationRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    lastDestRef.current = null;
    lastOriginRef.current = null;
    lastTrimPointRef.current = null;
    displayRoute(null);
  }, [hasValidParams, enabled]);

  // Unmount is the only other reason to drop a request in flight.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!hasValidParams) return; // Early return, no sync setState

    // Check if destination changed (always recalculate on new destination)
    const destChanged =
      !lastDestRef.current ||
      lastDestRef.current.lat !== destLat ||
      lastDestRef.current.lng !== destLng;

    // Only recalculate route if user moved > threshold OR destination changed
    if (!destChanged && lastOriginRef.current) {
      const movedDistance = getDistance(
        lastOriginRef.current.lat,
        lastOriginRef.current.lng,
        originLat!,
        originLng!
      );
      if (movedDistance < RECALC_THRESHOLD_M) {
        return; // Skip recalculation, user hasn't moved enough
      }
    }

    // Reset stale-result token on destination change
    if (destChanged) {
      destGenerationRef.current++;
    }
    lastDestRef.current = { lat: destLat!, lng: destLng! };

    // Capture generation token to detect stale results
    const generation = destGenerationRef.current;

    // An abort landing between a `route:fetch-start` and its outcome is the regression the
    // frise exists to show, so it is dated, not just done. The handle is released once the
    // request has answered: an abort is only traced when something was in flight.
    if (abortRef.current) trace("route:abort");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    const applyRoute = (result: RouteResult, source: RouteSourceType) => {
      // Reject stale results from previous destination
      if (generation !== destGenerationRef.current) {
        console.info("Route: Discarding stale result (destination changed)");
        trace("route:stale");
        return;
      }
      if (abortRef.current === controller) abortRef.current = null;
      setApplied({
        destKey: `${destLat},${destLng}`,
        geometry: result.geometry,
        steps: result.steps ?? [],
        source,
      });
      lastTrimPointRef.current = null;
      displayRoute(result.geometry);
    };

    const fetchRoute = async () => {
      // Save current origin for next comparison
      lastOriginRef.current = { lat: originLat!, lng: originLng! };
      trace("route:fetch-start", { generation });

      // 1. Try each OSRM host in order
      for (const host of OSRM_HOSTS) {
        if (signal.aborted) return;
        try {
          const route = await fetchOSRM(host, originLng!, originLat!, destLng!, destLat!, signal);
          if (route) {
            console.info(`Route: OSRM (${new URL(host).hostname})`);
            trace("route:osrm", { host: new URL(host).hostname });
            applyRoute(route, "osrm");
            return;
          }
        } catch (e) {
          if (signal.aborted) return; // New cycle started, exit cleanly
          console.warn(
            `OSRM failed (${new URL(host).hostname}):`,
            e instanceof Error ? e.message : e
          );
          trace("route:osrm-fail", { host: new URL(host).hostname });
        }
      }

      // 2. Fallback: direct line (ALWAYS reached unless signal aborted)

      if (signal.aborted) return;

      console.info("Route: Direct line (fallback)");
      const directDist = getDistance(originLat!, originLng!, destLat!, destLng!);
      trace("route:direct", { metres: directDist });
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
    };

    // No debounce, and no abort on cleanup. This effect re-runs on every GPS fix (origin is a
    // dependency), and React runs the previous cleanup before each re-run — so aborting there
    // cancelled the request the user is waiting for, roughly once a second, while the guard
    // above then declined to start a new one. Whenever the OSRM round-trip outlasted the GPS
    // cadence the route never arrived at all: no line, no turn instructions, no fallback.
    // Measured on a Galaxy A16 with +1.5 s latency: zero route logs over 20 s of navigation.
    //
    // A stale answer is already handled without cancelling anything: `applyRoute` drops it by
    // generation token. The remaining aborts are the ones that mean it: a newer fetch
    // superseding this one (below), navigation stopping, and unmount.
    fetchRoute();
  }, [hasValidParams, originLat, originLng, destLat, destLng]);

  // Derive off-route status (pure computation — no state, no effect)
  const isOffRoute = (() => {
    if (!fullRoute || !isCoord(originLat) || !isCoord(originLng)) return false;
    const flatCoords = fullRoute.coordinates;
    if (flatCoords.length < 2) return false;
    const projection = projectPointOnLine(originLng, originLat, flatCoords);
    return projection.deviationDistance > OFF_ROUTE_THRESHOLD_M;
  })();

  // Route trimming + off-route side effects (map update, vibration, force recalc)
  useEffect(() => {
    if (!fullRoute || !isCoord(originLat) || !isCoord(originLng)) return;

    const flatCoords = fullRoute.coordinates;
    if (flatCoords.length < 2) return;

    const projection = projectPointOnLine(originLng, originLat, flatCoords);

    // Off-route: vibrate + force recalculation (with 3s cooldown to prevent loop)
    if (projection.deviationDistance > OFF_ROUTE_THRESHOLD_M) {
      const now = Date.now();
      if (now - lastVibrationRef.current > 5000) {
        notifyOffRoute();
        lastVibrationRef.current = now;
      }
      // Only force recalc if cooldown has elapsed (prevents infinite loop
      // when API returns same route and user is still off-route)
      if (now - lastOffRouteRecalcRef.current > 3000) {
        lastOffRouteRecalcRef.current = now;
        lastOriginRef.current = null;
      }
      lastTrimPointRef.current = null;
      return;
    }

    // Jitter suppression: skip map update if user hasn't moved enough along route
    const projected = projection.projectedPoint;
    const last = lastTrimPointRef.current;
    if (last && getDistance(last[1], last[0], projected[1], projected[0]) < TRIM_MIN_MOVEMENT_M) {
      return;
    }

    // Build trimmed coordinates: from projected point to destination
    const trimmedCoords: [number, number][] = [projected];
    for (let i = projection.segmentIndex + 1; i < flatCoords.length; i++) {
      trimmedCoords.push(flatCoords[i]);
    }

    if (trimmedCoords.length < 2) return;

    lastTrimPointRef.current = projected;
    const trimmedGeometry: RouteGeometry = {
      type: "LineString",
      coordinates: trimmedCoords,
    };
    // Update the route display (external system — allowed in effect)
    displayRoute(trimmedGeometry);
  }, [originLat, originLng, fullRoute]);

  return {
    routeGeoJSON: fullRoute,
    steps: route?.steps ?? [],
    routeSource: route?.source ?? null,
    isRecalculating: isOffRoute,
  };
}
