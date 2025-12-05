import { useState, useEffect, useRef } from "react";

/**
 * useRouting Hook
 *
 * Calculates and manages route geometry with cascading fallbacks.
 * Follows OSRM API specification: https://project-osrm.org/docs/v5.24.0/api/
 *
 * Fallback order:
 * 1. OSRM (router.project-osrm.org) - Free, fast routing
 * 2. Direct line - Last resort fallback
 *
 * Route visualization: Single blue line (route-remaining) from user to destination.
 * NO route-traveled visualization behind user (per requirements).
 *
 * @param {maplibregl.Map|null} map - MapLibre map instance
 * @param {Object|null} origin - User location {latitude, longitude}
 * @param {Object|null} destination - Destination {coordinates: [lng, lat], name, type}
 *
 * @returns {Object} Hook return values
 * @returns {Object|null} routeGeoJSON - Route geometry as GeoJSON LineString
 * @returns {number} distance - Route distance in meters
 * @returns {number} duration - Estimated duration in seconds
 * @returns {boolean} isCalculating - Loading state
 * @returns {Error|null} error - Calculation errors
 */
export function useRouting(map, origin, destination) {
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const lastRecalculationRef = useRef(0); // Track last recalculation time

  // Extract stable values to avoid complex expressions in deps
  const originLat = origin?.latitude;
  const originLng = origin?.longitude;
  const destLng = destination?.coordinates?.[0];
  const destLat = destination?.coordinates?.[1];

  // Calculate route when origin or destination changes
  useEffect(() => {
    if (!map || !origin || !destination) {
      setRouteGeoJSON(null);
      return;
    }

    const calculateRoute = async () => {
      // Abort previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsCalculating(true);
      setError(null);

      try {
        // Try OSRM first (official API format)
        const osrmResult = await fetchOSRMRoute(
          origin,
          destination,
          abortControllerRef.current.signal,
        );

        if (osrmResult) {
          setRouteGeoJSON(osrmResult.geometry);
          setDistance(osrmResult.distance);
          setDuration(osrmResult.duration);
          addRouteToMap(map, osrmResult.geometry);
          setIsCalculating(false);
          return;
        }

        // Fallback: Direct line
        console.warn("OSRM failed, using direct line fallback");
        const directLine = createDirectLineRoute(origin, destination);
        setRouteGeoJSON(directLine.geometry);
        setDistance(directLine.distance);
        setDuration(directLine.duration);
        addRouteToMap(map, directLine.geometry);
        setIsCalculating(false);
      } catch (err) {
        if (err.name === "AbortError") {
          console.log("Route calculation aborted");
          return;
        }
        console.error("Route calculation error:", err);
        setError(err);

        // Still show direct line on error
        const directLine = createDirectLineRoute(origin, destination);
        setRouteGeoJSON(directLine.geometry);
        setDistance(directLine.distance);
        setDuration(directLine.duration);
        addRouteToMap(map, directLine.geometry);
        setIsCalculating(false);
      }
    };

    calculateRoute();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [map, originLat, originLng, destLng, destLat, origin, destination]);

  // Detect deviation and trigger recalculation
  // Checks every 5 seconds if user is > 25m from route
  useEffect(() => {
    if (!map || !origin || !routeGeoJSON || isCalculating) {
      return;
    }

    const checkDeviation = () => {
      // Prevent recalculation spam (minimum 10 seconds between recalculations)
      const now = Date.now();
      if (now - lastRecalculationRef.current < 10000) {
        return;
      }

      // Calculate distance from user to closest point on route
      const distanceFromRoute = calculateDistanceToRoute(origin, routeGeoJSON);

      // Deviation threshold: 25 meters
      if (distanceFromRoute > 25) {
        console.log(`User deviated ${Math.round(distanceFromRoute)}m from route, recalculating...`);
        lastRecalculationRef.current = now;

        // Trigger recalculation by clearing route
        // This will cause the first useEffect to recalculate
        setRouteGeoJSON(null);
      }
    };

    // Check deviation every 5 seconds
    const intervalId = setInterval(checkDeviation, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [map, origin, routeGeoJSON, isCalculating]);

  return {
    routeGeoJSON,
    distance,
    duration,
    isCalculating,
    error,
  };
}

/**
 * Calculate distance from user location to closest point on route
 * Uses Haversine formula for accuracy
 *
 * @param {Object} origin - User location {latitude, longitude}
 * @param {Object} routeGeoJSON - Route geometry (GeoJSON LineString)
 * @returns {number} Distance in meters to closest route point
 */
function calculateDistanceToRoute(origin, routeGeoJSON) {
  if (!routeGeoJSON || !routeGeoJSON.coordinates) {
    return Infinity;
  }

  const coordinates = routeGeoJSON.coordinates;
  let minDistance = Infinity;

  // Check distance to each point on the route
  for (const [lng, lat] of coordinates) {
    const distance = calculateHaversineDistance(origin.latitude, origin.longitude, lat, lng);

    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return minDistance;
}

/**
 * Fetch route from OSRM API
 * Official docs: https://project-osrm.org/docs/v5.24.0/api/#route-service
 *
 * @param {Object} origin - {latitude, longitude}
 * @param {Object} destination - {coordinates: [lng, lat]}
 * @param {AbortSignal} signal - Abort signal for fetch
 * @returns {Promise<Object|null>} Route data or null if failed
 */
async function fetchOSRMRoute(origin, destination, signal) {
  // OSRM coordinate format: longitude,latitude
  // https://project-osrm.org/docs/v5.24.0/api/#general-options
  const originCoord = `${origin.longitude},${origin.latitude}`;
  const destCoord = `${destination.coordinates[0]},${destination.coordinates[1]}`;

  // Official OSRM endpoint format:
  // GET /{service}/{version}/{profile}/{coordinates}?options
  const url = `https://router.project-osrm.org/route/v1/driving/${originCoord};${destCoord}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url, {
      signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`OSRM returned ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Check for OSRM error codes
    // https://project-osrm.org/docs/v5.24.0/api/#result-objects
    if (data.code !== "Ok") {
      console.warn(`OSRM code: ${data.code}, message: ${data.message || "N/A"}`);
      return null;
    }

    // Extract route geometry (GeoJSON format specified by geometries=geojson)
    const route = data.routes[0];
    if (!route || !route.geometry) {
      console.warn("OSRM returned no route geometry");
      return null;
    }

    return {
      geometry: route.geometry, // Already GeoJSON LineString
      distance: route.distance, // Meters (per docs)
      duration: route.duration, // Seconds (per docs)
    };
  } catch (err) {
    if (err.name === "AbortError") {
      throw err; // Re-throw abort errors
    }
    console.warn("OSRM fetch error:", err.message);
    return null;
  }
}

/**
 * Create direct line route (fallback)
 * Simple LineString from origin to destination
 *
 * @param {Object} origin - {latitude, longitude}
 * @param {Object} destination - {coordinates: [lng, lat]}
 * @returns {Object} Route data with geometry, distance, duration
 */
function createDirectLineRoute(origin, destination) {
  const geometry = {
    type: "LineString",
    coordinates: [[origin.longitude, origin.latitude], destination.coordinates],
  };

  // Calculate straight-line distance (Haversine formula)
  const distance = calculateHaversineDistance(
    origin.latitude,
    origin.longitude,
    destination.coordinates[1],
    destination.coordinates[0],
  );

  // Estimate duration: 40 km/h average speed
  const duration = (distance / 1000) * (3600 / 40);

  return {
    geometry,
    distance,
    duration,
  };
}

/**
 * Calculate Haversine distance between two points
 * Returns distance in meters
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Add or update route on map
 * Uses MapLibre addSource/addLayer pattern
 * https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#addsource
 *
 * @param {maplibregl.Map} map - MapLibre map instance
 * @param {Object} geometry - GeoJSON LineString geometry
 */
function addRouteToMap(map, geometry) {
  // Check if source exists
  // https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#getsource
  if (map.getSource("route-remaining")) {
    // Update existing source
    // https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/#setdata
    map.getSource("route-remaining").setData(geometry);
  } else {
    // Add new source and layer
    map.addSource("route-remaining", {
      type: "geojson",
      data: geometry,
    });

    // Add route layer (blue line, 5px width)
    // Renders above blocks but below markers
    map.addLayer({
      id: "route-remaining-line",
      type: "line",
      source: "route-remaining",
      paint: {
        "line-color": "#4285F4", // Google Maps blue
        "line-width": 5,
        "line-cap": "round",
        "line-join": "round",
      },
    });
  }
}
