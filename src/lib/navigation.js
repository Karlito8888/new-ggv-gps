import MapLibreGlDirections from "@maplibre/maplibre-gl-directions";

// Village exit coordinates
export const VILLAGE_EXIT_COORDS = [120.951863, 14.35098];

// Minimum distance to consider arrival (in meters)
export const ARRIVAL_THRESHOLD = 10;

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

// Try MapLibre Directions first
async function tryMapLibreDirections(startLat, startLon, endLat, endLon, map) {
  if (!directions && map) {
    directions = initMapLibreDirections(map);
  }

  return new Promise((resolve, reject) => {
    if (!directions) {
      reject(new Error("MapLibre Directions not initialized"));
      return;
    }

    directions.setWaypoints([
      [startLon, startLat],
      [endLon, endLat],
    ]);

    // Listen for route changes
    const onRoute = (e) => {
      if (e.route && e.route.length > 0) {
        const primaryRoute = e.route[0];
        resolve({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: primaryRoute.geometry.coordinates,
          },
          properties: {
            distance: primaryRoute.distance,
            duration: primaryRoute.duration,
            steps: primaryRoute.legs[0]?.steps || [],
            source: "maplibre-directions",
          },
        });
        directions.off("route", onRoute);
      }
    };

    directions.on("route", onRoute);

    // Timeout fallback
    setTimeout(() => {
      directions.off("route", onRoute);
      reject(new Error("MapLibre Directions timeout"));
    }, ROUTING_CONFIG.TIMEOUT);
  });
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
export async function createRoute(
  startLat,
  startLon,
  endLat,
  endLon,
  map = null
) {
  console.log("🚀 Création de route avec fallback en cascade");

  const services = [
    {
      name: "OSRM (OpenStreetMap.de)",
      fn: () => tryOSRM(startLat, startLon, endLat, endLon),
    },
    // Désactivé temporairement car timeout trop fréquent
    // {
    //   name: "MapLibre Directions",
    //   fn: () => map ? tryMapLibreDirections(startLat, startLon, endLat, endLon, map) : Promise.reject(new Error("No map instance"))
    // },
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
      console.log(`📍 Tentative ${index + 1}/4: ${service.name}`);
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
