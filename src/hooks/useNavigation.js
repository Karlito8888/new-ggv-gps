import { useState, useEffect } from "react";
import { getDistance, getBearing } from "../lib/geo";

export function useNavigation(map, userLocation, destination) {
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);

  const userLat = userLocation?.latitude;
  const userLng = userLocation?.longitude;
  const destLat = destination?.coordinates?.[1];
  const destLng = destination?.coordinates?.[0];

  useEffect(() => {
    if (!userLat || !userLng || !destLat || !destLng) {
      setHasArrived(false);
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
