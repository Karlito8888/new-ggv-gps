import { useState, useEffect, useRef } from "react";
import { getDistance, getBearing } from "../lib/geo";

export function useNavigation(map, userLocation, destination) {
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);

  // Track previous destination to reset hasArrived on change
  const prevDestRef = useRef(null);

  const userLat = userLocation?.latitude;
  const userLng = userLocation?.longitude;
  const destLat = destination?.coordinates?.[1];
  const destLng = destination?.coordinates?.[0];

  useEffect(() => {
    // Reset hasArrived immediately when destination changes
    const destKey = destLat && destLng ? `${destLat},${destLng}` : null;
    if (destKey !== prevDestRef.current) {
      prevDestRef.current = destKey;
      setHasArrived(false);
      // Don't calculate distance yet - wait for next effect run with fresh hasArrived
      return;
    }

    if (!userLat || !userLng || !destLat || !destLng) {
      return;
    }

    const dist = getDistance(userLat, userLng, destLat, destLng);
    setDistanceRemaining(dist);
    setBearing(getBearing(userLat, userLng, destLat, destLng));

    // Set arrival state based on current distance
    setHasArrived(dist < 20);
  }, [userLat, userLng, destLat, destLng]);

  return { distanceRemaining, bearing, hasArrived };
}
