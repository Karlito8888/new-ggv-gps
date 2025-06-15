// Navigation instructions and arrival detection

import { calculateDistance, formatDistance } from './geometry.js';
import { ARRIVAL_THRESHOLD } from './constants.js';
import { bearingManager, BEARING_TYPES } from './bearingManager.js';

/**
 * Check if user has arrived at destination
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {number} destLat - Destination latitude
 * @param {number} destLon - Destination longitude
 * @returns {boolean} True if user has arrived
 */
export function hasArrived(userLat, userLon, destLat, destLon) {
  return (
    calculateDistance(userLat, userLon, destLat, destLon) <= ARRIVAL_THRESHOLD
  );
}

/**
 * Calculate navigation instructions based on user position and destination
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
  
  // Utiliser le BearingManager pour une gestion centralisée
  const bearingData = bearingManager.updateDestinationBearing(userLat, userLon, destLat, destLon);
  bearingManager.updateDeviceBearing(deviceBearing);
  
  const bearing = bearingData.destination;
  const relativeBearing = bearingManager.getBearing(BEARING_TYPES.RELATIVE);
  const direction = bearingData.direction;

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