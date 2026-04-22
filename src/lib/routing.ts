/**
 * Pure routing utilities — fetch, parse, map display helpers.
 * No React hooks or state. Extracted from useRouting for separation of concerns.
 */

import type { Map as MaplibreMap, GeoJSONSource } from "maplibre-gl";
import type { Geometry } from "geojson";
import type { OSRMResponse, ORSResponse } from "../types/routing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

export interface RouteResult {
  geometry: RouteGeometry;
  distance: number;
  steps?: RouteStep[];
}

export type RouteSourceType = "osrm" | "ors" | "direct";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** ORS API key from environment */
const ORS_API_KEY = import.meta.env.VITE_OPENROUTE_API_KEY as string | undefined;

/** Request timeout (3 seconds to fail fast) */
export const REQUEST_TIMEOUT_MS = 3000;

/** Debounce delay for origin changes (prevents API spam when GPS updates rapidly) */
export const DEBOUNCE_MS = 500;

/** Retry delays for OSRM when it fails (exponential backoff) */
export const RETRY_DELAYS = [10000, 30000, 60000]; // 10s, 30s, 60s

/** Route recalculation threshold */
export const RECALC_THRESHOLD_M = 30;

/** Off-route detection threshold */
export const OFF_ROUTE_THRESHOLD_M = 25;

/** Minimum movement along route before re-trimming (jitter suppression) */
export const TRIM_MIN_MOVEMENT_M = 3;

// ---------------------------------------------------------------------------
// Turn icon mapping
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Maneuver parsing
// ---------------------------------------------------------------------------

interface OSRMManeuver {
  type: string;
  modifier?: string;
  location: [number, number];
}

/**
 * Parse OSRM maneuver to navigation instruction.
 * Returns null for steps that should be filtered out (depart).
 */
export function parseManeuver(maneuver: OSRMManeuver, distance: number): RouteStep | null {
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

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/** Fetch with timeout helper */
export async function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
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
export async function fetchOSRM(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number,
  signal?: AbortSignal
): Promise<RouteResult | null> {
  const url = `https://router.project-osrm.org/route/v1/foot/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetchWithTimeout(url, signal);
  const data: OSRMResponse = await res.json();

  if (data.code === "Ok" && data.routes?.[0]) {
    const route = data.routes[0];
    // Extract steps from all legs, filtering out null (depart steps)
    const steps: RouteStep[] =
      route.legs?.flatMap(
        (leg) =>
          leg.steps
            ?.map((step) => {
              const parsed = parseManeuver(step.maneuver, step.distance);
              if (!parsed) return null;
              return { ...parsed, location: step.maneuver.location };
            })
            .filter((s): s is NonNullable<typeof s> => s !== null) || []
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
export async function fetchORS(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number,
  signal?: AbortSignal
): Promise<RouteResult | null> {
  if (!ORS_API_KEY) return null;

  const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${ORS_API_KEY}&start=${originLng},${originLat}&end=${destLng},${destLat}`;
  const res = await fetchWithTimeout(url, signal);
  const data: ORSResponse = await res.json();

  if (data.features?.[0]) {
    const feature = data.features[0];
    return {
      geometry: feature.geometry,
      distance: feature.properties.summary.distance,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Map route display helpers
// ---------------------------------------------------------------------------

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

export function clearMapRoute(map: MaplibreMap): void {
  for (const layerId of ["route-arrows", "route-line", "route-outline"]) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  if (map.getSource("route")) map.removeSource("route");
}

export function updateMapRoute(map: MaplibreMap, geometry: RouteGeometry): void {
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
