import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { trace, type UserLocation } from "@ggv/shared";

export type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "blocked";

/**
 * Foreground GPS, 1 Hz. `start` asks for the permission (system dialog) and, once granted,
 * opens a single watch that lives until unmount. It resolves with the resulting status so the
 * caller does not read a stale `status` after the await.
 */
export function useDeviceLocation() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const watching = useRef(false);

  useEffect(
    () => () => {
      subscription.current?.remove();
    },
    []
  );

  const start = async (): Promise<LocationStatus> => {
    setStatus("requesting");
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      const refused = permission.canAskAgain === false ? "blocked" : "denied";
      setStatus(refused);
      return refused;
    }
    // Idempotent across retries and double taps.
    if (!watching.current) {
      watching.current = true;
      try {
        subscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 0,
          },
          ({ coords }) => {
            const heading = coords.heading != null && coords.heading >= 0 ? coords.heading : null;
            trace("gps:fix", {
              lat: coords.latitude,
              lng: coords.longitude,
              heading,
              speed: coords.speed,
            });
            setUserLocation({
              latitude: coords.latitude,
              longitude: coords.longitude,
              heading,
              speed: coords.speed,
            });
          }
        );
      } catch {
        // The device refused the request (e.g. its location settings are unsatisfied): let the
        // user retry instead of leaving the button on "Requesting...".
        watching.current = false;
        setStatus("denied");
        return "denied";
      }
    }
    setStatus("granted");
    return "granted";
  };

  return { userLocation, status, start };
}
