import { useState, useEffect, useRef } from "react";
import type { Map as MaplibreMap, GeoJSONSource } from "maplibre-gl";
import type { Geometry } from "geojson";
import { getDistance, projectPointOnLine, flattenCoordinates } from "../lib/geo";
import type { UserLocation, Destination } from "./useMapSetup";

export interface RouteStep {
  type: string;
  icon: string;
  modifier?: string | null;
  distance: number;
  isSignificant?: boolean;
  location?: [number, number];
}

export interface RouteGeometry {
  type: "LineString" | "MultiLineString";
  coordinates: [number, number][] | [number, number][][];
}

interface RouteResult {
  geometry: RouteGeometry;
  distance: number;
  steps?: RouteStep[];
}

interface LatLng {
  lat: number;
  lng: number;
}

export type RouteSourceType = "osrm" | "ors" | "direct";

interface UseRoutingReturn {
  routeGeoJSON: RouteGeometry | null;
  distance: number;
  steps: RouteStep[];
  routeSource: RouteSourceType | null;
  isRecalculating: boolean;
}

// ORS API Key from environment
const ORS_API_KEY = import.meta.env.VITE_OPENROUTE_API_KEY as string | undefined;

// Icon mapping for turn modifiers
const TURN_ICONS: Record<string, string> = {
  uturn: "↩",
  "sharp left": "↰",
  left: "←",
  "slight left": "↖",
  straight: "↑",
  "slight right": "↗",
  right: "→",
  "sharp right": "↱",
};

interface OSRMManeuver {
  type: string;
  modifier?: string;
  location: [number, number];
}

/**
 * Parse OSRM maneuver to navigation instruction
 * Returns null for steps that should be filtered out (depart)
 */
function parseManeuver(maneuver: OSRMManeuver, distance: number): RouteStep | null {
  const { type, modifier } = maneuver;

  // Filter out "depart" - it's the start point, not a real instruction
  if (type === "depart") {
    return null;
  }

  // Arrival
  if (type === "arrive") {
    return {
      type: "arrive",
      icon: "📍",
      modifier: null,
      distance: 0,
      isSignificant: true,
    };
  }

  // Roundabout/rotary
  if (type === "roundabout" || type === "rotary") {
    return {
      type: "roundabout",
      icon: "⟳",
      modifier,
      distance,
      isSignificant: true,
    };
  }

  // Turns, end of road, fork, continue, new name - use modifier to determine direction
  if (
    type === "turn" ||
    type === "end of road" ||
    type === "fork" ||
    type === "continue" ||
    type === "new name"
  ) {
    const icon = (modifier && TURN_ICONS[modifier]) || "↑";
    const isSignificant = !!modifier && modifier !== "straight";
    return {
      type: modifier || "straight",
      icon,
      modifier,
      distance,
      isSignificant,
    };
  }

  // Default: straight
  return {
    type: "straight",
    icon: "↑",
    modifier: null,
    distance,
    isSignificant: false,
  };
}

// Request timeout (3 seconds to fail fast)
const REQUEST_TIMEOUT_MS = 3000;

// Fetch with timeout helper
async function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  // Combine external signal with timeout signal
  const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  try {
    const res = await fetch(url, { signal: combinedSignal });
    clearTimeout(timeoutId);
    return res;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// OSRM routing (primary)
async function fetchOSRM(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number,
  signal?: AbortSignal
): Promise<RouteResult | null> {
  const url = `https://router.project-osrm.org/route/v1/foot/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetchWithTimeout(url, signal);
  const data: any = await res.json();

  if (data.code === "Ok" && data.routes?.[0]) {
    const route = data.routes[0];
    // Extract steps from all legs, filtering out null (depart steps)
    const steps: RouteStep[] =
      route.legs?.flatMap(
        (leg: any) =>
          leg.steps
            ?.map((step: any) => {
              const parsed = parseManeuver(step.maneuver, step.distance);
              if (!parsed) return null; // Skip depart steps
              return {
                ...parsed,
                location: step.maneuver.location as [number, number],
              };
            })
            .filter(Boolean) || []
      ) || [];

    return {
      geometry: route.geometry,
      distance: route.distance,
      steps,
    };
  }
  return null;
}

// OpenRouteService routing (fallback)
async function fetchORS(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number,
  signal?: AbortSignal
): Promise<RouteResult | null> {
  if (!ORS_API_KEY) return null;

  const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${ORS_API_KEY}&start=${originLng},${originLat}&end=${destLng},${destLat}`;
  const res = await fetchWithTimeout(url, signal);
  const data: any = await res.json();

  if (data.features?.[0]) {
    const feature = data.features[0];
    return {
      geometry: feature.geometry,
      distance: feature.properties.summary.distance,
    };
  }
  return null;
}

// Debounce delay for origin changes (prevents API spam when GPS updates rapidly)
const DEBOUNCE_MS = 500;

// Retry delays for OSRM when it fails (exponential backoff)
const RETRY_DELAYS = [10000, 30000, 60000]; // 10s, 30s, 60s

// Route recalculation threshold
const RECALC_THRESHOLD_M = 30;

// Off-route detection threshold
const OFF_ROUTE_THRESHOLD_M = 25;

// Minimum movement along route before re-trimming (jitter suppression)
const TRIM_MIN_MOVEMENT_M = 3;

export function useRouting(
  map: MaplibreMap | null,
  origin: UserLocation | null,
  destination: Destination | null
): UseRoutingReturn {
  const [routeGeoJSON, setRouteGeoJSON] = useState<RouteGeometry | null>(null);
  const [distance, setDistance] = useState(0);
  const [steps, setSteps] = useState<RouteStep[]>([]);
  const [routeSource, setRouteSource] = useState<RouteSourceType | null>(null);
  const [fullRoute, setFullRoute] = useState<RouteGeometry | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastOriginRef = useRef<LatLng | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAbortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
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

    // Only recalculate route if user moved > 30 meters OR destination changed
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

    // Update destination ref and reset retry on destination change
    if (destChanged) {
      retryCountRef.current = 0;
      destGenerationRef.current++;
      retryAbortRef.current?.abort();
      retryAbortRef.current = null;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
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
      setRouteGeoJSON(result.geometry);
      setDistance(result.distance);
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
    };

    // Retry OSRM in background with exponential backoff
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
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      retryAbortRef.current?.abort();
      abortRef.current?.abort();
    };
  }, [hasValidParams, map, originLat, originLng, destLat, destLng]);

  // Derive off-route status (pure computation — no state, no effect)
  const isOffRoute = (() => {
    if (!hasValidParams || !originLat || !originLng || !fullRoute) return false;
    const flatCoords = flattenCoordinates(fullRoute);
    if (flatCoords.length < 2) return false;
    const projection = projectPointOnLine(originLng, originLat, flatCoords);
    return projection.deviationDistance > OFF_ROUTE_THRESHOLD_M;
  })();

  // Route trimming + off-route side effects (map update, vibration, force recalc)
  useEffect(() => {
    if (!map || !originLat || !originLng || !fullRoute) return;

    const flatCoords = flattenCoordinates(fullRoute);
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
    routeGeoJSON: hasValidParams ? routeGeoJSON : null,
    distance: hasValidParams ? distance : 0,
    steps: hasValidParams ? steps : [],
    routeSource: hasValidParams ? routeSource : null,
    isRecalculating: hasValidParams ? isOffRoute : false,
  };
}

/**
 * Create a canvas-drawn chevron arrow for route direction indicators.
 * White right-pointing triangle — MapLibre auto-rotates it along the line.
 */
function createRouteArrowImage(): ImageData {
  const size = 12;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  // Right-pointing chevron
  ctx.moveTo(2, 1);
  ctx.lineTo(10, 6);
  ctx.lineTo(2, 11);
  ctx.closePath();
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}

function clearMapRoute(map: MaplibreMap): void {
  for (const layerId of ["route-arrows", "route-line", "route-outline"]) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  if (map.getSource("route")) map.removeSource("route");
}

function updateMapRoute(map: MaplibreMap, geometry: RouteGeometry): void {
  if (map.getSource("route")) {
    (map.getSource("route") as GeoJSONSource).setData(geometry as Geometry);
  } else {
    map.addSource("route", {
      type: "geojson",
      data: geometry as Geometry,
      lineMetrics: true,
    });

    // Shadow/outline layer (below route line)
    map.addLayer({
      id: "route-outline",
      type: "line",
      source: "route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#1a56c4",
        "line-width": 8,
        "line-opacity": 0.5,
      },
    });

    // Main route line
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#4285F4", "line-width": 5 },
    });

    // Register arrow image (once)
    if (!map.hasImage("route-arrow")) {
      map.addImage("route-arrow", createRouteArrowImage(), { sdf: false });
    }

    // Directional chevrons (above route line)
    map.addLayer({
      id: "route-arrows",
      type: "symbol",
      source: "route",
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 100,
        "icon-image": "route-arrow",
        "icon-size": 0.6,
        "icon-allow-overlap": true,
        "icon-rotation-alignment": "map",
      },
    });
  }
}
