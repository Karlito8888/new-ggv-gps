import { useState, useEffect, useRef } from "react";
import { getDistance, getBearing } from "../lib/geo";

export function useNavigation(map, userLocation, destination) {
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);

  // Track previous destination to reset hasArrived on change
  const prevDestRef = useRef(null);
  // Track when destination changed to add grace period
  const destChangedAtRef = useRef(null);

  const userLat = userLocation?.latitude;
  const userLng = userLocation?.longitude;
  const destLat = destination?.coordinates?.[1];
  const destLng = destination?.coordinates?.[0];

  useEffect(() => {
    const destKey = destLat && destLng ? `${destLat},${destLng}` : null;

    // Destination changed - reset state and start grace period
    if (destKey !== prevDestRef.current) {
      prevDestRef.current = destKey;
      destChangedAtRef.current = Date.now();
      setHasArrived(false);
      setDistanceRemaining(0);
      return;
    }

    if (!userLat || !userLng || !destLat || !destLng) {
      return;
    }

    const dist = getDistance(userLat, userLng, destLat, destLng);
    setDistanceRemaining(dist);
    setBearing(getBearing(userLat, userLng, destLat, destLng));

    // Grace period: don't trigger arrival within 2 seconds of destination change
    // This prevents instant re-arrival when switching to a nearby destination
    const timeSinceChange = Date.now() - (destChangedAtRef.current || 0);
    if (timeSinceChange < 2000) {
      return;
    }

    // Set arrival state based on current distance (10m threshold)
    setHasArrived(dist < 10);
  }, [userLat, userLng, destLat, destLng]);

  return { distanceRemaining, bearing, hasArrived };
}
