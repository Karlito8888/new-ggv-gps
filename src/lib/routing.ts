/**
 * Pure routing utilities — fetch, parse, map display helpers.
 * No React hooks or state. Extracted from useRouting for separation of concerns.
 */

import type { Map as MaplibreMap, GeoJSONSource } from "maplibre-gl";
import type { Geometry } from "geojson";
import type { OSRMResponse, OSRMManeuver } from "../types/routing";

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
  type: "LineString";
  coordinates: [number, number][];
}

export interface RouteResult {
  geometry: RouteGeometry;
  distance: number;
  steps?: RouteStep[];
}

export type RouteSourceType = "osrm" | "direct";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * OSRM hosts tried in order. Both speak the same v1 API, so one parser covers both:
 * FOSSGIS is the fallback when the demo server is down or rate-limiting.
 */
export const OSRM_HOSTS = [
  "https://router.project-osrm.org/route/v1/foot",
  "https://routing.openstreetmap.de/routed-foot/route/v1/foot",
] as const;

/** Request timeout (3 seconds to fail fast) */
export const REQUEST_TIMEOUT_MS = 3000;

/** Debounce delay for origin changes (prevents API spam when GPS updates rapidly) */
export const DEBOUNCE_MS = 500;

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
export function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
}

// OSRM routing — `host` comes from OSRM_HOSTS
export async function fetchOSRM(
  host: string,
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number,
  signal?: AbortSignal
): Promise<RouteResult | null> {
  const url = `${host}/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
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
