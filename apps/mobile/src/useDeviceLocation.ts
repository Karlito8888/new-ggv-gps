import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import type { UserLocation } from "@ggv/shared";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "blocked"
  | "approximate";

/**
 * Foreground GPS, 1 Hz. `start` asks for the permission (system dialog) and, once granted,
 * opens a single watch that lives until unmount. It resolves with the resulting status: the
 * screen owns the state it renders, the hook keeps none.
 */
export function useDeviceLocation() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const watching = useRef(false);

  /** Ends the watch. Idempotent; `start` can open a new one afterwards. */
  const stop = () => {
    subscription.current?.remove();
    subscription.current = null;
    watching.current = false;
  };
  useEffect(() => stop, []);

  const start = async (): Promise<LocationStatus> => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return permission.canAskAgain === false ? "blocked" : "denied";
    }
    // Approximate location (iOS "Precise: Off", Android "Approximate") is kilometres wide:
    // useless for guiding someone to a lot, so it is refused until the user turns precision on.
    if (permission.ios?.accuracy === "reduced" || permission.android?.accuracy === "coarse") {
      return "approximate";
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
            setUserLocation({
              latitude: coords.latitude,
              longitude: coords.longitude,
              heading: coords.heading,
              speed: coords.speed,
            });
          }
        );
      } catch {
        // The device refused the request (e.g. its location settings are unsatisfied): let the
        // user retry instead of leaving the button on "Requesting...".
        watching.current = false;
        return "denied";
      }
    }
    return "granted";
  };

  return { userLocation, start, stop };
}
