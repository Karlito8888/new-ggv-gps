/**
 * Geospatial utility functions
 * Extracted to avoid duplication across hooks
 */

/**
 * A usable coordinate: present, numeric and finite.
 *
 * Falsiness is the wrong test — `!lat` also rejects a legitimate `0`, i.e. the equator and the
 * Greenwich meridian — and `typeof v === "number"` accepts `NaN`, which sails through every
 * distance computation and reaches MapLibre as a silent no-op. One predicate for both call sites.
 */
export function isCoord(value: unknown): value is number {
  return Number.isFinite(value);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface PointProjection {
  projectedPoint: [number, number];
  segmentIndex: number;
  progressOnSegment: number;
  deviationDistance: number;
}

/**
 * Project a point onto a line and return projection info
 */
export function projectPointOnLine(
  pointLng: number,
  pointLat: number,
  lineCoordinates: [number, number][]
): PointProjection {
  if (!lineCoordinates || lineCoordinates.length < 2) {
    return {
      projectedPoint: [pointLng, pointLat],
      segmentIndex: 0,
      progressOnSegment: 0,
      deviationDistance: 0,
    };
  }

  let minDistance = Infinity;
  let closestPoint: [number, number] = [pointLng, pointLat];
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
      t = Math.max(0, Math.min(1, ((pointLng - x1) * dx + (pointLat - y1) * dy) / segmentLengthSq));
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
 */
export function getDistanceAlongRoute(
  userLng: number,
  userLat: number,
  targetLng: number,
  targetLat: number,
  routeCoordinates: [number, number][]
): number {
  if (!routeCoordinates || routeCoordinates.length < 2) {
    return getDistance(userLat, userLng, targetLat, targetLng);
  }

  // 1. Project user onto route
  const userProjection = projectPointOnLine(userLng, userLat, routeCoordinates);

  // 2. Project the target onto the route (snap to nearest point)
  const targetProjection = projectPointOnLine(targetLng, targetLat, routeCoordinates);
  const { segmentIndex: targetSegmentIndex, progressOnSegment: targetProgress } = targetProjection;
  const [targetProjLng, targetProjLat] = targetProjection.projectedPoint;

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
    totalDistance = getDistance(userProjLat, userProjLng, targetProjLat, targetProjLng);
  } else {
    // Distance from user projection to end of current segment
    const [segEndLng, segEndLat] = routeCoordinates[userProjection.segmentIndex + 1];
    totalDistance += getDistance(userProjLat, userProjLng, segEndLat, segEndLng);

    // Distance through intermediate segments
    for (let i = userProjection.segmentIndex + 1; i < targetSegmentIndex; i++) {
      const [p1Lng, p1Lat] = routeCoordinates[i];
      const [p2Lng, p2Lat] = routeCoordinates[i + 1];
      totalDistance += getDistance(p1Lat, p1Lng, p2Lat, p2Lng);
    }

    // Distance from start of target segment to target projection
    const [tSegStartLng, tSegStartLat] = routeCoordinates[targetSegmentIndex];
    totalDistance += getDistance(tSegStartLat, tSegStartLng, targetProjLat, targetProjLng);
  }

  return totalDistance;
}
