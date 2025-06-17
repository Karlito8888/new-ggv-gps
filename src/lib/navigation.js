import MapLibreGlDirections from "@maplibre/maplibre-gl-directions";

// Village exit coordinates
export const VILLAGE_EXIT_COORDS = [120.951863, 14.35098];

// Minimum distance to consider arrival (in meters)
export const ARRIVAL_THRESHOLD = 10;

// Route deviation and recalculation thresholds
export const ROUTE_DEVIATION_THRESHOLD = 25; // meters - automatic recalculation threshold (réduit pour plus de réactivité)
export const SIGNIFICANT_DEVIATION_THRESHOLD = 40; // meters - for detecting intentional route changes (réduit)
export const MIN_RECALCULATION_INTERVAL = 8000; // 8 seconds - prevent too frequent recalculations (réduit)
export const MIN_MOVEMENT_THRESHOLD = 8; // meters - minimum movement for route updates (réduit)
export const DIRECTION_CHANGE_THRESHOLD = 35; // degrees - significant direction change (réduit pour plus de sensibilité)
export const PERSISTENT_DEVIATION_TIME = 6000; // 6 seconds - time to confirm intentional deviation (réduit)

// Configuration constants
const ROUTING_CONFIG = {
  DIRECTIONS_OPTIONS: {
    profile: "walking",
    alternatives: false,
    congestion: false,
    geometries: "geojson",
    overview: "full",
    steps: true,
  },
  OSRM_URL: "https://routing.openstreetmap.de/routed-foot/route/v1/walking",
  ORS_URL: "https://api.openrouteservice.org/v2/directions/foot-walking",
  TIMEOUT: 8000, // 8 seconds timeout
  WALKING_SPEED: 1.4, // m/s for fallback calculations
};

// Initialize MapLibre Directions
let directions = null;

// Route recalculation state
let lastRecalculationTime = 0;
let lastRecalculationPosition = null;

// Persistent deviation tracking
let deviationStartTime = null;
let lastUserDirection = null;
let _consecutiveDeviations = 0;

export function initMapLibreDirections(map) {
  directions = new MapLibreGlDirections(map, {
    requestOptions: ROUTING_CONFIG.DIRECTIONS_OPTIONS,
    styles: {
      route: {
        "line-color": "#3b82f6",
        "line-width": 4,
        "line-opacity": 0.8,
      },
      routeAlternatives: {
        "line-color": "#94a3b8",
        "line-width": 3,
      },
    },
  });
  return directions;
}

// Calculate distance between two points in meters (haversine formula)
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate the shortest distance from a point to a line segment
export function pointToLineDistance(
  pointLat,
  pointLon,
  line1Lat,
  line1Lon,
  line2Lat,
  line2Lon
) {
  const A = pointLat - line1Lat;
  const B = pointLon - line1Lon;
  const C = line2Lat - line1Lat;
  const D = line2Lon - line1Lon;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) {
    // Line segment is actually a point
    return calculateDistance(pointLat, pointLon, line1Lat, line1Lon);
  }

  let param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
    xx = line1Lat;
    yy = line1Lon;
  } else if (param > 1) {
    xx = line2Lat;
    yy = line2Lon;
  } else {
    xx = line1Lat + param * C;
    yy = line1Lon + param * D;
  }

  return calculateDistance(pointLat, pointLon, xx, yy);
}

// Check if user has deviated from the route
export function isUserOffRoute(
  userLat,
  userLon,
  routeGeometry,
  threshold = ROUTE_DEVIATION_THRESHOLD
) {
  if (
    !routeGeometry ||
    !routeGeometry.coordinates ||
    routeGeometry.coordinates.length < 2
  ) {
    return false; // Can't determine if off-route without valid route
  }

  const coordinates = routeGeometry.coordinates;
  let minDistance = Infinity;

  // Check distance to each segment of the route
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];

    const distance = pointToLineDistance(
      userLat,
      userLon,
      lat1,
      lon1,
      lat2,
      lon2
    );
    minDistance = Math.min(minDistance, distance);

    // Early exit if we're close enough to the route
    if (minDistance <= threshold) {
      return false;
    }
  }

  const isOffRoute = minDistance > threshold;
  if (isOffRoute) {
    console.log(
      `🛣️ User is off-route: ${minDistance.toFixed(
        1
      )}m from route (threshold: ${threshold}m)`
    );
  }
  return isOffRoute;
}

// Detect if user is approaching an intersection or decision point
export function isApproachingDecisionPoint(userLat, userLon, routeGeometry, lookAheadDistance = 50) {
  if (!routeGeometry || !routeGeometry.coordinates || routeGeometry.coordinates.length < 3) {
    return false;
  }

  const coordinates = routeGeometry.coordinates;
  const userPosition = findClosestPointOnRoute(userLat, userLon, routeGeometry);
  
  if (!userPosition) return false;

  const { segmentIndex } = userPosition;
  
  // Look ahead in the route for significant direction changes (potential intersections)
  let totalDistance = 0;
  for (let i = segmentIndex; i < coordinates.length - 2 && totalDistance < lookAheadDistance; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];
    const [lon3, lat3] = coordinates[i + 2];
    
    totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
    
    // Calculate the angle between consecutive segments
    const bearing1 = calculateBearing(lat1, lon1, lat2, lon2);
    const bearing2 = calculateBearing(lat2, lon2, lat3, lon3);
    const angleDiff = Math.abs(bearing2 - bearing1);
    const normalizedAngle = Math.min(angleDiff, 360 - angleDiff);
    
    // If there's a significant turn ahead (>30°), consider it a decision point
    if (normalizedAngle > 30) {
      console.log(`🛣️ Decision point detected ahead: ${normalizedAngle.toFixed(1)}° turn in ${totalDistance.toFixed(1)}m`);
      return true;
    }
  }
  
  return false;
}

// Detect if user has intentionally changed route direction
export function detectIntentionalRouteChange(
  userLat,
  userLon,
  currentRoute,
  previousLat = null,
  previousLon = null
) {
  if (!currentRoute || !currentRoute.features || !currentRoute.features[0]) {
    return false;
  }

  const now = Date.now();
  const routeGeometry = currentRoute.features[0].geometry;
  const isOffRoute = isUserOffRoute(userLat, userLon, routeGeometry, SIGNIFICANT_DEVIATION_THRESHOLD);
  const isNearDecisionPoint = isApproachingDecisionPoint(userLat, userLon, routeGeometry);

  // Calculate user's current direction if we have previous position
  let currentUserDirection = null;
  if (previousLat && previousLon) {
    currentUserDirection = calculateBearing(previousLat, previousLon, userLat, userLon);
  }

  // Check for significant deviation
  if (isOffRoute) {
    _consecutiveDeviations++;
    
    // Start tracking deviation time
    if (!deviationStartTime) {
      deviationStartTime = now;
      console.log("🚨 Started tracking route deviation");
    }

    // Reduce required time if near a decision point (intersection/turn)
    const requiredTime = isNearDecisionPoint ? PERSISTENT_DEVIATION_TIME / 2 : PERSISTENT_DEVIATION_TIME;
    
    // Check if deviation has persisted long enough to be considered intentional
    const deviationDuration = now - deviationStartTime;
    if (deviationDuration >= requiredTime) {
      console.log(`🛣️ Intentional route change detected after ${(deviationDuration / 1000).toFixed(1)}s ${isNearDecisionPoint ? '(near intersection)' : ''}`);
      
      // Reset tracking
      deviationStartTime = null;
      _consecutiveDeviations = 0;
      return true;
    }

    // Check for significant direction change (more sensitive near decision points)
    if (lastUserDirection && currentUserDirection) {
      const directionChange = Math.abs(currentUserDirection - lastUserDirection);
      const normalizedChange = Math.min(directionChange, 360 - directionChange);
      const threshold = isNearDecisionPoint ? DIRECTION_CHANGE_THRESHOLD * 0.7 : DIRECTION_CHANGE_THRESHOLD;
      
      if (normalizedChange >= threshold) {
        console.log(`🔄 Significant direction change detected: ${normalizedChange.toFixed(1)}° ${isNearDecisionPoint ? '(near intersection)' : ''}`);
        deviationStartTime = null;
        _consecutiveDeviations = 0;
        return true;
      }
    }

    // Quick detection for major deviations (>75m from route)
    const currentDistance = isUserOffRoute(userLat, userLon, routeGeometry, 1000); // Get actual distance
    if (currentDistance && deviationDuration >= 3000) { // 3 seconds for major deviations
      console.log(`🚨 Major route deviation detected: user is far from original route`);
      deviationStartTime = null;
      _consecutiveDeviations = 0;
      return true;
    }
  } else {
    // User is back on route, reset deviation tracking
    if (deviationStartTime) {
      console.log("✅ User back on route, resetting deviation tracking");
      deviationStartTime = null;
      _consecutiveDeviations = 0;
    }
  }

  // Update last direction
  if (currentUserDirection !== null) {
    lastUserDirection = currentUserDirection;
  }

  return false;
}

// Check if route should be recalculated based on various conditions
export function shouldRecalculateRoute(
  userLat,
  userLon,
  currentRoute,
  forceRecalculation = false,
  previousLat = null,
  previousLon = null
) {
  const now = Date.now();

  // Force recalculation if requested (for manual triggers)
  if (forceRecalculation) {
    console.log("🔄 Manual recalculation requested");
    return true;
  }

  // Don't recalculate too frequently
  if (now - lastRecalculationTime < MIN_RECALCULATION_INTERVAL) {
    console.log(
      `⏱️ Recalculation cooldown active (${(
        (now - lastRecalculationTime) /
        1000
      ).toFixed(1)}s ago)`
    );
    return false;
  }

  // Check if user has moved significantly since last recalculation
  if (lastRecalculationPosition) {
    const movementDistance = calculateDistance(
      userLat,
      userLon,
      lastRecalculationPosition.lat,
      lastRecalculationPosition.lon
    );

    if (movementDistance < MIN_MOVEMENT_THRESHOLD) {
      console.log(
        `📍 Insufficient movement for recalculation (${movementDistance.toFixed(
          1
        )}m)`
      );
      return false;
    }
  }

  // Check for intentional route changes first
  const intentionalChange = detectIntentionalRouteChange(
    userLat,
    userLon,
    currentRoute,
    previousLat,
    previousLon
  );

  if (intentionalChange) {
    console.log("🛣️ Intentional route change detected, triggering recalculation");
    return true;
  }

  // Check if user is off the current route (standard deviation)
  if (currentRoute && currentRoute.features && currentRoute.features[0]) {
    const routeGeometry = currentRoute.features[0].geometry;
    const isOffRoute = isUserOffRoute(userLat, userLon, routeGeometry);

    if (isOffRoute) {
      console.log("🚨 User is off-route, automatic recalculation triggered");
      return true;
    }
  }

  return false;
}

// Update recalculation state
export function updateRecalculationState(userLat, userLon) {
  lastRecalculationTime = Date.now();
  lastRecalculationPosition = { lat: userLat, lon: userLon };
  console.log("📊 Recalculation state updated");
}

// Reset recalculation state (useful when starting new navigation)
export function resetRecalculationState() {
  lastRecalculationTime = 0;
  lastRecalculationPosition = null;
  deviationStartTime = null;
  lastUserDirection = null;
  _consecutiveDeviations = 0;
  console.log("🔄 Recalculation state reset");
}

// Calculate direction angle (bearing) between two points
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}

// Convert angle to cardinal direction
export function bearingToDirection(bearing) {
  const directions = [
    { name: "North", icon: "↑" },
    { name: "North-East", icon: "↗" },
    { name: "East", icon: "→" },
    { name: "South-East", icon: "↘" },
    { name: "South", icon: "↓" },
    { name: "South-West", icon: "↙" },
    { name: "West", icon: "←" },
    { name: "North-West", icon: "↖" },
  ];
  return directions[Math.round(bearing / 45) % 8];
}

// Format distance for display
export function formatDistance(distance) {
  return distance < 1000
    ? `${Math.round(distance)}m`
    : `${(distance / 1000).toFixed(1)}km`;
}

// Check if user has arrived at destination
export function hasArrived(userLat, userLon, destLat, destLon) {
  return (
    calculateDistance(userLat, userLon, destLat, destLon) <= ARRIVAL_THRESHOLD
  );
}

// Fallback: Creates a simple straight-line route
export function createDirectRoute(startLat, startLon, endLat, endLon) {
  const distance = calculateDistance(startLat, startLon, endLat, endLon);
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

// Try OSRM routing service
async function tryOSRM(startLat, startLon, endLat, endLon) {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    ROUTING_CONFIG.TIMEOUT
  );

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

// Try MapLibre Directions
async function tryMapLibreDirections(startLat, startLon, endLat, endLon, map) {
  if (!directions || !map) {
    throw new Error("MapLibre Directions not initialized or no map instance");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    10000 // 10 seconds timeout for MapLibre
  );

  try {
    // Set origin and destination
    await directions.setOrigin([startLon, startLat]);
    await directions.setDestination([endLon, endLat]);
    
    // Get the route
    const routes = directions.getRoutes();
    
    clearTimeout(timeoutId);
    
    if (!routes || routes.length === 0) {
      throw new Error("MapLibre Directions returned no routes");
    }

    const route = routes[0];
    
    return {
      type: "Feature",
      geometry: route.geometry,
      properties: {
        distance: route.distance || calculateDistance(startLat, startLon, endLat, endLon),
        duration: route.duration || Math.round((route.distance || calculateDistance(startLat, startLon, endLat, endLon)) / ROUTING_CONFIG.WALKING_SPEED),
        steps: route.legs?.[0]?.steps || [],
        source: "maplibre-directions",
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Try OpenRouteService as fallback
async function tryORS(startLat, startLon, endLat, endLon) {
  const apiKey = import.meta.env.VITE_OPENROUTE_API_KEY;
  if (!apiKey) throw new Error("Missing ORS API key");

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    ROUTING_CONFIG.TIMEOUT
  );

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

// Main route creation function with fallback logic
export async function createRoute(startLat, startLon, endLat, endLon, map = null) {
  console.log("🚀 Création de route avec fallback en cascade");

  const services = [
    {
      name: "OSRM (OpenStreetMap.de)",
      fn: () => tryOSRM(startLat, startLon, endLat, endLon),
    },
    {
      name: "MapLibre Directions",
      fn: () => map ? tryMapLibreDirections(startLat, startLon, endLat, endLon, map) : Promise.reject(new Error("No map instance"))
    },
    {
      name: "OpenRouteService",
      fn: () => tryORS(startLat, startLon, endLat, endLon),
    },
    {
      name: "Direct Route",
      fn: () =>
        Promise.resolve(createDirectRoute(startLat, startLon, endLat, endLon)),
    },
  ];

  for (const [index, service] of services.entries()) {
    try {
      console.log(`📍 Tentative ${index + 1}/${services.length}: ${service.name}`);
      const result = await service.fn();
      console.log(`✅ Succès avec ${service.name}:`, result.properties?.source);
      return result;
    } catch (error) {
      console.warn(`❌ ${service.name} échoué:`, error.message);

      // Si c'est le dernier service, on force le succès
      if (index === services.length - 1) {
        console.log("🔄 Forçage de la route directe en dernier recours");
        return createDirectRoute(startLat, startLon, endLat, endLon);
      }
    }
  }

  // Ne devrait jamais arriver, mais sécurité
  return createDirectRoute(startLat, startLon, endLat, endLon);
}

// Calculate navigation instructions
export function getNavigationInstructions(
  userLat,
  userLon,
  destLat,
  destLon,
  deviceBearing = 0
) {
  const distance = calculateDistance(userLat, userLon, destLat, destLon);
  const bearing = calculateBearing(userLat, userLon, destLat, destLon);
  const relativeBearing = (bearing - deviceBearing + 360) % 360;
  const direction = bearingToDirection(bearing);

  let instruction = "";
  if (distance <= ARRIVAL_THRESHOLD) {
    instruction = "You have arrived!";
  } else {
    // Determine instruction based on relative bearing
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

    instruction = bearingRanges.find(
      (range) => relativeBearing <= range.max
    ).text;

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

// Cleanup directions instance
export function cleanupDirections() {
  if (directions) {
    directions.remove();
    directions = null;
  }
}

// Find the closest point on the route to the user's current position
export function findClosestPointOnRoute(userLat, userLon, routeGeometry) {
  if (
    !routeGeometry ||
    !routeGeometry.coordinates ||
    routeGeometry.coordinates.length < 2
  ) {
    return null;
  }

  const coordinates = routeGeometry.coordinates;
  let closestPoint = null;
  let minDistance = Infinity;
  let segmentIndex = 0;
  let positionOnSegment = 0;

  // Check each segment of the route
  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lon1, lat1] = coordinates[i];
    const [lon2, lat2] = coordinates[i + 1];

    // Calculate closest point on this segment
    const A = userLat - lat1;
    const B = userLon - lon1;
    const C = lat2 - lat1;
    const D = lon2 - lon1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = lat1;
      yy = lon1;
      param = 0;
    } else if (param > 1) {
      xx = lat2;
      yy = lon2;
      param = 1;
    } else {
      xx = lat1 + param * C;
      yy = lon1 + param * D;
    }

    const distance = calculateDistance(userLat, userLon, xx, yy);

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = [yy, xx]; // [lon, lat]
      segmentIndex = i;
      positionOnSegment = param;
    }
  }

  return {
    point: closestPoint,
    segmentIndex,
    positionOnSegment,
    distance: minDistance,
  };
}

// Create a route with only the remaining portion (from user position to destination)
export function createRemainingRoute(userLat, userLon, originalRoute) {
  if (!originalRoute || !originalRoute.features || !originalRoute.features[0]) {
    return originalRoute;
  }

  const routeFeature = originalRoute.features[0];
  const routeGeometry = routeFeature.geometry;

  if (
    !routeGeometry ||
    !routeGeometry.coordinates ||
    routeGeometry.coordinates.length < 2
  ) {
    return originalRoute;
  }

  const closestPointInfo = findClosestPointOnRoute(
    userLat,
    userLon,
    routeGeometry
  );

  if (!closestPointInfo) {
    return originalRoute;
  }

  const {
    point: closestPoint,
    segmentIndex,
    positionOnSegment,
  } = closestPointInfo;
  const coordinates = routeGeometry.coordinates;

  // Create new coordinates array starting from the closest point
  const remainingCoordinates = [];

  // Add the closest point as the starting point
  remainingCoordinates.push(closestPoint);

  // If we're not at the end of the current segment, add the end of current segment
  if (positionOnSegment < 1 && segmentIndex < coordinates.length - 1) {
    remainingCoordinates.push(coordinates[segmentIndex + 1]);
  }

  // Add all remaining segments
  for (let i = segmentIndex + 2; i < coordinates.length; i++) {
    remainingCoordinates.push(coordinates[i]);
  }

  // If the remaining route is too short, keep the original
  if (remainingCoordinates.length < 2) {
    return originalRoute;
  }

  // Calculate remaining distance
  let remainingDistance = 0;
  for (let i = 0; i < remainingCoordinates.length - 1; i++) {
    const [lon1, lat1] = remainingCoordinates[i];
    const [lon2, lat2] = remainingCoordinates[i + 1];
    remainingDistance += calculateDistance(lat1, lon1, lat2, lon2);
  }

  // Create new route feature with remaining coordinates
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
          originalDistance:
            routeFeature.properties?.distance || remainingDistance,
        },
      },
    ],
  };

  console.log(
    `🛣️ Route updated: ${formatDistance(
      remainingDistance
    )} remaining (was ${formatDistance(
      routeFeature.properties?.distance || 0
    )})`
  );

  return remainingRoute;
}

// Check if the route should be updated (user has progressed significantly)
export function shouldUpdateRemainingRoute(
  userLat,
  userLon,
  currentRoute,
  lastUpdatePosition,
  threshold = 20
) {
  if (!lastUpdatePosition) {
    return true; // First update
  }

  const movementDistance = calculateDistance(
    userLat,
    userLon,
    lastUpdatePosition.lat,
    lastUpdatePosition.lon
  );

  // Update if user has moved significantly forward
  if (movementDistance >= threshold) {
    console.log(
      `📍 User moved ${formatDistance(
        movementDistance
      )}, updating remaining route`
    );
    return true;
  }

  return false;
}

// Create a route showing the traveled portion (from start to user position)
export function createTraveledRoute(userLat, userLon, originalRoute) {
  if (!originalRoute || !originalRoute.features || !originalRoute.features[0]) {
    return null;
  }

  const routeFeature = originalRoute.features[0];
  const routeGeometry = routeFeature.geometry;

  if (
    !routeGeometry ||
    !routeGeometry.coordinates ||
    routeGeometry.coordinates.length < 2
  ) {
    return null;
  }

  const closestPointInfo = findClosestPointOnRoute(
    userLat,
    userLon,
    routeGeometry
  );

  if (!closestPointInfo) {
    return null;
  }

  const {
    point: closestPoint,
    segmentIndex,
    positionOnSegment,
  } = closestPointInfo;
  const coordinates = routeGeometry.coordinates;

  // Create coordinates array from start to the closest point
  const traveledCoordinates = [];

  // Add all segments up to the current segment
  for (let i = 0; i <= segmentIndex; i++) {
    traveledCoordinates.push(coordinates[i]);
  }

  // Add the closest point as the end point (if not already at segment start)
  if (positionOnSegment > 0) {
    traveledCoordinates.push(closestPoint);
  }

  // Need at least 2 points for a line
  if (traveledCoordinates.length < 2) {
    return null;
  }

  // Calculate traveled distance
  let traveledDistance = 0;
  for (let i = 0; i < traveledCoordinates.length - 1; i++) {
    const [lon1, lat1] = traveledCoordinates[i];
    const [lon2, lat2] = traveledCoordinates[i + 1];
    traveledDistance += calculateDistance(lat1, lon1, lat2, lon2);
  }

  // Create traveled route feature
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

  return traveledRoute;
}
