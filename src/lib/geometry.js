// Geometric calculations and utilities

/**
 * Calculate distance between two points in meters using haversine formula
 * @param {number} lat1 - First point latitude
 * @param {number} lon1 - First point longitude
 * @param {number} lat2 - Second point latitude
 * @param {number} lon2 - Second point longitude
 * @returns {number} Distance in meters
 */
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

/**
 * Calculate the shortest distance from a point to a line segment
 * @param {number} pointLat - Point latitude
 * @param {number} pointLon - Point longitude
 * @param {number} line1Lat - Line start latitude
 * @param {number} line1Lon - Line start longitude
 * @param {number} line2Lat - Line end latitude
 * @param {number} line2Lon - Line end longitude
 * @returns {number} Distance in meters
 */
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

/**
 * Calculate direction angle (bearing) between two points
 * @param {number} lat1 - Start latitude
 * @param {number} lon1 - Start longitude
 * @param {number} lat2 - End latitude
 * @param {number} lon2 - End longitude
 * @returns {number} Bearing in degrees (0-360)
 */
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

/**
 * Convert angle to cardinal direction
 * @param {number} bearing - Bearing in degrees
 * @returns {Object} Direction object with name and icon
 */
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

/**
 * Format distance for display
 * @param {number} distance - Distance in meters
 * @returns {string} Formatted distance string
 */
export function formatDistance(distance) {
  return distance < 1000
    ? `${Math.round(distance)}m`
    : `${(distance / 1000).toFixed(1)}km`;
}