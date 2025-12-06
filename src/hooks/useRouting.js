import { useState, useEffect, useRef } from "react";

// ORS API Key from environment
const ORS_API_KEY = import.meta.env.VITE_OPENROUTE_API_KEY;

// Haversine distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Parse OSRM maneuver to simple instruction
function parseManeuver(maneuver, distance) {
  const type = maneuver.type;
  const modifier = maneuver.modifier;

  // Map maneuver types to simple icons/text
  if (type === "arrive") {
    return { type: "arrive", icon: "📍", distance: 0 };
  }
  if (type === "depart" || type === "continue" || type === "new name") {
    return { type: "straight", icon: "↑", distance };
  }
  if (type === "turn" || type === "end of road" || type === "fork") {
    if (modifier?.includes("left")) {
      return { type: "left", icon: "←", distance };
    }
    if (modifier?.includes("right")) {
      return { type: "right", icon: "→", distance };
    }
    return { type: "straight", icon: "↑", distance };
  }
  if (type === "roundabout" || type === "rotary") {
    return { type: "roundabout", icon: "⟳", distance };
  }
  // Default
  return { type: "straight", icon: "↑", distance };
}

// OSRM routing (primary)
async function fetchOSRM(originLng, originLat, destLng, destLat, signal) {
  const url = `https://router.project-osrm.org/route/v1/foot/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url, { signal });
  const data = await res.json();

  if (data.code === "Ok" && data.routes?.[0]) {
    const route = data.routes[0];
    // Extract steps from all legs
    const steps =
      route.legs?.flatMap(
        (leg) =>
          leg.steps?.map((step) => ({
            ...parseManeuver(step.maneuver, step.distance),
            location: step.maneuver.location, // [lng, lat]
          })) || [],
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
  const res = await fetch(url, { signal });
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

export function useRouting(map, origin, destination) {
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [distance, setDistance] = useState(0);
  const [steps, setSteps] = useState([]);
  const abortRef = useRef(null);
  const lastOriginRef = useRef(null);

  const originLat = origin?.latitude;
  const originLng = origin?.longitude;
  const destLat = destination?.coordinates?.[1];
  const destLng = destination?.coordinates?.[0];

  useEffect(() => {
    if (!map || !originLat || !originLng || !destLat || !destLng) {
      setRouteGeoJSON(null);
      return;
    }

    // Only recalculate route if user moved > 30 meters from last calculation
    if (lastOriginRef.current) {
      const movedDistance = getDistance(
        lastOriginRef.current.lat,
        lastOriginRef.current.lng,
        originLat,
        originLng,
      );
      if (movedDistance < 30) {
        return; // Skip recalculation, user hasn't moved enough
      }
    }

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
          console.log("Route: OSRM");
          setRouteGeoJSON(route.geometry);
          setDistance(route.distance);
          setSteps(route.steps || []);
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
          console.log("Route: ORS (fallback)");
          setRouteGeoJSON(route.geometry);
          setDistance(route.distance);
          setSteps([]); // ORS doesn't provide steps in this format
          updateMapRoute(map, route.geometry);
          return;
        }
      } catch (e) {
        if (e.name === "AbortError") return;
        console.warn("ORS failed:", e.message);
      }

      // 3. Fallback: direct line
      console.log("Route: Direct line (fallback)");
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
      updateMapRoute(map, geometry);
    };

    fetchRoute();
    return () => abortRef.current?.abort();
  }, [map, originLat, originLng, destLat, destLng]);

  return { routeGeoJSON, distance, steps };
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
