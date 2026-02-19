import { useState, useEffect, useRef } from "react";
import { getDistance } from "../lib/geo";

// ORS API Key from environment
const ORS_API_KEY = import.meta.env.VITE_OPENROUTE_API_KEY;

// Icon mapping for turn modifiers
const TURN_ICONS = {
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
 * Parse OSRM maneuver to navigation instruction
 * Returns null for steps that should be filtered out (depart)
 */
function parseManeuver(maneuver, distance) {
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

  // For turns, end of road, fork - use modifier to determine direction
  if (type === "turn" || type === "end of road" || type === "fork") {
    const icon = TURN_ICONS[modifier] || "↑";
    const isSignificant = modifier && modifier !== "straight";
    return {
      type: modifier || "straight",
      icon,
      modifier,
      distance,
      isSignificant,
    };
  }

  // Continue/new name - only significant if there's a direction change
  if (type === "continue" || type === "new name") {
    const icon = TURN_ICONS[modifier] || "↑";
    const isSignificant = modifier && modifier !== "straight";
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
async function fetchWithTimeout(url, signal) {
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
async function fetchOSRM(originLng, originLat, destLng, destLat, signal) {
  const url = `https://router.project-osrm.org/route/v1/foot/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetchWithTimeout(url, signal);
  const data = await res.json();

  if (data.code === "Ok" && data.routes?.[0]) {
    const route = data.routes[0];
    // Extract steps from all legs, filtering out null (depart steps)
    const steps =
      route.legs?.flatMap(
        (leg) =>
          leg.steps
            ?.map((step) => {
              const parsed = parseManeuver(step.maneuver, step.distance);
              if (!parsed) return null; // Skip depart steps
              return {
                ...parsed,
                location: step.maneuver.location, // [lng, lat]
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
async function fetchORS(originLng, originLat, destLng, destLat, signal) {
  if (!ORS_API_KEY) return null;

  const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${ORS_API_KEY}&start=${originLng},${originLat}&end=${destLng},${destLat}`;
  const res = await fetchWithTimeout(url, signal);
  const data = await res.json();

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

export function useRouting(map, origin, destination) {
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [distance, setDistance] = useState(0);
  const [steps, setSteps] = useState([]);
  const [routeSource, setRouteSource] = useState(null); // "osrm" | "ors" | "direct"
  const abortRef = useRef(null);
  const lastOriginRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  const retryCountRef = useRef(0);

  const originLat = origin?.latitude;
  const originLng = origin?.longitude;
  const destLat = destination?.coordinates?.[1];
  const destLng = destination?.coordinates?.[0];

  // Track destination to detect changes (recalculate immediately on new destination)
  const lastDestRef = useRef(null);

  // Track if params are valid (used for derived return value)
  const hasValidParams = map && originLat && originLng && destLat && destLng;

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
        originLat,
        originLng
      );
      if (movedDistance < 30) {
        return; // Skip recalculation, user hasn't moved enough
      }
    }

    // Update destination ref and reset retry on destination change
    if (destChanged) {
      retryCountRef.current = 0;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    }
    lastDestRef.current = { lat: destLat, lng: destLng };

    const fetchRoute = async () => {
      // Save current origin for next comparison
      lastOriginRef.current = { lat: originLat, lng: originLng };
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const signal = abortRef.current.signal;

      let route = null;

      // 1. Try OSRM (primary)
      try {
        route = await fetchOSRM(originLng, originLat, destLng, destLat, signal);
        if (route) {
          console.info("Route: OSRM");
          setRouteGeoJSON(route.geometry);
          setDistance(route.distance);
          setSteps(route.steps || []);
          setRouteSource("osrm");
          updateMapRoute(map, route.geometry);
          return;
        }
      } catch (e) {
        if (e.name === "AbortError") return;
        console.warn("OSRM failed:", e.message);
      }

      // 2. Try ORS (fallback)
      try {
        route = await fetchORS(originLng, originLat, destLng, destLat, signal);
        if (route) {
          console.info("Route: ORS (fallback)");
          setRouteGeoJSON(route.geometry);
          setDistance(route.distance);
          setSteps([]); // ORS doesn't provide steps in this format
          setRouteSource("ors");
          updateMapRoute(map, route.geometry);
          return;
        }
      } catch (e) {
        if (e.name === "AbortError") return;
        console.warn("ORS failed:", e.message);
      }

      // 3. Fallback: direct line
      console.info("Route: Direct line (fallback)");
      const geometry = {
        type: "LineString",
        coordinates: [
          [originLng, originLat],
          [destLng, destLat],
        ],
      };
      setRouteGeoJSON(geometry);
      setDistance(getDistance(originLat, originLng, destLat, destLng));
      setSteps([
        {
          type: "straight",
          icon: "↑",
          distance: getDistance(originLat, originLng, destLat, destLng),
        },
      ]);
      setRouteSource("direct");
      updateMapRoute(map, geometry);

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
        try {
          const route = await fetchOSRM(
            originLng,
            originLat,
            destLng,
            destLat,
            abortRef.current?.signal
          );
          if (route) {
            console.info("Route: OSRM retry successful!");
            setRouteGeoJSON(route.geometry);
            setDistance(route.distance);
            setSteps(route.steps || []);
            setRouteSource("osrm");
            updateMapRoute(map, route.geometry);
            retryCountRef.current = 0; // Reset for next time
            return;
          }
        } catch (e) {
          if (e.name === "AbortError") return;
          console.warn("OSRM retry failed:", e.message);
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
      abortRef.current?.abort();
    };
  }, [hasValidParams, map, originLat, originLng, destLat, destLng]);

  // Derive return values - return null/empty when params invalid (no sync setState needed)
  return {
    routeGeoJSON: hasValidParams ? routeGeoJSON : null,
    distance: hasValidParams ? distance : 0,
    steps: hasValidParams ? steps : [],
    routeSource: hasValidParams ? routeSource : null,
  };
}

function updateMapRoute(map, geometry) {
  if (map.getSource("route")) {
    map.getSource("route").setData(geometry);
  } else {
    map.addSource("route", { type: "geojson", data: geometry });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#4285F4", "line-width": 5 },
    });
  }
}
