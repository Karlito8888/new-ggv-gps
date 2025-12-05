import * as turf from "@turf/turf";
import { formatDistance, bearingToDirection } from "../utils/geoUtils";

// Village exit coordinates
export const VILLAGE_EXIT_COORDS = [120.951863, 14.35098];

// Route deviation and recalculation thresholds
const ROUTE_DEVIATION_THRESHOLD = 25; // meters - automatic recalculation threshold
const SIGNIFICANT_DEVIATION_THRESHOLD = 40; // meters - for detecting intentional route changes
const MIN_RECALCULATION_INTERVAL = 8000; // 8 seconds - prevent too frequent recalculations
const MIN_MOVEMENT_THRESHOLD = 8; // meters - minimum movement for route updates
const DIRECTION_CHANGE_THRESHOLD = 35; // degrees - significant direction change
const PERSISTENT_DEVIATION_TIME = 6000; // 6 seconds - time to confirm intentional deviation

// Configuration constants
const ROUTING_CONFIG = {
  OSRM_URL: "https://routing.openstreetmap.de/routed-foot/route/v1/walking",
  ORS_URL: "https://api.openrouteservice.org/v2/directions/foot-walking",
  TIMEOUT: 8000,
  WALKING_SPEED: 1.4, // m/s for fallback calculations
};

// Route recalculation state
let lastRecalculationTime = 0;
let lastRecalculationPosition = null;

// Persistent deviation tracking
let deviationStartTime = null;
let lastUserDirection = null;
let _consecutiveDeviations = 0;

// Layer IDs for native MapLibre management
const LAYER_IDS = {
  ROUTE_SHADOW: "route-line-shadow",
  ROUTE_CASING: "route-line-casing",
  ROUTE_LINE: "route-line",
  TRAVELED_SHADOW: "traveled-route-line-shadow",
  TRAVELED_CASING: "traveled-route-line-casing",
  TRAVELED_LINE: "traveled-route-line",
};

const SOURCE_IDS = {
  ROUTE: "route",
  TRAVELED: "traveled-route",
};

// ============================================================================
// NATIVE MAPLIBRE LAYER MANAGEMENT
// ============================================================================

/**
 * Initialize native MapLibre route sources and layers
 * Called once when map loads
 */
export function initNativeRouteLayers(map) {
  if (!map) return;

  // Create empty sources
  if (!map.getSource(SOURCE_IDS.ROUTE)) {
    map.addSource(SOURCE_IDS.ROUTE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      buffer: 0,
      tolerance: 0.375,
    });
  }

  if (!map.getSource(SOURCE_IDS.TRAVELED)) {
    map.addSource(SOURCE_IDS.TRAVELED, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      buffer: 0,
      tolerance: 0.375,
    });
  }

  // Add route layers (shadow, casing, line) - order matters for z-index
  if (!map.getLayer(LAYER_IDS.ROUTE_SHADOW)) {
    map.addLayer({
      id: LAYER_IDS.ROUTE_SHADOW,
      type: "line",
      source: SOURCE_IDS.ROUTE,
      paint: {
        "line-color": "#000000",
        "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 10, 8, 15, 10, 20, 16],
        "line-opacity": 0.2,
        "line-blur": 2,
      },
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
    });
  }

  if (!map.getLayer(LAYER_IDS.ROUTE_CASING)) {
    map.addLayer({
      id: LAYER_IDS.ROUTE_CASING,
      type: "line",
      source: SOURCE_IDS.ROUTE,
      paint: {
        "line-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          "#1e40af",
          15,
          "#1d4ed8",
          20,
          "#1e3a8a",
        ],
        "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 10, 6, 15, 8, 20, 14],
        "line-opacity": 0.8,
      },
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
    });
  }

  if (!map.getLayer(LAYER_IDS.ROUTE_LINE)) {
    map.addLayer({
      id: LAYER_IDS.ROUTE_LINE,
      type: "line",
      source: SOURCE_IDS.ROUTE,
      paint: {
        "line-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          "#3b82f6",
          15,
          "#2563eb",
          20,
          "#1d4ed8",
        ],
        "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 10, 4, 15, 6, 20, 12],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.9, 15, 0.95, 20, 1.0],
      },
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
    });
  }

  // Add traveled route layers
  if (!map.getLayer(LAYER_IDS.TRAVELED_SHADOW)) {
    map.addLayer({
      id: LAYER_IDS.TRAVELED_SHADOW,
      type: "line",
      source: SOURCE_IDS.TRAVELED,
      paint: {
        "line-color": "#000000",
        "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 10, 7, 15, 9, 20, 14],
        "line-opacity": 0.15,
        "line-blur": 1.5,
        "line-dasharray": [3, 3],
      },
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
    });
  }

  if (!map.getLayer(LAYER_IDS.TRAVELED_CASING)) {
    map.addLayer({
      id: LAYER_IDS.TRAVELED_CASING,
      type: "line",
      source: SOURCE_IDS.TRAVELED,
      paint: {
        "line-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          "#d97706",
          15,
          "#c2410c",
          20,
          "#9a3412",
        ],
        "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 10, 5, 15, 7, 20, 12],
        "line-opacity": 0.8,
        "line-dasharray": [3, 3],
      },
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
    });
  }

  if (!map.getLayer(LAYER_IDS.TRAVELED_LINE)) {
    map.addLayer({
      id: LAYER_IDS.TRAVELED_LINE,
      type: "line",
      source: SOURCE_IDS.TRAVELED,
      paint: {
        "line-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          "#f59e0b",
          15,
          "#f97316",
          20,
          "#ea580c",
        ],
        "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 10, 2.5, 15, 4, 20, 8],
        "line-opacity": 1,
        "line-dasharray": [3, 2],
      },
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
    });
  }

  console.log("✅ Native route layers initialized");
}

/**
 * Update route source with new GeoJSON data
 */
export function updateRouteSource(map, routeGeoJSON) {
  if (!map) return;

  const source = map.getSource(SOURCE_IDS.ROUTE);
  if (source) {
    source.setData(routeGeoJSON || { type: "FeatureCollection", features: [] });
    console.log("✅ Route source updated");
  }
}

/**
 * Update traveled route source with new GeoJSON data
 */
export function updateTraveledSource(map, traveledGeoJSON) {
  if (!map) return;

  const source = map.getSource(SOURCE_IDS.TRAVELED);
  if (source) {
    source.setData(traveledGeoJSON || { type: "FeatureCollection", features: [] });
  }
}

/**
 * Clear all route data from sources
 */
export function clearRouteSources(map) {
  if (!map) return;

  const emptyData = { type: "FeatureCollection", features: [] };

  const routeSource = map.getSource(SOURCE_IDS.ROUTE);
  if (routeSource) routeSource.setData(emptyData);

  const traveledSource = map.getSource(SOURCE_IDS.TRAVELED);
  if (traveledSource) traveledSource.setData(emptyData);

  console.log("✅ Route sources cleared");
}

/**
 * Cleanup route layers and sources
 * Called when navigation ends or component unmounts
 */
export function cleanupRouteLayers(map) {
  if (!map) return;

  // Remove layers first (must be done before removing sources)
  const layerIds = Object.values(LAYER_IDS);
  layerIds.forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
  });

  // Remove sources
  const sourceIds = Object.values(SOURCE_IDS);
  sourceIds.forEach((sourceId) => {
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  });

  console.log("✅ Route layers cleaned up");
}

// ============================================================================
// ROUTE DEVIATION DETECTION
// ============================================================================

/**
 * Check if user has deviated from the route using native MapLibre queryRenderedFeatures
 */
export function isUserOffRoute(
  userLat,
  userLon,
  routeGeometry,
  threshold = ROUTE_DEVIATION_THRESHOLD,
  map = null,
) {
  if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 2) {
    return false;
  }

  // Try native MapLibre queryRenderedFeatures first
  if (map && typeof map.queryRenderedFeatures === "function") {
    try {
      const userPoint = map.project([userLon, userLat]);
      const zoom = map.getZoom();
      const metersPerPixel = 1.5 * Math.pow(2, 15 - zoom);
      const pixelThreshold = Math.min(Math.max(threshold / metersPerPixel, 10), 100);

      const nearbyFeatures = map.queryRenderedFeatures(
        [
          [userPoint.x - pixelThreshold, userPoint.y - pixelThreshold],
          [userPoint.x + pixelThreshold, userPoint.y + pixelThreshold],
        ],
        {
          layers: [LAYER_IDS.ROUTE_LINE, LAYER_IDS.ROUTE_CASING],
        },
      );

      if (nearbyFeatures.length > 0) {
        return false; // User is on route
      }

      // No features found within threshold
      console.log(`🛣️ No route features found within ${threshold}m`);
      return true;
    } catch (error) {
      console.warn("queryRenderedFeatures failed, falling back to Turf.js:", error);
    }
  }

  // Fallback to Turf.js
  const userPoint = turf.point([userLon, userLat]);
  const routeLine = turf.lineString(routeGeometry.coordinates);
  const nearest = turf.nearestPointOnLine(routeLine, userPoint, { units: "meters" });
  const minDistance = nearest.properties.dist;

  const isOffRoute = minDistance > threshold;
  if (isOffRoute) {
    console.log(
      `🛣️ User is off-route: ${minDistance.toFixed(1)}m from route (threshold: ${threshold}m)`,
    );
  }
  return isOffRoute;
}

/**
 * Detect if user is approaching an intersection or decision point
 */
export function isApproachingDecisionPoint(
  userLat,
  userLon,
  routeGeometry,
  lookAheadDistance = 50,
) {
  if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 3) {
    return false;
  }

  const userPoint = turf.point([userLon, userLat]);
  const routeLine = turf.lineString(routeGeometry.coordinates);
  const nearest = turf.nearestPointOnLine(routeLine, userPoint);
  const segmentIndex = nearest.properties.index;

  let totalDistance = 0;
  for (
    let i = segmentIndex;
    i < routeGeometry.coordinates.length - 2 && totalDistance < lookAheadDistance;
    i++
  ) {
    const [lon1, lat1] = routeGeometry.coordinates[i];
    const [lon2, lat2] = routeGeometry.coordinates[i + 1];
    const [lon3, lat3] = routeGeometry.coordinates[i + 2];

    totalDistance += turf.distance([lon1, lat1], [lon2, lat2], { units: "meters" });

    const bearing1 = turf.bearing(turf.point([lon1, lat1]), turf.point([lon2, lat2]));
    const bearing2 = turf.bearing(turf.point([lon2, lat2]), turf.point([lon3, lat3]));
    const angleDiff = Math.abs(bearing2 - bearing1);
    const normalizedAngle = Math.min(angleDiff, 360 - angleDiff);

    if (normalizedAngle > 30) {
      console.log(`🛣️ Decision point detected ahead: ${normalizedAngle.toFixed(1)}° turn`);
      return true;
    }
  }

  return false;
}

/**
 * Detect if user has intentionally changed route direction
 */
export function detectIntentionalRouteChange(
  userLat,
  userLon,
  currentRoute,
  previousLat = null,
  previousLon = null,
) {
  if (!currentRoute || !currentRoute.features || !currentRoute.features[0]) {
    return false;
  }

  const now = Date.now();
  const routeGeometry = currentRoute.features[0].geometry;
  const isOffRoute = isUserOffRoute(
    userLat,
    userLon,
    routeGeometry,
    SIGNIFICANT_DEVIATION_THRESHOLD,
  );
  const isNearDecisionPoint = isApproachingDecisionPoint(userLat, userLon, routeGeometry);

  let currentUserDirection = null;
  if (previousLat && previousLon) {
    currentUserDirection = turf.bearing(
      turf.point([previousLon, previousLat]),
      turf.point([userLon, userLat]),
    );
  }

  if (isOffRoute) {
    _consecutiveDeviations++;

    if (!deviationStartTime) {
      deviationStartTime = now;
      console.log("🚨 Started tracking route deviation");
    }

    const requiredTime = isNearDecisionPoint
      ? PERSISTENT_DEVIATION_TIME / 2
      : PERSISTENT_DEVIATION_TIME;
    const deviationDuration = now - deviationStartTime;

    if (deviationDuration >= requiredTime) {
      console.log(
        `🛣️ Intentional route change detected after ${(deviationDuration / 1000).toFixed(1)}s`,
      );
      deviationStartTime = null;
      _consecutiveDeviations = 0;
      return true;
    }

    if (lastUserDirection && currentUserDirection) {
      const directionChange = Math.abs(currentUserDirection - lastUserDirection);
      const normalizedChange = Math.min(directionChange, 360 - directionChange);
      const threshold = isNearDecisionPoint
        ? DIRECTION_CHANGE_THRESHOLD * 0.7
        : DIRECTION_CHANGE_THRESHOLD;

      if (normalizedChange >= threshold) {
        console.log(`🔄 Significant direction change detected: ${normalizedChange.toFixed(1)}°`);
        deviationStartTime = null;
        _consecutiveDeviations = 0;
        return true;
      }
    }
  } else {
    if (deviationStartTime) {
      console.log("✅ User back on route, resetting deviation tracking");
      deviationStartTime = null;
      _consecutiveDeviations = 0;
    }
  }

  if (currentUserDirection !== null) {
    lastUserDirection = currentUserDirection;
  }

  return false;
}

/**
 * Check if route should be recalculated
 */
export function shouldRecalculateRoute(
  userLat,
  userLon,
  currentRoute,
  forceRecalculation = false,
  previousLat = null,
  previousLon = null,
  map = null,
) {
  const now = Date.now();

  if (forceRecalculation) {
    console.log("🔄 Manual recalculation requested");
    return true;
  }

  if (now - lastRecalculationTime < MIN_RECALCULATION_INTERVAL) {
    return false;
  }

  if (lastRecalculationPosition) {
    const movementDistance = turf.distance(
      [userLon, userLat],
      [lastRecalculationPosition.lon, lastRecalculationPosition.lat],
      { units: "meters" },
    );

    if (movementDistance < MIN_MOVEMENT_THRESHOLD) {
      return false;
    }
  }

  const intentionalChange = detectIntentionalRouteChange(
    userLat,
    userLon,
    currentRoute,
    previousLat,
    previousLon,
  );
  if (intentionalChange) {
    console.log("🛣️ Intentional route change detected, triggering recalculation");
    return true;
  }

  if (currentRoute && currentRoute.features && currentRoute.features[0]) {
    const routeGeometry = currentRoute.features[0].geometry;
    const isOffRoute = isUserOffRoute(
      userLat,
      userLon,
      routeGeometry,
      ROUTE_DEVIATION_THRESHOLD,
      map,
    );

    if (isOffRoute) {
      console.log("🚨 User is off-route, automatic recalculation triggered");
      return true;
    }
  }

  return false;
}

/**
 * Update recalculation state
 */
export function updateRecalculationState(userLat, userLon) {
  lastRecalculationTime = Date.now();
  lastRecalculationPosition = { lat: userLat, lon: userLon };
}

/**
 * Reset recalculation state
 */
export function resetRecalculationState() {
  lastRecalculationTime = 0;
  lastRecalculationPosition = null;
  deviationStartTime = null;
  lastUserDirection = null;
  _consecutiveDeviations = 0;
}

// ============================================================================
// ARRIVAL DETECTION
// ============================================================================

/**
 * Check if user has arrived at destination
 */
export function hasArrived(userLat, userLon, destLat, destLon) {
  return turf.distance([userLon, userLat], [destLon, destLat], { units: "meters" }) <= 10;
}

// ============================================================================
// ROUTE CREATION
// ============================================================================

/**
 * Creates a simple straight-line route (fallback)
 */
function createDirectRoute(startLat, startLon, endLat, endLon) {
  const start = turf.point([startLon, startLat]);
  const end = turf.point([endLon, endLat]);
  const distance = turf.distance(start, end, { units: "meters" });

  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [startLon, startLat],
        [endLon, endLat],
      ],
    },
    properties: {
      distance,
      duration: Math.round(distance / ROUTING_CONFIG.WALKING_SPEED),
      source: "direct",
    },
  };
}

/**
 * Try OSRM routing service
 */
async function tryOSRM(startLat, startLon, endLat, endLon) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ROUTING_CONFIG.TIMEOUT);

  const url = `${ROUTING_CONFIG.OSRM_URL}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(url, {
    signal: controller.signal,
    headers: { Accept: "application/json" },
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`OSRM HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.routes?.[0]) {
    throw new Error("OSRM returned no routes");
  }

  return {
    type: "Feature",
    geometry: data.routes[0].geometry,
    properties: {
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      steps: data.routes[0].legs[0]?.steps || [],
      source: "osrm",
    },
  };
}

/**
 * Try OpenRouteService as fallback
 */
async function tryORS(startLat, startLon, endLat, endLon) {
  const apiKey = import.meta.env.VITE_OPENROUTE_API_KEY;
  if (!apiKey) throw new Error("Missing ORS API key");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ROUTING_CONFIG.TIMEOUT);

  const response = await fetch(ROUTING_CONFIG.ORS_URL, {
    signal: controller.signal,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({
      coordinates: [
        [startLon, startLat],
        [endLon, endLat],
      ],
      format: "geojson",
    }),
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`ORS HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data.features?.[0]) {
    throw new Error("ORS returned no routes");
  }

  return {
    ...data.features[0],
    properties: {
      ...data.features[0].properties,
      source: "ors",
    },
  };
}

/**
 * Main route creation function with cascading fallback
 */
export async function createRoute(startLat, startLon, endLat, endLon, map = null) {
  console.log("🚀 Creating route with cascading fallback");

  const services = [
    {
      name: "OSRM (OpenStreetMap.de)",
      fn: () => tryOSRM(startLat, startLon, endLat, endLon),
    },
    {
      name: "OpenRouteService",
      fn: () => tryORS(startLat, startLon, endLat, endLon),
    },
    {
      name: "Direct Route",
      fn: () => Promise.resolve(createDirectRoute(startLat, startLon, endLat, endLon)),
    },
  ];

  for (const [index, service] of services.entries()) {
    try {
      console.log(`📍 Attempt ${index + 1}/${services.length}: ${service.name}`);
      const result = await service.fn();
      console.log(`✅ Success with ${service.name}`);

      // Update native MapLibre source if map is provided
      if (map) {
        const routeData = {
          type: "FeatureCollection",
          features: [result],
        };
        updateRouteSource(map, routeData);
      }

      return result;
    } catch (error) {
      console.warn(`❌ ${service.name} failed:`, error.message);

      if (index === services.length - 1) {
        const directRoute = createDirectRoute(startLat, startLon, endLat, endLon);
        if (map) {
          updateRouteSource(map, { type: "FeatureCollection", features: [directRoute] });
        }
        return directRoute;
      }
    }
  }

  const directRoute = createDirectRoute(startLat, startLon, endLat, endLon);
  if (map) {
    updateRouteSource(map, { type: "FeatureCollection", features: [directRoute] });
  }
  return directRoute;
}

// ============================================================================
// NAVIGATION INSTRUCTIONS
// ============================================================================

/**
 * Calculate navigation instructions
 */
export function getNavigationInstructions(userLat, userLon, destLat, destLon, deviceBearing = 0) {
  const userPoint = turf.point([userLon, userLat]);
  const destPoint = turf.point([destLon, destLat]);
  const distance = turf.distance(userPoint, destPoint, { units: "meters" });
  const bearing = turf.bearing(userPoint, destPoint);
  const relativeBearing = (bearing - deviceBearing + 360) % 360;
  const direction = bearingToDirection(bearing);

  let instruction = "";
  if (distance <= 10) {
    instruction = "You have arrived!";
  } else {
    const bearingRanges = [
      { max: 15, text: "Continue straight ahead" },
      { max: 75, text: "Turn slightly right" },
      { max: 105, text: "Turn right" },
      { max: 165, text: "Turn sharply right" },
      { max: 195, text: "Turn around" },
      { max: 255, text: "Turn sharply left" },
      { max: 285, text: "Turn left" },
      { max: 345, text: "Turn slightly left" },
      { max: 360, text: "Continue straight ahead" },
    ];

    instruction = bearingRanges.find((range) => relativeBearing <= range.max).text;

    if (distance < 50) {
      instruction += ` (${formatDistance(distance)})`;
    }
  }

  return {
    instruction,
    distance: formatDistance(distance),
    bearing,
    direction,
    relativeBearing,
    rawDistance: distance,
  };
}

// ============================================================================
// ROUTE SPLITTING (TRAVELED / REMAINING)
// ============================================================================

/**
 * Create a route showing only the remaining portion
 */
export function createRemainingRoute(userLat, userLon, originalRoute, map = null) {
  if (!originalRoute || !originalRoute.features || !originalRoute.features[0]) {
    return originalRoute;
  }

  const routeFeature = originalRoute.features[0];
  const routeGeometry = routeFeature.geometry;

  if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 2) {
    return originalRoute;
  }

  const userPoint = turf.point([userLon, userLat]);
  const routeLine = turf.lineString(routeGeometry.coordinates);
  const nearest = turf.nearestPointOnLine(routeLine, userPoint, { units: "meters" });

  const segmentIndex = nearest.properties.index;
  const closestPoint = nearest.geometry.coordinates;

  const remainingCoordinates = [closestPoint];
  for (let i = segmentIndex + 1; i < routeGeometry.coordinates.length; i++) {
    remainingCoordinates.push(routeGeometry.coordinates[i]);
  }

  if (remainingCoordinates.length < 2) {
    return originalRoute;
  }

  const remainingLine = turf.lineString(remainingCoordinates);
  const remainingDistance = turf.length(remainingLine, { units: "meters" });

  const remainingRoute = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: remainingCoordinates,
        },
        properties: {
          ...routeFeature.properties,
          distance: remainingDistance,
          isRemainingRoute: true,
        },
      },
    ],
  };

  // Update native MapLibre source if map is provided
  if (map) {
    updateRouteSource(map, remainingRoute);
  }

  return remainingRoute;
}

/**
 * Check if the remaining route should be updated
 */
export function shouldUpdateRemainingRoute(
  userLat,
  userLon,
  currentRoute,
  lastUpdatePosition,
  threshold = 20,
) {
  if (!lastUpdatePosition) {
    return true;
  }

  const movementDistance = turf.distance(
    [userLon, userLat],
    [lastUpdatePosition.lon, lastUpdatePosition.lat],
    { units: "meters" },
  );

  if (movementDistance >= threshold) {
    console.log(`📍 User moved ${formatDistance(movementDistance)}, updating remaining route`);
    return true;
  }

  return false;
}

/**
 * Create a route showing the traveled portion
 */
export function createTraveledRoute(userLat, userLon, originalRoute, map = null) {
  if (!originalRoute || !originalRoute.features || !originalRoute.features[0]) {
    return null;
  }

  const routeFeature = originalRoute.features[0];
  const routeGeometry = routeFeature.geometry;

  if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 2) {
    return null;
  }

  const userPoint = turf.point([userLon, userLat]);
  const routeLine = turf.lineString(routeGeometry.coordinates);
  const nearest = turf.nearestPointOnLine(routeLine, userPoint, { units: "meters" });

  const segmentIndex = nearest.properties.index;
  const closestPoint = nearest.geometry.coordinates;
  const coordinates = routeGeometry.coordinates;

  const traveledCoordinates = [];
  for (let i = 0; i <= segmentIndex; i++) {
    traveledCoordinates.push(coordinates[i]);
  }

  if (nearest.properties.location > 0) {
    traveledCoordinates.push(closestPoint);
  }

  if (traveledCoordinates.length < 2) {
    return null;
  }

  const traveledLine = turf.lineString(traveledCoordinates);
  const traveledDistance = turf.length(traveledLine, { units: "meters" });

  const traveledRoute = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: traveledCoordinates,
        },
        properties: {
          distance: traveledDistance,
          isTraveledRoute: true,
        },
      },
    ],
  };

  // Update native MapLibre source if map is provided
  if (map) {
    updateTraveledSource(map, traveledRoute);
  }

  return traveledRoute;
}
