import { getDistance, getBearing } from "../lib/geo";

/**
 * useNavigation - Pure computation hook (no effects, no state)
 *
 * Returns navigation data calculated directly from inputs.
 * hasArrived is a simple distance check, NOT a stateful flag.
 * React Compiler handles memoization automatically.
 */
export function useNavigation(map, userLocation, destination) {
  const userLat = userLocation?.latitude;
  const userLng = userLocation?.longitude;
  const destLat = destination?.coordinates?.[1];
  const destLng = destination?.coordinates?.[0];

  if (!userLat || !userLng || !destLat || !destLng) {
    return {
      distanceRemaining: 0,
      bearing: 0,
      hasArrived: false,
      arrivedAt: null, // Which destination we arrived at
    };
  }

  const dist = getDistance(userLat, userLng, destLat, destLng);
  const isArrived = dist < 10;

  return {
    distanceRemaining: dist,
    bearing: getBearing(userLat, userLng, destLat, destLng),
    hasArrived: isArrived,
    // Include destination key so caller can verify it's the right one
    arrivedAt: isArrived ? `${destLng},${destLat}` : null,
  };
}
