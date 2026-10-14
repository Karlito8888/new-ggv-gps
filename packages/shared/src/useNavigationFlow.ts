import { useState, useRef, useEffect, useEffectEvent, startTransition } from "react";
import { useNavigation } from "./useNavigation";
import { COPY } from "./copy";
import { VILLAGE_EXIT } from "./village";
import type { Destination, UserLocation } from "./types";

export type NavState = "gps-permission" | "welcome" | "navigating" | "exit-complete";

/**
 * The navigation state machine, shared by both apps. One `useState`, no router:
 *
 *   gps-permission → welcome → navigating → exit-complete
 *
 * Arrival is not a state: `showArrivedModal` floats over "navigating" so the map stays live.
 * `onArrive` is the platform's arrival feedback (haptics + bell); it fires once per destination.
 */
export function useNavigationFlow(userLocation: UserLocation | null, onArrive: () => void) {
  const [navState, setNavState] = useState<NavState>("gps-permission");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [showArrivedModal, setShowArrivedModal] = useState(false);

  // Navigation logic (distance, arrival detection)
  const { distanceRemaining, hasArrived } = useNavigation(userLocation, destination);

  const arrive = useEffectEvent(onArrive);

  // Generate destination key for tracking
  const destinationKey = destination?.coordinates
    ? `${destination.coordinates[0]},${destination.coordinates[1]}`
    : null;

  // Track which destination we've already shown the arrival modal for
  const arrivedDestinationRef = useRef<string | null>(null);

  // Reset arrival tracking when the destination changes. The dependency array IS the comparison —
  // a ref mirroring `destinationKey` plus an `if` would only re-check what React already checked.
  useEffect(() => {
    arrivedDestinationRef.current = null;
  }, [destinationKey]);

  // Handle arrival - only trigger once per destination
  // Uses startTransition to avoid cascading renders (React Compiler compliant)
  useEffect(() => {
    // Must be navigating, and actually arrived at the destination currently selected
    if (!hasArrived || navState !== "navigating" || !destinationKey) {
      return;
    }

    // Already shown arrival for this destination? Skip.
    if (arrivedDestinationRef.current === destinationKey) {
      return;
    }

    // Mark this destination as arrived and show appropriate modal
    arrivedDestinationRef.current = destinationKey;

    arrive();

    startTransition(() => {
      if (destination?.type === "exit") {
        // Terminal state: no destination left, so routing stops and the line is erased.
        setNavState("exit-complete");
        setDestination(null);
      } else {
        setShowArrivedModal(true);
      }
    });
  }, [hasArrived, navState, destinationKey, destination]);

  return {
    navState,
    destination,
    showArrivedModal,
    distanceRemaining,
    grantGps: () => setNavState("welcome"),
    selectDestination: (dest: Destination) => {
      setDestination(dest);
      setNavState("navigating");
    },
    cancelNavigation: () => {
      setNavState("welcome");
      setDestination(null);
    },
    navigateAgain: () => {
      setShowArrivedModal(false);
      setNavState("welcome");
      setDestination(null);
    },
    exitVillage: () => {
      setShowArrivedModal(false);
      setDestination({ type: "exit", coordinates: VILLAGE_EXIT, name: COPY.exit.name.en });
    },
  };
}
