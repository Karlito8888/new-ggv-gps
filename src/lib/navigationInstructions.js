// Modern navigation instructions using MapLibre native bearings

import { calculateDistance, calculateBearing, bearingToDirection, formatDistance } from './geometry.js';
import { ARRIVAL_THRESHOLD } from './constants.js';
import { getDirections } from './mapLibreIntegration.js';

/**
 * Check if user has arrived at destination
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLon - Destination longitude
 * @returns {boolean} True if user has arrived
 */
export function hasArrived(userLat, userLon, destLat, destLon) {
  return calculateDistance(userLat, userLon, destLat, destLon) <= ARRIVAL_THRESHOLD;
}

/**
 * Get navigation instructions using MapLibre native bearings
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLon - Destination longitude
 * @param {number} deviceBearing - Device bearing in degrees (default: 0)
 * @returns {Object} Navigation instructions object
 */
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

  // Get bearings from MapLibre directions if available
  const directions = getDirections();
  let mapLibreBearings = null;
  if (directions && directions.waypointsBearings) {
    mapLibreBearings = directions.waypointsBearings;
  }

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
    mapLibreBearings, // Include native MapLibre bearings
  };
}