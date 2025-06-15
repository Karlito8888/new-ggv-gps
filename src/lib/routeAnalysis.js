// Route analysis and user position tracking utilities

import { calculateDistance, pointToLineDistance } from './geometry.js';
import { 
  ROUTE_DEVIATION_THRESHOLD, 
  MIN_RECALCULATION_INTERVAL, 
  MIN_MOVEMENT_THRESHOLD 
} from './constants.js';

// Route recalculation state
let lastRecalculationTime = 0;
let lastRecalculationPosition = null;

/**
 * Check if user has deviated from the route
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {Object} routeGeometry - Route geometry object
 * @param {number} threshold - Deviation threshold in meters
 * @returns {boolean} True if user is off-route
 */
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

/**
 * Check if route should be recalculated based on various conditions
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {Object} currentRoute - Current route object
 * @param {boolean} forceRecalculation - Force recalculation flag
 * @returns {boolean} True if route should be recalculated
 */
export function shouldRecalculateRoute(
  userLat,
  userLon,
  currentRoute,
  forceRecalculation = false
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

  // Check if user is off the current route
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

/**
 * Update recalculation state
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 */
export function updateRecalculationState(userLat, userLon) {
  lastRecalculationTime = Date.now();
  lastRecalculationPosition = { lat: userLat, lon: userLon };
  console.log("📊 Recalculation state updated");
}

/**
 * Reset recalculation state (useful when starting new navigation)
 */
export function resetRecalculationState() {
  lastRecalculationTime = 0;
  lastRecalculationPosition = null;
  console.log("🔄 Recalculation state reset");
}

/**
 * Find the closest point on the route to the user's current position
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {Object} routeGeometry - Route geometry object
 * @returns {Object|null} Closest point information or null
 */
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