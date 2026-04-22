import { useState, useRef, useEffect, startTransition } from "react";
import { useDeviceOrientation } from "./hooks/useDeviceOrientation";
import { LazyMotion, domAnimation, AnimatePresence, MotionConfig } from "framer-motion";
import { useMapSetup, updateDestinationMarker } from "./hooks/useMapSetup";
import type { Destination } from "./hooks/useMapSetup";
import { useRouting } from "./hooks/useRouting";
import { useNavigation } from "./hooks/useNavigation";
import { supabase } from "./lib/supabase";
import ggvLogo from "./assets/img/ggv.png";
import { GpsPermissionOverlay } from "./components/GpsPermissionOverlay";
import { WelcomeOverlay } from "./components/WelcomeOverlay";
import { OrientationOverlay } from "./components/OrientationOverlay";
import { NavigationOverlay } from "./components/NavigationOverlay";
import { ArrivedOverlay } from "./components/ArrivedOverlay";
import { ExitCompleteOverlay } from "./components/ExitCompleteOverlay";
import { UpdateToast } from "./components/UpdateToast";
import arrivalBellSrc from "./assets/audio/arrival-bell.mp3";

type NavState =
  | "gps-permission"
  | "welcome"
  | "orientation-permission"
  | "navigating"
  | "exit-complete";

interface BlockData {
  name: string;
}

// Village exit coordinates (from CLAUDE.md)
const VILLAGE_EXIT: [number, number] = [120.951863, 14.35098];

export default function App() {
  // Map container ref for MapLibre
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Navigation state machine (6 states)
  const [navState, setNavState] = useState<NavState>("gps-permission");
  const [destination, setDestination] = useState<Destination | null>(null);
  const [hasOrientationPermission, setHasOrientationPermission] = useState(false);
  const [showArrivedModal, setShowArrivedModal] = useState(false);

  // Blocks data (pre-loaded during GPS permission screen)
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(true);
  const [blocksError, setBlocksError] = useState<string | null>(null);

  // Shared fetch logic (async only — setState in .then callback is safe)
  const fetchBlocks = () => {
    supabase.rpc("get_blocks").then(({ data, error }) => {
      if (error) {
        console.error("Error fetching blocks:", error);
        setBlocksError("Failed to load blocks");
        setBlocks([]);
      } else if (data) {
        setBlocks(data);
      }
      setIsLoadingBlocks(false);
    });
  };

  // Retry button handler (event handler — sync setState is OK)
  const retryLoadBlocks = () => {
    setBlocksError(null);
    setIsLoadingBlocks(true);
    fetchBlocks();
  };

  // Pre-load blocks on mount (async fetch only, no sync setState)
  useEffect(() => {
    fetchBlocks();
  }, []);

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
  const { distanceRemaining, hasArrived, arrivedAt } = useNavigation(userLocation, destination);

  // Track if we're currently navigating
  const isNavigating = navState === "navigating";

  // Device orientation (compass heading + map interaction tracking)
  const {
    heading,
    isOffCenter,
    userInteractionTimeRef,
    handleRecenter: recenterMap,
  } = useDeviceOrientation(map, isMapReady, isNavigating);

  // Generate destination key for tracking
  const destinationKey = destination?.coordinates
    ? `${destination.coordinates[0]},${destination.coordinates[1]}`
    : null;

  // Track which destination we've already shown the arrival modal for
  const arrivedDestinationRef = useRef<string | null>(null);
  const lastDestinationKeyRef = useRef<string | null>(null);

  // Reset arrival tracking when destination changes
  useEffect(() => {
    if (destinationKey !== lastDestinationKeyRef.current) {
      lastDestinationKeyRef.current = destinationKey;
      // Clear arrived ref so new destination can trigger arrival
      arrivedDestinationRef.current = null;
    }
  }, [destinationKey]);

  // Handle arrival - only trigger once per destination
  // Uses startTransition to avoid cascading renders (React Compiler compliant)
  useEffect(() => {
    // Must be navigating with valid arrival data
    if (!hasArrived || navState !== "navigating" || !arrivedAt) {
      return;
    }

    // Must match current destination (not stale data)
    if (arrivedAt !== destinationKey) {
      return;
    }

    // Already shown arrival for this destination? Skip.
    if (arrivedDestinationRef.current === arrivedAt) {
      return;
    }

    // Mark this destination as arrived and show appropriate modal
    arrivedDestinationRef.current = arrivedAt;

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
  }, [hasArrived, navState, arrivedAt, destinationKey, destination]);

  const hasInitialNavViewRef = useRef(false);
  const initialNavViewTimeRef = useRef<number>(0);
  useEffect(() => {
    if (navState !== "navigating") {
      hasInitialNavViewRef.current = false;
    }
  }, [navState]);

  // Effect: Show/hide custom user marker + toggle native dot based on navState
  useEffect(() => {
    const marker = userMarkerRef.current;
    if (!marker) return;
    const el = marker.getElement();
    const isNav = navState === "navigating";
    el.style.display = isNav ? "block" : "none";
    // Toggle CSS class on app container to hide native GeolocateControl dot
    const container = mapContainerRef.current?.parentElement;
    if (container) {
      container.classList.toggle("navigating", isNav);
    }
  }, [navState, userMarkerRef]);

  // Effect: Rotate custom user marker with heading
  useEffect(() => {
    const marker = userMarkerRef.current;
    if (!marker || navState !== "navigating") return;
    const el = marker.getElement();
    if (heading !== null) {
      marker.setRotation(heading);
      el.classList.remove("no-heading");
    } else {
      marker.setRotation(0);
      el.classList.add("no-heading");
    }
  }, [heading, navState, userMarkerRef]);

  // Effect: Update destination marker on map when destination changes
  useEffect(() => {
    if (map && isMapReady) {
      updateDestinationMarker(map, destination);
    }
  }, [map, isMapReady, destination]);

  // Effect: Keep user ALWAYS centered during navigation
  useEffect(() => {
    if (!map || !isMapReady || !isNavigating || !userLocation) return;

    // Skip centering if user recently interacted (within 5 seconds)
    if (userInteractionTimeRef.current) {
      const timeSinceInteraction = Date.now() - userInteractionTimeRef.current;
      if (timeSinceInteraction < 5000) return;
    }

    // Skip centering during initial easeTo animation (500ms + 100ms buffer)
    if (Date.now() - initialNavViewTimeRef.current < 600) return;

    // Center map on user position
    map.setCenter([userLocation.longitude, userLocation.latitude]);
  }, [map, isMapReady, isNavigating, userLocation, userInteractionTimeRef]);

  // Effect: Set initial navigation view when entering navigation mode (one-shot)
  useEffect(() => {
    if (!map || !isMapReady || !isNavigating || !userLocation) return;
    if (hasInitialNavViewRef.current) return;
    hasInitialNavViewRef.current = true;
    initialNavViewTimeRef.current = Date.now();

    map.easeTo({
      center: [userLocation.longitude, userLocation.latitude],
      ...(heading !== null && { bearing: heading }),
      pitch: 45,
      zoom: 20,
      duration: 500,
    });
  }, [isNavigating, map, isMapReady, userLocation, heading]);

  // Re-center button handler (delegates to hook)
  const handleRecenter = () => {
    if (!map || !userLocation) return;
    recenterMap(map, userLocation);
  };

  return (
    <div className="app-container">
      {/* Map container - always rendered */}
      <div ref={mapContainerRef} className="map-container" />

      {/* GGV Logo - top center */}
      <img src={ggvLogo} alt="GGV" className="ggv-logo" />

      {/* Conditional overlays based on navState */}
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion="user">
          <AnimatePresence mode="wait">
            {navState === "gps-permission" && (
              <GpsPermissionOverlay
                key="gps-permission"
                onGrant={() => setNavState("welcome")}
                triggerGeolocate={triggerGeolocate}
                isMapReady={isMapReady}
              />
            )}

            {navState === "welcome" && (
              <WelcomeOverlay
                key="welcome"
                blocks={blocks}
                isLoadingBlocks={isLoadingBlocks}
                blocksError={blocksError}
                onRetryBlocks={retryLoadBlocks}
                onSelectDestination={(dest) => {
                  setDestination(dest);
                  setNavState(hasOrientationPermission ? "navigating" : "orientation-permission");
                }}
              />
            )}

            {navState === "orientation-permission" && (
              <OrientationOverlay
                key="orientation-permission"
                onGrant={() => {
                  setHasOrientationPermission(true);
                  setNavState("navigating");
                }}
              />
            )}

            {navState === "navigating" && !showArrivedModal && (
              <NavigationOverlay
                key="navigating"
                map={map}
                distanceRemaining={distanceRemaining}
                destination={destination}
                steps={steps}
                routeSource={routeSource}
                routeGeoJSON={routeGeoJSON}
                userLocation={userLocation}
                isRecalculating={isRecalculating}
                isOffCenter={isOffCenter}
                onRecenter={handleRecenter}
                onCancel={() => {
                  setNavState("welcome");
                  setDestination(null);
                }}
              />
            )}

            {navState === "exit-complete" && <ExitCompleteOverlay key="exit-complete" />}
          </AnimatePresence>

          {/* Arrived modals — floating, map stays interactive */}
          <AnimatePresence>
            {showArrivedModal && (
              <ArrivedOverlay
                key="arrived"
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
            )}
          </AnimatePresence>
        </MotionConfig>
      </LazyMotion>

      {/* SW update notification toast */}
      <UpdateToast />
    </div>
  );
}
