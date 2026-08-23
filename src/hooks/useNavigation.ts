import { getDistance } from "../lib/geo";
import type { UserLocation, Destination } from "./useMapSetup";

interface UseNavigationReturn {
  distanceRemaining: number;
  hasArrived: boolean;
}

const ARRIVAL_THRESHOLD_M = 15;

/**
 * useNavigation - Pure computation hook (no effects, no state)
 *
 * Returns navigation data calculated directly from inputs.
 * hasArrived is a simple distance check, NOT a stateful flag.
 * React Compiler handles memoization automatically.
 *
 * Deliberately does NOT return a destination key: it would be byte-identical to the one `App`
 * already derives from the same `destination` in the same render, so comparing the two could
 * never fail. The caller compares against its own key.
 */
export function useNavigation(
  userLocation: UserLocation | null,
  destination: Destination | null
): UseNavigationReturn {
  const userLat = userLocation?.latitude;
  const userLng = userLocation?.longitude;
  const destLat = destination?.coordinates?.[1];
  const destLng = destination?.coordinates?.[0];

  if (!userLat || !userLng || !destLat || !destLng) {
    return {
      distanceRemaining: 0,
      hasArrived: false,
    };
  }

  const dist = getDistance(userLat, userLng, destLat, destLng);
  const isArrived = dist < ARRIVAL_THRESHOLD_M;

  return {
    distanceRemaining: dist,
    hasArrived: isArrived,
  };
}
