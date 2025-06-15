// Route management utilities for tracking progress and creating route segments

import { calculateDistance, formatDistance } from './geometry.js';
import { findClosestPointOnRoute } from './routeAnalysis.js';

/**
 * Create a route with only the remaining portion (from user position to destination)
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {Object} originalRoute - Original route object
 * @returns {Object} Remaining route object
 */
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

/**
 * Check if the route should be updated (user has progressed significantly)
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {Object} currentRoute - Current route object
 * @param {Object} lastUpdatePosition - Last update position
 * @param {number} threshold - Update threshold in meters
 * @returns {boolean} True if route should be updated
 */
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

/**
 * Create a route showing the traveled portion (from start to user position)
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {Object} originalRoute - Original route object
 * @returns {Object|null} Traveled route object or null
 */
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