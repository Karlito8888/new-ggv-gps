/**
 * Geospatial utility functions
 * Extracted to avoid duplication across hooks
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Project a point onto a line and return projection info
 * @param {number} pointLng - Longitude of point to project
 * @param {number} pointLat - Latitude of point to project
 * @param {Array<[number, number]>} lineCoordinates - Array of [lng, lat] coordinates
 * @returns {{ projectedPoint: [number, number], segmentIndex: number, progressOnSegment: number, deviationDistance: number }}
 */
export function projectPointOnLine(pointLng, pointLat, lineCoordinates) {
  if (!lineCoordinates || lineCoordinates.length < 2) {
    return {
      projectedPoint: [pointLng, pointLat],
      segmentIndex: 0,
      progressOnSegment: 0,
      deviationDistance: 0,
    };
  }

  let minDistance = Infinity;
  let closestPoint = [pointLng, pointLat];
  let segmentIndex = 0;
  let progressOnSegment = 0;

  for (let i = 0; i < lineCoordinates.length - 1; i++) {
    const [x1, y1] = lineCoordinates[i];
    const [x2, y2] = lineCoordinates[i + 1];

    // Project point onto segment using dot product
    const dx = x2 - x1;
    const dy = y2 - y1;
    const segmentLengthSq = dx * dx + dy * dy;

    let t = 0;
    if (segmentLengthSq > 0) {
      t = Math.max(
        0,
        Math.min(
          1,
          ((pointLng - x1) * dx + (pointLat - y1) * dy) / segmentLengthSq,
        ),
      );
    }

    const projectedX = x1 + t * dx;
    const projectedY = y1 + t * dy;
    const distance = getDistance(pointLat, pointLng, projectedY, projectedX);

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = [projectedX, projectedY];
      segmentIndex = i;
      progressOnSegment = t;
    }
  }

  return {
    projectedPoint: closestPoint,
    segmentIndex,
    progressOnSegment,
    deviationDistance: minDistance,
  };
}

/**
 * Calculate distance along a route from user position to target point
 * Returns -1 if target is behind the user on the route
 * @param {number} userLng - User longitude
 * @param {number} userLat - User latitude
 * @param {number} targetLng - Target longitude
 * @param {number} targetLat - Target latitude
 * @param {Array<[number, number]>} routeCoordinates - Route coordinates [lng, lat]
 * @returns {number} Distance in meters, or -1 if target is behind
 */
export function getDistanceAlongRoute(
  userLng,
  userLat,
  targetLng,
  targetLat,
  routeCoordinates,
) {
  if (!routeCoordinates || routeCoordinates.length < 2) {
    return getDistance(userLat, userLng, targetLat, targetLng);
  }

  // 1. Project user onto route
  const userProjection = projectPointOnLine(userLng, userLat, routeCoordinates);

  // 2. Find which segment contains the target (snap to nearest point on route)
  let targetSegmentIndex = -1;
  let minTargetDist = Infinity;
  let targetProgress = 0;

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const [x1, y1] = routeCoordinates[i];
    const [x2, y2] = routeCoordinates[i + 1];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const segmentLengthSq = dx * dx + dy * dy;

    let t = 0;
    if (segmentLengthSq > 0) {
      t = Math.max(
        0,
        Math.min(
          1,
          ((targetLng - x1) * dx + (targetLat - y1) * dy) / segmentLengthSq,
        ),
      );
    }

    const projectedX = x1 + t * dx;
    const projectedY = y1 + t * dy;
    const dist = getDistance(targetLat, targetLng, projectedY, projectedX);

    if (dist < minTargetDist) {
      minTargetDist = dist;
      targetSegmentIndex = i;
      targetProgress = t;
    }
  }

  // 3. Check if target is behind user
  if (targetSegmentIndex < userProjection.segmentIndex) {
    return -1; // Target is behind
  }
  if (
    targetSegmentIndex === userProjection.segmentIndex &&
    targetProgress < userProjection.progressOnSegment
  ) {
    return -1; // Same segment but target is behind
  }

  // 4. Calculate distance along route
  let totalDistance = 0;
  const [userProjLng, userProjLat] = userProjection.projectedPoint;

  if (targetSegmentIndex === userProjection.segmentIndex) {
    // Same segment: direct distance from user projection to target projection
    const [x1, y1] = routeCoordinates[targetSegmentIndex];
    const [x2, y2] = routeCoordinates[targetSegmentIndex + 1];
    const targetProjX = x1 + targetProgress * (x2 - x1);
    const targetProjY = y1 + targetProgress * (y2 - y1);
    totalDistance = getDistance(
      userProjLat,
      userProjLng,
      targetProjY,
      targetProjX,
    );
  } else {
    // Distance from user projection to end of current segment
    const [segEndLng, segEndLat] =
      routeCoordinates[userProjection.segmentIndex + 1];
    totalDistance += getDistance(
      userProjLat,
      userProjLng,
      segEndLat,
      segEndLng,
    );

    // Distance through intermediate segments
    for (let i = userProjection.segmentIndex + 1; i < targetSegmentIndex; i++) {
      const [p1Lng, p1Lat] = routeCoordinates[i];
      const [p2Lng, p2Lat] = routeCoordinates[i + 1];
      totalDistance += getDistance(p1Lat, p1Lng, p2Lat, p2Lng);
    }

    // Distance from start of target segment to target projection
    const [tSegStartLng, tSegStartLat] = routeCoordinates[targetSegmentIndex];
    const [tSegEndLng, tSegEndLat] = routeCoordinates[targetSegmentIndex + 1];
    const targetProjX =
      tSegStartLng + targetProgress * (tSegEndLng - tSegStartLng);
    const targetProjY =
      tSegStartLat + targetProgress * (tSegEndLat - tSegStartLat);
    totalDistance += getDistance(
      tSegStartLat,
      tSegStartLng,
      targetProjY,
      targetProjX,
    );
  }

  return totalDistance;
}
