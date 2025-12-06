import { useState, useEffect } from "react";

// Haversine distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Bearing in degrees (0-360)
function getBearing(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function useNavigation(map, userLocation, destination) {
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [hasArrived, setHasArrived] = useState(false);

  const userLat = userLocation?.latitude;
  const userLng = userLocation?.longitude;
  const destLat = destination?.coordinates?.[1];
  const destLng = destination?.coordinates?.[0];

  useEffect(() => {
    if (!userLat || !userLng || !destLat || !destLng) return;

    const dist = getDistance(userLat, userLng, destLat, destLng);
    setDistanceRemaining(dist);
    setBearing(getBearing(userLat, userLng, destLat, destLng));

    if (dist < 20) setHasArrived(true);
  }, [userLat, userLng, destLat, destLng]);

  return { distanceRemaining, bearing, hasArrived };
}
