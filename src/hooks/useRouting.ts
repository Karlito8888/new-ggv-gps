import { useState, useEffect, useRef } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { getDistance, projectPointOnLine } from "../lib/geo";
import {
  fetchOSRM,
  OSRM_HOSTS,
  clearMapRoute,
  updateMapRoute,
  DEBOUNCE_MS,
  RECALC_THRESHOLD_M,
  OFF_ROUTE_THRESHOLD_M,
  TRIM_MIN_MOVEMENT_M,
} from "../lib/routing";
import type { RouteStep, RouteGeometry, RouteResult, RouteSourceType } from "../lib/routing";
import type { UserLocation, Destination } from "./useMapSetup";

export type { RouteStep, RouteGeometry, RouteSourceType } from "../lib/routing";

interface LatLng {
  lat: number;
  lng: number;
}

interface UseRoutingReturn {
  routeGeoJSON: RouteGeometry | null;
  steps: RouteStep[];
  routeSource: RouteSourceType | null;
  isRecalculating: boolean;
}

export function useRouting(
  map: MaplibreMap | null,
  origin: UserLocation | null,
  destination: Destination | null
): UseRoutingReturn {
  // No separate `routeGeoJSON` state: it was set from the same `result.geometry` as `fullRoute`,
  // in the same call. The returned field is fed from `fullRoute` instead.
  const [steps, setSteps] = useState<RouteStep[]>([]);
  const [routeSource, setRouteSource] = useState<RouteSourceType | null>(null);
  const [fullRoute, setFullRoute] = useState<RouteGeometry | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastOriginRef = useRef<LatLng | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Track if params are valid (used for derived return value)
  const hasValidParams = !!(map && originLat && originLng && destLat && destLng);

  // Clear route layers when navigation ends (external system cleanup — no setState)
  useEffect(() => {
    if (hasValidParams || !map) return;
    clearMapRoute(map);
  }, [hasValidParams, map]);

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

    const applyRoute = (result: RouteResult, source: RouteSourceType) => {
      // Reject stale results from previous destination
      if (generation !== destGenerationRef.current) {
        console.info("Route: Discarding stale result (destination changed)");
        return;
      }
      setFullRoute(result.geometry);
      setSteps(result.steps || []);
      setRouteSource(source);
      lastTrimPointRef.current = null;
      updateMapRoute(map!, result.geometry);
    };

    const fetchRoute = async () => {
      // Save current origin for next comparison
      lastOriginRef.current = { lat: originLat!, lng: originLng! };
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      // 1. Try each OSRM host in order
      for (const host of OSRM_HOSTS) {
        if (signal.aborted) return;
        try {
          const route = await fetchOSRM(host, originLng!, originLat!, destLng!, destLat!, signal);
          if (route) {
            console.info(`Route: OSRM (${new URL(host).hostname})`);
            applyRoute(route, "osrm");
            return;
          }
        } catch (e) {
          if (signal.aborted) return; // New cycle started, exit cleanly
          console.warn(
            `OSRM failed (${new URL(host).hostname}):`,
            e instanceof Error ? e.message : e
          );
        }
      }

      // 2. Fallback: direct line (ALWAYS reached unless signal aborted)

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
    };

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce route calculation (except for destination changes which are immediate)
    if (destChanged) {
      fetchRoute();
    } else {
      debounceTimerRef.current = setTimeout(fetchRoute, DEBOUNCE_MS);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      abortRef.current?.abort();
    };
  }, [hasValidParams, map, originLat, originLng, destLat, destLng]);

  // Derive off-route status (pure computation — no state, no effect)
  const isOffRoute = (() => {
    if (!hasValidParams || !originLat || !originLng || !fullRoute) return false;
    const flatCoords = fullRoute.coordinates;
    if (flatCoords.length < 2) return false;
    const projection = projectPointOnLine(originLng, originLat, flatCoords);
    return projection.deviationDistance > OFF_ROUTE_THRESHOLD_M;
  })();

  // Route trimming + off-route side effects (map update, vibration, force recalc)
  useEffect(() => {
    if (!map || !originLat || !originLng || !fullRoute) return;

    const flatCoords = fullRoute.coordinates;
    if (flatCoords.length < 2) return;

    const projection = projectPointOnLine(originLng, originLat, flatCoords);

    // Off-route: vibrate + force recalculation (with 3s cooldown to prevent loop)
    if (projection.deviationDistance > OFF_ROUTE_THRESHOLD_M) {
      const now = Date.now();
      if (now - lastVibrationRef.current > 5000) {
        navigator.vibrate?.(200);
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
    if (lastTrimPointRef.current) {
      const dx = projected[0] - lastTrimPointRef.current[0];
      const dy = projected[1] - lastTrimPointRef.current[1];
      // Rough meter conversion at ~14.35°N: 1° lng ≈ 107550m, 1° lat ≈ 110540m
      const distM = Math.sqrt((dx * 107550) ** 2 + (dy * 110540) ** 2);
      if (distM < TRIM_MIN_MOVEMENT_M) return;
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
    // Update map route display (external system — allowed in effect)
    updateMapRoute(map, trimmedGeometry);
  }, [map, originLat, originLng, fullRoute]);

  // Derive return values - return null/empty when params invalid (no sync setState needed)
  return {
    routeGeoJSON: hasValidParams ? fullRoute : null,
    steps: hasValidParams ? steps : [],
    routeSource: hasValidParams ? routeSource : null,
    isRecalculating: hasValidParams ? isOffRoute : false,
  };
}
