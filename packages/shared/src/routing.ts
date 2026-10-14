/**
 * Pure routing utilities — fetch and parse. No React, no map renderer, no DOM.
 * The map-drawing half lives with each renderer (web: routeLayers.ts).
 */

import type { OSRMResponse, OSRMManeuver } from "./osrm-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RouteStep {
  type: string;
  icon: string;
  modifier?: string | null;
  isSignificant?: boolean;
  location?: [number, number];
}

export interface RouteGeometry {
  type: "LineString";
  coordinates: [number, number][];
}

export interface RouteResult {
  geometry: RouteGeometry;
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

/** Request timeout (3 seconds to fail fast). Internal: only `fetchWithTimeout` reads it. */
const REQUEST_TIMEOUT_MS = 3000;

/**
 * Route recalculation threshold. It is also the API rate limit: a walker covers 30 m in
 * ~25 s, so no debounce is needed on top — and a debounce re-armed by every GPS fix would
 * starve above 2 Hz, which is the failure this constant replaces.
 */
export const RECALC_THRESHOLD_M = 30;

/** Off-route detection threshold */
export const OFF_ROUTE_THRESHOLD_M = 25;

/** Minimum movement along route before re-trimming (jitter suppression) */
export const TRIM_MIN_MOVEMENT_M = 3;

// ---------------------------------------------------------------------------
// Turn icon mapping
// ---------------------------------------------------------------------------

export const TURN_ICONS: Record<string, string> = {
  uturn: "↩",
  "sharp left": "↰",
  left: "←",
  "slight left": "↖",
  straight: "↑",
  "slight right": "↗",
  right: "→",
  "sharp right": "↱",
};

/**
 * Instruction text per OSRM `modifier`. The vocabulary is closed and documented —
 * the same 8 keys as TURN_ICONS (OSRM v5.24 API, StepManeuver.modifier).
 * `tl` is the short Tagalog gloss shown under the English line.
 */
export const TURN_LABELS: Record<string, { en: string; tl: string }> = {
  uturn: { en: "Make a U-turn", tl: "Bumalik" },
  "sharp left": { en: "Sharp left", tl: "Matalim na kaliwa" },
  left: { en: "Turn left", tl: "Kumaliwa" },
  "slight left": { en: "Slight left", tl: "Bahagyang kaliwa" },
  straight: { en: "Continue straight", tl: "Diretso" },
  "slight right": { en: "Slight right", tl: "Bahagyang kanan" },
  right: { en: "Turn right", tl: "Kumanan" },
  "sharp right": { en: "Sharp right", tl: "Matalim na kanan" },
};

// ---------------------------------------------------------------------------
// Maneuver parsing
// ---------------------------------------------------------------------------

/**
 * Parse OSRM maneuver to navigation instruction.
 * Returns null for steps that should be filtered out (depart).
 */
export function parseManeuver(maneuver: OSRMManeuver): RouteStep | null {
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
      isSignificant: true,
    };
  }

  // Roundabout/rotary
  if (type === "roundabout" || type === "rotary") {
    return {
      type: "roundabout",
      icon: "⟳",
      modifier,
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
      isSignificant,
    };
  }

  // Default: straight
  return {
    type: "straight",
    icon: "↑",
    modifier: null,
    isSignificant: false,
  };
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/**
 * Fetch + parse JSON with a timeout. Internal: `fetchOSRM` is the module's only caller.
 * Built on a plain AbortController rather than `AbortSignal.timeout`/`AbortSignal.any`, whose
 * support in React Native's Hermes runtime is unverified.
 */
async function fetchJsonWithTimeout<T>(url: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  try {
    // The timer covers the body read too, as `AbortSignal.timeout` did.
    const res = await fetch(url, { signal: controller.signal });
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
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
  const data = await fetchJsonWithTimeout<OSRMResponse>(url, signal);

  // A route needs at least two points to be drawn or projected onto; a public router that
  // answers "Ok" without them must fall through to the next host, not reach the map.
  const route = data.code === "Ok" ? data.routes?.[0] : undefined;
  if (route && route.geometry?.coordinates?.length >= 2) {
    // Extract steps from all legs, filtering out null (depart steps)
    const steps: RouteStep[] =
      route.legs?.flatMap(
        (leg) =>
          leg.steps
            ?.map((step) => {
              const parsed = parseManeuver(step.maneuver);
              if (!parsed) return null;
              return { ...parsed, location: step.maneuver.location };
            })
            .filter((s): s is NonNullable<typeof s> => s !== null) || []
      ) || [];

    return {
      geometry: route.geometry,
      steps,
    };
  }
  return null;
}
