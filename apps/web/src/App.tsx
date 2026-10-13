import { useState, useRef, useEffect, startTransition } from "react";
import { useCourseUpCamera } from "./hooks/useCourseUpCamera";
import { useMapSetup, updateDestinationMarker } from "./hooks/useMapSetup";
import type { Destination } from "./types/map";
import { useRouting } from "./hooks/useRouting";
import { useNavigation } from "./hooks/useNavigation";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import ggvLogo from "./assets/img/ggv.png";
import { GpsPermissionOverlay } from "./components/GpsPermissionOverlay";
import { WelcomeOverlay } from "./components/WelcomeOverlay";
import { NavigationOverlay } from "./components/NavigationOverlay";
import { ArrivedOverlay } from "./components/ArrivedOverlay";
import { ExitCompleteOverlay } from "./components/ExitCompleteOverlay";
import { UpdateToast } from "./components/UpdateToast";
import arrivalBellSrc from "./assets/audio/arrival-bell.mp3";

type NavState = "gps-permission" | "welcome" | "navigating" | "exit-complete";

// Village exit coordinates (from AGENTS.md)
const VILLAGE_EXIT: [number, number] = [120.951863, 14.35098];

export default function App() {
  // Map container ref for MapLibre
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Navigation state machine
  const [navState, setNavState] = useState<NavState>("gps-permission");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [showArrivedModal, setShowArrivedModal] = useState(false);

  // Blocks list from Convex (reactive; undefined while loading, auto-retries on reconnect)
  const blocks = useQuery(anyApi.locations.blocks) as string[] | undefined;

  // Initialize map and GPS tracking
  const { map, userLocation, isMapReady, triggerGeolocate, userMarkerRef } =
    useMapSetup(mapContainerRef);

  // Calculate route when destination is selected
  const { steps, routeSource, routeGeoJSON, isRecalculating } = useRouting(
    map,
    userLocation,
    destination
  );

  // Navigation logic (distance, arrival detection)
  const { distanceRemaining, hasArrived } = useNavigation(userLocation, destination);

  // Track if we're currently navigating
  const isNavigating = navState === "navigating";

  // Course-up 3D camera: single driver, bearing from GPS course (no sensor).
  useCourseUpCamera(map, isMapReady, isNavigating, userLocation);

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

    // Arrival feedback: haptic (Android only, iOS silently ignores) + bell sound
    navigator.vibrate?.([100, 50, 100]);
    new Audio(arrivalBellSrc).play().catch(() => {});

    startTransition(() => {
      if (destination?.type === "exit") {
        setNavState("exit-complete");
      } else {
        setShowArrivedModal(true);
      }
    });
  }, [hasArrived, navState, destinationKey, destination]);

  // Effect: Show/hide the custom user marker based on navState.
  useEffect(() => {
    const marker = userMarkerRef.current;
    if (!marker) return;
    marker.getElement().style.display = navState === "navigating" ? "block" : "none";
  }, [navState, userMarkerRef]);

  // Effect: Update destination marker on map when destination changes
  useEffect(() => {
    if (map && isMapReady) {
      updateDestinationMarker(map, destination);
    }
  }, [map, isMapReady, destination]);

  return (
    <div className="app-container">
      {/* Map container - always rendered */}
      <div ref={mapContainerRef} className="map-container" />

      {/* GGV Logo - top center */}
      <img src={ggvLogo} alt="GGV" role="img" className="ggv-logo" />

      {/* Conditional overlays based on navState */}
      {navState === "gps-permission" ? (
        <GpsPermissionOverlay
          onGrant={() => setNavState("welcome")}
          triggerGeolocate={triggerGeolocate}
          isMapReady={isMapReady}
        />
      ) : null}

      {navState === "welcome" ? (
        <WelcomeOverlay
          blocks={blocks ?? []}
          isLoadingBlocks={blocks === undefined}
          onSelectDestination={(dest) => {
            setDestination(dest);
            setNavState("navigating");
          }}
        />
      ) : null}

      {navState === "navigating" && !showArrivedModal ? (
        <NavigationOverlay
          distanceRemaining={distanceRemaining}
          destination={destination}
          steps={steps}
          routeSource={routeSource}
          routeGeoJSON={routeGeoJSON}
          userLocation={userLocation}
          isRecalculating={isRecalculating}
          onCancel={() => {
            setNavState("welcome");
            setDestination(null);
          }}
        />
      ) : null}

      {navState === "exit-complete" ? <ExitCompleteOverlay /> : null}

      {/* Arrived modals — floating, map stays interactive */}
      {showArrivedModal ? (
        <ArrivedOverlay
          destination={destination}
          onNavigateAgain={() => {
            setShowArrivedModal(false);
            setNavState("welcome");
            setDestination(null);
          }}
          onExitVillage={() => {
            setShowArrivedModal(false);
            setDestination({
              type: "exit",
              coordinates: VILLAGE_EXIT,
              name: "Village Exit",
            });
          }}
        />
      ) : null}

      {/* SW update notification toast */}
      <UpdateToast />
    </div>
  );
}
