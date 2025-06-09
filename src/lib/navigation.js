// Village exit coordinates
export const VILLAGE_EXIT_COORDS = [120.951863, 14.35098];

// Minimum distance to consider arrival (in meters)
export const ARRIVAL_THRESHOLD = 10;

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
  bearing = (bearing + 360) % 360;

  return bearing;
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

  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

// Format distance for display
export function formatDistance(distance) {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
}

// Check if user has arrived at destination
export function hasArrived(userLat, userLon, destLat, destLon) {
  const distance = calculateDistance(userLat, userLon, destLat, destLon);
  return distance <= ARRIVAL_THRESHOLD;
}

// Create route using OSRM with fallback
export async function createRoute(startLat, startLon, endLat, endLon) {
  try {
    // 3-second timeout to avoid blocking
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;

    const response = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }

    const route = data.routes[0];

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: route.geometry,
          properties: {
            distance: route.distance,
            duration: route.duration,
            steps: route.legs[0]?.steps || [],
            source: "osrm",
          },
        },
      ],
    };
  } catch (error) {
    console.warn("OSRM error, using direct route:", error);
    // Fallback to direct route in case of error
    return createDirectRoute(startLat, startLon, endLat, endLon);
  }
}

// Fallback: Creates a simple straight-line route
export function createDirectRoute(startLat, startLon, endLat, endLon) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [startLon, startLat],
            [endLon, endLat],
          ],
        },
        properties: {
          distance: calculateDistance(startLat, startLon, endLat, endLon),
          source: "direct",
        },
      },
    ],
  };
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
  const direction = bearingToDirection(bearing);

  // Calculate relative angle compared to device orientation
  let relativeBearing = bearing - deviceBearing;
  if (relativeBearing < 0) relativeBearing += 360;
  if (relativeBearing > 360) relativeBearing -= 360;

  let instruction = "";
  if (distance <= ARRIVAL_THRESHOLD) {
    instruction = "You have arrived!";
  } else if (distance < 50) {
    instruction = `Destination in ${formatDistance(distance)}`;
  } else {
    // Instructions based on relative angle
    if (relativeBearing < 15 || relativeBearing > 345) {
      instruction = "Continue straight ahead";
    } else if (relativeBearing >= 15 && relativeBearing <= 75) {
      instruction = "Turn slightly right";
    } else if (relativeBearing > 75 && relativeBearing <= 105) {
      instruction = "Turn right";
    } else if (relativeBearing > 105 && relativeBearing <= 165) {
      instruction = "Turn sharply right";
    } else if (relativeBearing > 165 && relativeBearing <= 195) {
      instruction = "Turn around";
    } else if (relativeBearing > 195 && relativeBearing <= 255) {
      instruction = "Turn sharply left";
    } else if (relativeBearing > 255 && relativeBearing <= 285) {
      instruction = "Turn left";
    } else {
      instruction = "Turn slightly left";
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
