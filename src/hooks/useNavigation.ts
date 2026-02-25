import type { Map as MaplibreMap } from "maplibre-gl";
import { getDistance } from "../lib/geo";
import type { UserLocation, Destination } from "./useMapSetup";

interface UseNavigationReturn {
  distanceRemaining: number;
  hasArrived: boolean;
  arrivedAt: string | null;
}

const ARRIVAL_THRESHOLD_M = 12;

/**
 * useNavigation - Pure computation hook (no effects, no state)
 *
 * Returns navigation data calculated directly from inputs.
 * hasArrived is a simple distance check, NOT a stateful flag.
 * React Compiler handles memoization automatically.
 */
export function useNavigation(
  _map: MaplibreMap | null,
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
      arrivedAt: null,
    };
  }

  const dist = getDistance(userLat, userLng, destLat, destLng);
  const isArrived = dist < ARRIVAL_THRESHOLD_M;

  return {
    distanceRemaining: dist,
    hasArrived: isArrived,
    arrivedAt: isArrived ? `${destLng},${destLat}` : null,
  };
}
